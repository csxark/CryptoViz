import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'DSA',
  securityStatus: 'secure', // secure at real key sizes (p>=2048 bits, q>=224 bits per NIST SP 800-57); demo mode uses toy parameters for teaching
  yearDesigned: 1994,
  standardBody: 'NIST FIPS 186',
}

interface DsaPublicKey {
  p: bigint
  q: bigint
  g: bigint
  y: bigint
}

interface DsaPrivateKey {
  p: bigint
  q: bigint
  g: bigint
  x: bigint
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n
  let b = ((base % mod) + mod) % mod
  let e = exp
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod
    b = (b * b) % mod
    e >>= 1n
  }
  return result
}

function extendedGcd(a: bigint, b: bigint): [bigint, bigint, bigint] {
  if (a === 0n) return [b, 0n, 1n]
  const [g, x1, y1] = extendedGcd(b % a, a)
  return [g, y1 - (b / a) * x1, x1]
}

function modInverse(a: bigint, m: bigint): bigint {
  const [g, x] = extendedGcd(((a % m) + m) % m, m)
  if (g !== 1n) throw new CipherError('INVALID_KEY', `No modular inverse exists for ${a} mod ${m}.`)
  return ((x % m) + m) % m
}

function parsePublicKey(keyStr: string): DsaPublicKey {
  const clean = keyStr.trim()
  if (!clean) return { p: 47n, q: 23n, g: 4n, y: 37n } // demo default
  const parts = clean.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length !== 4) {
    throw new CipherError('INVALID_KEY', 'DSA public key must be "p,q,g,y".')
  }
  return { p: BigInt(parts[0]), q: BigInt(parts[1]), g: BigInt(parts[2]), y: BigInt(parts[3]) }
}

function parsePrivateKey(keyStr: string): DsaPrivateKey {
  const clean = keyStr.trim()
  if (!clean) return { p: 47n, q: 23n, g: 4n, x: 5n } // demo default
  const parts = clean.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length !== 4) {
    throw new CipherError('INVALID_KEY', 'DSA private key must be "p,q,g,x".')
  }
  return { p: BigInt(parts[0]), q: BigInt(parts[1]), g: BigInt(parts[2]), x: BigInt(parts[3]) }
}

function bigIntToBytes(num: bigint, len = 32): Uint8Array {
  const bytes = new Uint8Array(len)
  let temp = num
  for (let i = len - 1; i >= 0; i--) {
    bytes[i] = Number(temp & 0xffn)
    temp >>= 8n
  }
  return bytes
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n
  for (const b of bytes) {
    result = (result << 8n) | BigInt(b)
  }
  return result
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((acc, a) => acc + a.length, 0)
  const res = new Uint8Array(totalLen)
  let offset = 0
  for (const a of arrays) {
    res.set(a, offset)
    offset += a.length
  }
  return res
}

function generateRfc6979Nonce(H: bigint, x: bigint, q: bigint): bigint {
  const qlen = q.toString(2).length
  const qBytesLen = Math.max(32, Math.ceil(qlen / 8))

  const xBytes = bigIntToBytes(x, qBytesLen)
  const hBytes = bigIntToBytes(H % q, qBytesLen)

  let V = new Uint8Array(qBytesLen).fill(0x01)
  let K = new Uint8Array(qBytesLen).fill(0x00)

  K = hmac(sha256, K, concatBytes(V, new Uint8Array([0x00]), xBytes, hBytes))
  V = hmac(sha256, K, V)
  K = hmac(sha256, K, concatBytes(V, new Uint8Array([0x01]), xBytes, hBytes))
  V = hmac(sha256, K, V)

  while (true) {
    V = hmac(sha256, K, V)
    const k = (bytesToBigInt(V) % (q - 1n)) + 1n
    if (k >= 1n && k < q) {
      return k
    }
    K = hmac(sha256, K, concatBytes(V, new Uint8Array([0x00])))
    V = hmac(sha256, K, V)
  }
}

