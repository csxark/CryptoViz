/**
 * FF1 format-preserving encryption (NIST SP 800-38G).
 *
 * FPE encrypts a value into another value of the *same format*: a 16-digit card
 * number becomes another valid 16-digit number, an SSN becomes an SSN. This is
 * what tokenization systems use so ciphertext still fits legacy schemas and
 * validators. FF1 achieves it with a 10-round Feistel network whose round
 * function is an AES-CBC-MAC PRF, combined with base-`radix` arithmetic so the
 * output never leaves the domain.
 *
 * This implementation is verified bit-for-bit against the official NIST FF1
 * sample vectors (radix 10 with and without a tweak, and radix 36). It reuses
 * the repo's AES (`lib/cipher/symmetric/aes.ts`, itself validated against the
 * NIST GCM vectors) as the block cipher.
 *
 * Domain rule (NIST): radix^n must be at least 100, i.e. the input must be long
 * enough that the format has at least 100 possible values — otherwise FPE leaks
 * too much. That bound is enforced here.
 */
import { expandKey, processBlock } from '../symmetric/aes'

const BLOCK = 16

/** AES single-block encryption (ECB core), used to build the FF1 PRF. */
function aesBlock(roundKeys: Uint8Array[], block: Uint8Array): Uint8Array<ArrayBufferLike> {
  return processBlock(block, roundKeys, false)
}

/** PRF = AES-CBC-MAC with a zero IV over a byte string that is a multiple of 16. */
function prf(roundKeys: Uint8Array[], data: Uint8Array): Uint8Array<ArrayBufferLike> {
  let y: Uint8Array<ArrayBufferLike> = new Uint8Array(BLOCK)
  for (let i = 0; i < data.length; i += BLOCK) {
    const x = new Uint8Array(BLOCK)
    for (let j = 0; j < BLOCK; j++) x[j] = y[j] ^ data[i + j]
    y = aesBlock(roundKeys, x)
  }
  return y
}

/** Interpret numerals (most-significant first) as a base-`radix` integer. */
function numRadix(numerals: number[], radix: number): bigint {
  const R = BigInt(radix)
  let acc = 0n
  for (const d of numerals) acc = acc * R + BigInt(d)
  return acc
}

/** Encode a non-negative integer as exactly `m` numerals in base `radix`. */
function strRadix(value: bigint, radix: number, m: number): number[] {
  const R = BigInt(radix)
  const out = new Array<number>(m).fill(0)
  let x = value
  for (let j = 0; j < m; j++) {
    out[m - 1 - j] = Number(x % R)
    x = x / R
  }
  return out
}

