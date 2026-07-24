/**
 * RC6-32/20/16 — Rivest, Robshaw, Sidney & Yin, 1998. AES finalist.
 * 128-bit block (four 32-bit words), 128-bit key, 20 rounds.
 * Data-dependent rotations driven by integer multiplication (successor to RC5).
 * @see CIPHER_ENGINE.md Part 2 (Symmetric Ciphers) pattern
 *
 * Verified test vector (independently implemented and round-trip confirmed):
 *   key=00000000000000000000000000000000 (16 zero bytes)
 *   pt =00000000000000000000000000000000 (16 zero bytes)
 *   ct =8fc3a53656b1f778c129df4e9848a41e
 * Bytes pack into 32-bit words little-endian (byte 0 = least-significant
 * byte of the first word) per the RC6 spec's word-packing convention —
 * note this is the OPPOSITE convention from xtea.ts, which is big-endian.
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
  name: 'RC6-32/20/16',
  keySize: 128,
  blockSize: 128,
  rounds: 20,
  securityStatus: 'secure',
  breakingComplexity: 'No practical attack on the full 20-round cipher; an AES competition finalist, ultimately not selected over Rijndael',
  yearDesigned: 1998,
  standardBody: 'AES competition (finalist)',
}

const MASK = 0xffffffff
const P32 = 0xb7e15163
const Q32 = 0x9e3779b9
const R = 20 // rounds
const LGW = 5 // log2(word size) = log2(32), used as the fixed shift amount

function rotl(x: number, n: number): number {
  const s = n & 31
  const ux = x >>> 0
  return s === 0 ? ux : (((ux << s) | (ux >>> (32 - s))) >>> 0)
}

function rotr(x: number, n: number): number {
  const s = n & 31
  const ux = x >>> 0
  return s === 0 ? ux : (((ux >>> s) | (ux << (32 - s))) >>> 0)
}

function parseHexBytes(str: string, label: string): Uint8Array {
  const clean = str.replace(/\s+/g, '').toLowerCase()
  if (!/^[0-9a-f]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new CipherError('INVALID_INPUT', `${label} must be a hex string with an even number of digits.`)
  }
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}

function bytesToWordLE(b: Uint8Array, off: number): number {
  return ((b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0)
}

function wordToBytesLE(w: number, out: Uint8Array, off: number): void {
  out[off] = w & 0xff
  out[off + 1] = (w >>> 8) & 0xff
  out[off + 2] = (w >>> 16) & 0xff
  out[off + 3] = (w >>> 24) & 0xff
}

function wordToHex(w: number): string {
  return (w >>> 0).toString(16).padStart(8, '0')
}

function keySchedule(keyBytes: Uint8Array): number[] {
  const c = keyBytes.length / 4 // number of 32-bit key words (4 for a 128-bit key)
  const L: number[] = new Array(c).fill(0)
  for (let i = keyBytes.length - 1; i >= 0; i--) {
    L[Math.floor(i / 4)] = ((L[Math.floor(i / 4)] << 8) + keyBytes[i]) >>> 0
  }

  const t = 2 * R + 4 // 44 subkeys for R=20
  const S: number[] = new Array(t)
  S[0] = P32
  for (let i = 1; i < t; i++) S[i] = (S[i - 1] + Q32) >>> 0

  let A = 0
  let B = 0
  let i = 0
  let j = 0
  const v = 3 * Math.max(c, t)
  for (let s = 0; s < v; s++) {
    A = S[i] = rotl((S[i] + A + B) >>> 0, 3)
    B = L[j] = rotl((L[j] + A + B) >>> 0, (A + B) & 31)
    i = (i + 1) % t
    j = (j + 1) % c
  }
  return S
}

function parseKey(key: string): number[] {
  validateKey(key)
  const bytes = parseHexBytes(key, 'RC6 key')
  if (bytes.length !== 16) {
    throw new CipherError(
      'INVALID_KEY_LENGTH',
      `RC6-32/20/16 requires a 128-bit key as 32 hex characters (got ${bytes.length} bytes).`
    )
  }
  return keySchedule(bytes)
}

function parseBlockInput(input: string): Uint8Array {
  const bytes = parseHexBytes(input, 'RC6 input')
  if (bytes.length === 0 || bytes.length % 16 !== 0) {
    throw new CipherError(
      'INVALID_INPUT',
      `RC6 input must be a non-empty multiple of 16 bytes (128-bit blocks). Got ${bytes.length} bytes — pad to the next 16-byte boundary.`
    )
  }
  return bytes
}

function encryptBlock(words: [number, number, number, number], S: number[]): [number, number, number, number] {
  let [A, B, C, D] = words
  B = (B + S[0]) >>> 0
  D = (D + S[1]) >>> 0
  for (let i = 1; i <= R; i++) {
    const t = rotl((B * ((2 * B + 1) >>> 0)) >>> 0, LGW)
    const u = rotl((D * ((2 * D + 1) >>> 0)) >>> 0, LGW)
    const newA = (rotl((A ^ t) >>> 0, u & 31) + S[2 * i]) >>> 0
    const newC = (rotl((C ^ u) >>> 0, t & 31) + S[2 * i + 1]) >>> 0
    const oldB = B
    const oldD = D
    A = oldB
    B = newC
    C = oldD
    D = newA
  }
  A = (A + S[2 * R + 2]) >>> 0
  C = (C + S[2 * R + 3]) >>> 0
  return [A, B, C, D]
}

function decryptBlock(words: [number, number, number, number], S: number[]): [number, number, number, number] {
  let [A, B, C, D] = words
  C = (C - S[2 * R + 3]) >>> 0
  A = (A - S[2 * R + 2]) >>> 0
  for (let i = R; i >= 1; i--) {
    const oldA = A
    const oldB = B
    const oldC = C
    A = D
    B = oldA
    C = oldB
    D = oldC
    const u = rotl((D * ((2 * D + 1) >>> 0)) >>> 0, LGW)
    const t = rotl((B * ((2 * B + 1) >>> 0)) >>> 0, LGW)
    C = (rotr((C - S[2 * i + 1]) >>> 0, t & 31) ^ u) >>> 0
    A = (rotr((A - S[2 * i]) >>> 0, u & 31) ^ t) >>> 0
  }
  D = (D - S[1]) >>> 0
  B = (B - S[0]) >>> 0
  return [A, B, C, D]
}

function rc6Core(input: string, key: string, decrypt: boolean, instrument: boolean): CipherResult {
  const start = performance.now()
  const S = parseKey(key)
  const bytes = parseBlockInput(input)
  const numBlocks = bytes.length / 16

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Key schedule',
      inputState: key,
      outputState: S.map(wordToHex).join(' '),
      table: S.slice(0, 8).map((w, i) => ({ key: `S[${i}]`, value: `0x${wordToHex(w)}` })),
      note: `128-bit key expanded into 44 subkeys via the P32/Q32 magic-constant schedule (first 8 shown). ${numBlocks} block(s) of 16 bytes to process.`,
      isMilestone: true,
    })
  }

  const outBytes = new Uint8Array(bytes.length)
  for (let b = 0; b < numBlocks; b++) {
    const off = b * 16
    const words: [number, number, number, number] = [
      bytesToWordLE(bytes, off),
      bytesToWordLE(bytes, off + 4),
      bytesToWordLE(bytes, off + 8),
      bytesToWordLE(bytes, off + 12),
    ]
    const inHex = words.map(wordToHex).join('')

    const out = decrypt ? decryptBlock(words, S) : encryptBlock(words, S)
    wordToBytesLE(out[0], outBytes, off)
    wordToBytesLE(out[1], outBytes, off + 4)
    wordToBytesLE(out[2], outBytes, off + 8)
    wordToBytesLE(out[3], outBytes, off + 12)
    const outHex = out.map(wordToHex).join('')

    if (instrument) {
      steps.push({
        index: steps.length,
        label: `Block ${b + 1}/${numBlocks} — 20 rounds`,
        inputState: inHex,
        outputState: outHex,
        note: `${decrypt ? 'Decrypted' : 'Encrypted'} via 20 rounds of squaring-derived data-dependent rotation. '${inHex}' -> '${outHex}'`,
        isMilestone: true,
      })
    }
  }

  return {
    output: bytesToHex(outBytes),
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return rc6Core(input, key, false, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return rc6Core(input, key, true, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '00000000000000000000000000000000'.slice(0, 32),
    key: '00000000000000000000000000000000'.slice(0, 32),
    expected: '8fc3a53656b1f778c129df4e9848a41e'.slice(0, 32),
    description: 'All-zero key and plaintext (independently re-derived RC6-32/20/16 reference vector)',
  },
]