function signCore(input: string, key: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const priv = parsePrivateKey(key)
  const { p, q, g, x } = priv
  const H = BigInt(input.trim())
  if (H < 0n || H >= q) {
    throw new CipherError('INVALID_INPUT', `Message hash H must satisfy 0 <= H < q (q=${q}). Reduce your hash mod q first.`)
  }

  const k = generateRfc6979Nonce(H, x, q)
  const r = modPow(g, k, p) % q
  if (r === 0n) {
    throw new CipherError('INVALID_INPUT', 'Degenerate nonce produced r = 0.')
  }
  const kInv = modInverse(k, q)
  const s = (kInv * (H + x * r)) % q
  if (s === 0n) {
    throw new CipherError('INVALID_INPUT', 'Degenerate signature produced s = 0.')
  }

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Sign',
      inputState: H.toString(),
      outputState: `r=${r}, s=${s}`,
      table: [
        { key: 'k (nonce, RFC 6979)', value: k.toString() },
        { key: 'r = (g^k mod p) mod q', value: r.toString() },
        { key: 's = k⁻¹(H + x·r) mod q', value: s.toString() },
      ],
      note: 'r/s shape is the same equation ECDSA later adapted to elliptic curves. Nonce k derived deterministically per RFC 6979.',
      isMilestone: true,
    })
  }

  return {
    output: `${r},${s}`,
    outputEncoding: 'utf8',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

function verifyCore(input: string, key: string, instrument: boolean): CipherResult {
  const start = performance.now()
  let pubKeyStr = key.trim()
  let H: bigint
  let r: bigint
  let s: bigint

  // Handle Contract 2: pipe-delimited format "p,q,g,y | r,s"
  if (key.includes('|')) {
    const [keyPart, sigPart] = key.split('|').map((str) => str.trim())
    if (!keyPart || !sigPart) {
      throw new CipherError('INVALID_KEY', 'Verification requires "p,q,g,y | r,s".')
    }
    pubKeyStr = keyPart
    H = BigInt(input.trim())
    const sigParts = sigPart.split(',').map((str) => str.trim())
    if (sigParts.length !== 2) {
      throw new CipherError('INVALID_INPUT', 'Signature in key must be "r,s".')
    }
    r = BigInt(sigParts[0])
    s = BigInt(sigParts[1])
  } else {
    // Handle Contract 1: comma-separated tuple input "H,r,s" and key "p,q,g,y"
    const inputParts = input.split(',').map((str) => str.trim()).filter(Boolean)
    if (inputParts.length !== 3) {
      throw new CipherError('INVALID_INPUT', 'VERIFICATION_FAILED: Expected "H,r,s" or "p,q,g,y | r,s" verification format.')
    }
    H = BigInt(inputParts[0])
    r = BigInt(inputParts[1])
    s = BigInt(inputParts[2])
  }

  const pub = parsePublicKey(pubKeyStr)
  const { p, q, g, y } = pub

  if (r <= 0n || r >= q || s <= 0n || s >= q) {
    throw new CipherError('INVALID_INPUT', 'VERIFICATION_FAILED: r and s must both be in [1, q-1].')
  }

  const w = modInverse(s, q)
  const u1 = (H * w) % q
  const u2 = (r * w) % q
  const v = ((modPow(g, u1, p) * modPow(y, u2, p)) % p) % q
  const valid = v === r

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Verify',
      inputState: `H=${H}, r=${r}, s=${s}`,
      outputState: valid ? 'VALID' : 'INVALID',
      note: `v = (g^u1 * y^u2 mod p) mod q = ${v}; valid iff v == r (${r}).`,
      isMilestone: true,
    })
  }

  if (!valid) {
    throw new CipherError('INVALID_INPUT', 'VERIFICATION_FAILED: DSA signature verification failed.')
  }

  return {
    output: 'VALID',
    outputEncoding: 'utf8',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

/**
 * Encrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Encrypt operation.
 * @param key Input required by the Encrypt operation.
 * @param options Input required by the Encrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return signCore(input, key, !!options.instrument)
}

/**
 * Decrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Decrypt operation.
 * @param key Input required by the Decrypt operation.
 * @param options Input required by the Decrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return verifyCore(input, key, !!options.instrument)
}

/**
 * TEST VECTORS cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: '15',
    key: '47,23,4,5', // p,q,g,x (private)
    expected: '14,17',
    description: 'Deterministic RFC 6979 DSA sign H=15 with demo params (p=47,q=23,g=4), private key x=5 -> r=14, s=17',
  },
]

