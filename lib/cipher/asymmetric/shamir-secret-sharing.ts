/**
 * Shamir's Secret Sharing — Adi Shamir, 1979.
 * @see CIPHER_ENGINE.md section "Shamir's Secret Sharing"
 *
 * A threshold scheme, not encryption/signing/hashing: splits a secret
 * into N shares such that any K reconstruct it, but K-1 reveal
 * NOTHING (not even probabilistically) about the secret. Uses GF(256)
 * polynomial arithmetic (the same field AES uses internally) — a
 * different mathematical toolkit from every other module in this
 * registry (modular integer arithmetic or elliptic curve points).
 *
 * Verified in a sandbox before this file was written:
 *   secret byte 200, split into 5 shares with threshold 3:
 *     shares = [(1,20),(2,167),(3,123),(4,11),(5,215)]
 *   combine(shares[0:3]) = 200 (correct)
 *   combine(shares[0:4]) = 200 (correct, more than threshold also works)
 *   combine(shares[0:2]) = 140 (WRONG — this is the intended security
 *     property: fewer than threshold shares do not recover the secret,
 *     they silently produce a different, useless value)
 */

import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: "Shamir's Secret Sharing",
  securityStatus: 'secure',
  yearDesigned: 1979,
  standardBody: 'Shamir 1979 paper ("How to Share a Secret")',
}

// GF(256) arithmetic using AES's reduction polynomial (x^8+x^4+x^3+x+1 = 0x11B)
function gfMul(a: number, b: number): number {
  let p = 0
  let x = a
  let y = b
  for (let i = 0; i < 8; i++) {
    if (y & 1) p ^= x
    const hiBitSet = x & 0x80
    x = (x << 1) & 0xff
    if (hiBitSet) x ^= 0x1b
    y >>= 1
  }
  return p
}
function gfPow(a: number, n: number): number {
  let r = 1
  for (let i = 0; i < n; i++) r = gfMul(r, a)
  return r
}
function gfInv(a: number): number {
  if (a === 0) throw new CipherError('INVALID_INPUT', 'Cannot invert zero in GF(256).')
  return gfPow(a, 254) // a^254 = a^-1 in GF(256), by Fermat's little theorem analogue
}
function gfDiv(a: number, b: number): number {
  return gfMul(a, gfInv(b))
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

function splitByte(secretByte: number, n: number, k: number): [number, number][] {
  const coeffs = [secretByte]
  for (let i = 1; i < k; i++) coeffs.push(Math.floor(Math.random() * 255) + 1)
  const shares: [number, number][] = []
  for (let x = 1; x <= n; x++) {
    let y = 0
    for (let power = 0; power < coeffs.length; power++) {
      y ^= gfMul(coeffs[power], gfPow(x, power))
    }
    shares.push([x, y])
  }
  return shares
}

function combineByte(shares: [number, number][]): number {
  let secret = 0
  for (let i = 0; i < shares.length; i++) {
    const [xi, yi] = shares[i]
    let num = 1
    let den = 1
    for (let j = 0; j < shares.length; j++) {
      if (i === j) continue
      const [xj] = shares[j]
      num = gfMul(num, xj)
      den = gfMul(den, xi ^ xj)
    }
    const li = gfDiv(num, den)
    secret ^= gfMul(yi, li)
  }
  return secret
}

function splitCore(input: string, key: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const parts = key.split(',').map((s) => s.trim())
  const n = parseInt(parts[0] || '5', 10)
  const k = parseInt(parts[1] || '3', 10)
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 2 || k > n || n > 255) {
    throw new CipherError('INVALID_KEY', 'Expected "totalShares,threshold" with 2 <= threshold <= totalShares <= 255.')
  }
  const secretBytes = parseHexBytes(input, 'secret')

  // shares[shareIndex] = array of (x, y) pairs, one per secret byte
  const shareRows: [number, number][][] = secretBytes.length
    ? Array.from({ length: n }, () => [])
    : []
  for (const b of secretBytes) {
    const byteShares = splitByte(b, n, k)
    byteShares.forEach(([x, y], idx) => shareRows[idx].push([x, y]))
  }

  const shareStrings = shareRows.map(
    (row, _idx) => `${row[0][0]}:${bytesToHex(new Uint8Array(row.map(([, y]) => y)))}`
  )

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Polynomial split',
      inputState: `secret=${input}, n=${n}, k=${k}`,
      outputState: shareStrings.join(' | '),
      note: `Each byte of the secret becomes the constant term of an independent random degree-${k - 1} polynomial over GF(256), evaluated at x=1..${n}.`,
      isMilestone: true,
    })
  }

  return {
    output: shareStrings.join('|'),
    outputEncoding: 'utf8',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

function combineCore(input: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const shareStrings = input.split('|').filter(Boolean)
  if (shareStrings.length < 2) {
    throw new CipherError('INVALID_INPUT', 'Provide at least 2 shares as "x1:hexBytes1|x2:hexBytes2|...".')
  }
  const parsedShares = shareStrings.map((s) => {
    const [xStr, hexBytes] = s.split(':')
    return { x: parseInt(xStr, 10), bytes: parseHexBytes(hexBytes, 'share') }
  })
  const byteLen = parsedShares[0].bytes.length
  const secretBytes = new Uint8Array(byteLen)
  for (let byteIdx = 0; byteIdx < byteLen; byteIdx++) {
    const points: [number, number][] = parsedShares.map((s) => [s.x, s.bytes[byteIdx]])
    secretBytes[byteIdx] = combineByte(points)
  }

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Lagrange interpolation',
      inputState: `${parsedShares.length} share(s) provided`,
      outputState: bytesToHex(secretBytes),
      note: 'Recovers only the polynomial\'s constant term (the secret) via Lagrange interpolation in GF(256) — the full polynomial is never reconstructed.',
      isMilestone: true,
    })
  }

  return {
    output: bytesToHex(secretBytes),
    outputEncoding: 'hex',
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
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return splitCore(input, key, !!options.instrument)
}
/**
 * Decrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Decrypt operation.
 * @param _key Input required by the Decrypt operation.
 * @param options Input required by the Decrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function decrypt(input: string, _key: string, options: CipherOptions = {}): CipherResult {
  return combineCore(input, !!options.instrument)
}

/**
 * TEST VECTORS cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: 'c8',
    key: '5,3',
    expected: 'randomized',
    description: 'Split secret byte 0xc8 (200) into 5 shares with threshold 3 (randomized output)',
  },
  {
    input: '1:14|2:a7|3:7b',
    key: '',
    expected: 'c8',
    description: 'Reconstruct secret byte 0xc8 from 3 shares (threshold 3)',
  },
]

// Note: Split (encrypt) uses fresh randomness by design. A real Shamir implementation must never reuse
// coefficients across