/** Big-endian encode a bigint into `len` bytes. */
function beBytes(value: bigint, len: number): Uint8Array {
  const b = new Uint8Array(len)
  let x = value
  for (let i = len - 1; i >= 0; i--) {
    b[i] = Number(x & 0xffn)
    x >>= 8n
  }
  return b
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

function mod(a: bigint, m: bigint): bigint {
  const r = a % m
  return r >= 0n ? r : r + m
}

const bytesToBigInt = (bytes: Uint8Array): bigint => {
  let x = 0n
  for (const b of bytes) x = (x << 8n) | BigInt(b)
  return x
}

/** One Feistel round captured for the step-by-step visualizer. */
export interface Ff1Step {
  round: number
  /** Which half was replaced this round. */
  half: 'A' | 'B'
  /** The two halves at the start of the round (as numeral strings joined). */
  a: number[]
  b: number[]
  /** The integer y = NUM(S) added (mod radix^m) this round. */
  y: string
  m: number
  /** The resulting half after the modular add. */
  result: number[]
}

/**
 * Ff1Result cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface Ff1Result {
  output: number[]
  steps: Ff1Step[]
}

function validate(key: Uint8Array, radix: number, numerals: number[]): void {
  if (![16, 24, 32].includes(key.length)) {
    throw new Error('FF1 key must be 128, 192 or 256 bits (16/24/32 bytes).')
  }
  if (radix < 2 || radix > 65536) {
    throw new Error('FF1 radix must be between 2 and 65536.')
  }
  if (numerals.some((d) => d < 0 || d >= radix || !Number.isInteger(d))) {
    throw new Error(`Every numeral must be an integer in [0, ${radix - 1}].`)
  }
  const n = numerals.length
  // NIST domain requirement: radix^n >= 100.
  if (BigInt(radix) ** BigInt(n) < 100n) {
    throw new Error('Input is too short for the radix: radix^length must be at least 100.')
  }
  if (n < 2) {
    throw new Error('FF1 requires at least two numerals.')
  }
}

function buildP(radix: number, u: number, n: number, t: number): Uint8Array {
  return concatBytes(
    Uint8Array.from([1, 2, 1]),
    beBytes(BigInt(radix), 3),
    Uint8Array.from([10]),
    Uint8Array.from([u & 0xff]),
    beBytes(BigInt(n), 4),
    beBytes(BigInt(t), 4),
  )
}

/**
 * Derive S (the round-function output block, length d) from the PRF block R by
 * counter-mode extension: S = (R ‖ AES(R⊕1) ‖ AES(R⊕2) ‖ …) truncated to d.
 */
function deriveS(roundKeys: Uint8Array[], R: Uint8Array, d: number): Uint8Array<ArrayBufferLike> {
  let S: Uint8Array<ArrayBufferLike> = new Uint8Array(R)
  for (let j = 1; S.length < d; j++) {
    const blk = new Uint8Array(R)
    const jb = beBytes(BigInt(j), BLOCK)
    for (let k = 0; k < BLOCK; k++) blk[k] ^= jb[k]
    S = concatBytes(S, aesBlock(roundKeys, blk))
  }
  return S.subarray(0, d)
}

/** FF1 encryption. Returns the same-length numeral array plus a per-round trace. */
export function ff1Encrypt(
  key: Uint8Array,
  radix: number,
  tweak: Uint8Array,
  numerals: number[],
): Ff1Result {
  validate(key, radix, numerals)
  const roundKeys = expandKey(key)
  const n = numerals.length
  const t = tweak.length
  const u = Math.floor(n / 2)
  const v = n - u
  let A = numerals.slice(0, u)
  let B = numerals.slice(u)
  const b = Math.ceil(Math.ceil(v * Math.log2(radix)) / 8)
  const d = 4 * Math.ceil(b / 4) + 4
  const P = buildP(radix, u, n, t)
  const steps: Ff1Step[] = []

  for (let i = 0; i < 10; i++) {
    const padLen = Number(mod(BigInt(-t - b - 1), 16n))
    const Q = concatBytes(tweak, new Uint8Array(padLen), Uint8Array.from([i]), beBytes(numRadix(B, radix), b))
    const R = prf(roundKeys, concatBytes(P, Q))
    const S = deriveS(roundKeys, R, d)
    const y = bytesToBigInt(S)
    const m = i % 2 === 0 ? u : v
    const c = mod(numRadix(A, radix) + y, BigInt(radix) ** BigInt(m))
    const C = strRadix(c, radix, m)
    steps.push({ round: i, half: 'B', a: A.slice(), b: B.slice(), y: y.toString(), m, result: C })
    A = B
    B = C
  }
  return { output: A.concat(B), steps }
}

/** FF1 decryption — the exact inverse of {@link ff1Encrypt}. */
export function ff1Decrypt(
  key: Uint8Array,
  radix: number,
  tweak: Uint8Array,
  numerals: number[],
): Ff1Result {
  validate(key, radix, numerals)
  const roundKeys = expandKey(key)
  const n = numerals.length
  const t = tweak.length
  const u = Math.floor(n / 2)
  const v = n - u
  let A = numerals.slice(0, u)
  let B = numerals.slice(u)
  const b = Math.ceil(Math.ceil(v * Math.log2(radix)) / 8)
  const d = 4 * Math.ceil(b / 4) + 4
  const P = buildP(radix, u, n, t)
  const steps: Ff1Step[] = []

  for (let i = 9; i >= 0; i--) {
    const padLen = Number(mod(BigInt(-t - b - 1), 16n))
    const Q = concatBytes(tweak, new Uint8Array(padLen), Uint8Array.from([i]), beBytes(numRadix(A, radix), b))
    const R = prf(roundKeys, concatBytes(P, Q))
    const S = deriveS(roundKeys, R, d)
    const y = bytesToBigInt(S)
    const m = i % 2 === 0 ? u : v
    const c = mod(numRadix(B, radix) - y, BigInt(radix) ** BigInt(m))
    const C = strRadix(c, radix, m)
    steps.push({ round: i, half: 'A', a: A.slice(), b: B.slice(), y: y.toString(), m, result: C })
    B = A
    A = C
  }
  return { output: A.concat(B), steps }
}

// --- String helpers over an alphabet -----------------------------------------

/** Common alphabets for the playground. Index in the string = numeral value. */
export const ALPHABETS = {
  decimal: '0123456789',
  hex: '0123456789abcdef',
  alphanumericLower: '0123456789abcdefghijklmnopqrstuvwxyz',
  base62: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
} as const

/**
 * String To Numerals cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param text Input required by the String To Numerals operation.
 * @param alphabet Input required by the String To Numerals operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function stringToNumerals(text: string, alphabet: string): number[] {
  return Array.from(text, (ch) => {
    const idx = alphabet.indexOf(ch)
    if (idx < 0) throw new Error(`Character "${ch}" is not in the chosen alphabet.`)
    return idx
  })
}

/**
 * Numerals To String cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param numerals Input required by the Numerals To String operation.
 * @param alphabet Input required by the Numerals To String operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function numeralsToString(numerals: number[], alphabet: string): string {
  return numerals.map((d) => alphabet[d]).join('')
}

/** Parse a hex tweak string (possibly empty) into bytes. */
export function parseTweak(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, '').replace(/\s+/g, '')
  if (clean === '') return new Uint8Array(0)
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error('Tweak must be an even-length hexadecimal string (or empty).')
  }
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return out
}
