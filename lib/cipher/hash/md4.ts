/**
 * MD4 — Ronald Rivest, 1990 (RFC 1320).
 * @see CIPHER_ENGINE.md section "MD4"
 *
 * Fully broken (collisions found by hand in seconds) — included as a
 * historical entry alongside MD5 and SHA-1, and as the direct ancestor
 * MD5 was designed to fix: MD4 has only 3 rounds (MD5 has 4) and no
 * per-step additive sine-derived constants (MD5 added those).
 *
 * Verified against all 3 of RFC 1320's own published test vectors in a
 * sandbox implementation before this file was written:
 *   MD4("")               = 31d6cfe0d16ae931b73c59d7e0c089c0
 *   MD4("abc")             = a448017aaf21d8525fc10ae87aa6729d
 *   MD4("message digest")  = d9130a8164549fe818874806e1c7014b
 */

import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput } from '../../utils'

const METADATA: CipherMetadata = {
  name: 'MD4',
  blockSize: 64,
  securityStatus: 'broken',
  breakingComplexity: 'Full collisions found by hand in seconds; do not use for anything security-relevant',
  yearDesigned: 1990,
  standardBody: 'RFC 1320',
}

const MASK = 0xffffffff
const S1 = [3, 7, 11, 19]
const S2 = [3, 5, 9, 13]
const S3 = [3, 9, 11, 15]
const ORDER2 = [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15]
const ORDER3 = [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15]

function rotl(x: number, n: number): number {
  const ux = x >>> 0
  return ((ux << n) | (ux >>> (32 - n))) >>> 0
}
function F(x: number, y: number, z: number): number {
  return ((x & y) | (~x & z)) >>> 0
}
function G(x: number, y: number, z: number): number {
  return ((x & y) | (x & z) | (y & z)) >>> 0
}
function H(x: number, y: number, z: number): number {
  return (x ^ y ^ z) >>> 0
}

function toBytesUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}
function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}
function wordToHex(w: number): string {
  // MD4 outputs little-endian words -> reverse byte order for hex display
  const bytes = [w & 0xff, (w >>> 8) & 0xff, (w >>> 16) & 0xff, (w >>> 24) & 0xff]
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function pad(message: Uint8Array): Uint8Array {
  const bitLen = BigInt(message.length) * 8n
  let paddedLen = message.length + 1
  while (paddedLen % 64 !== 56) paddedLen++
  paddedLen += 8
  const out = new Uint8Array(paddedLen)
  out.set(message)
  out[message.length] = 0x80
  let bits = bitLen
  for (let i = 0; i < 8; i++) {
    out[paddedLen - 8 + i] = Number(bits & 0xffn)
    bits >>= 8n
  }
  return out
}

function md4Core(message: Uint8Array): number[] {
  let A = 0x67452301
  let B = 0xefcdab89
  let C = 0x98badcfe
  let D = 0x10325476
  const padded = pad(message)

  for (let chunkOff = 0; chunkOff < padded.length; chunkOff += 64) {
    const X: number[] = []
    for (let i = 0; i < 16; i++) {
      const o = chunkOff + i * 4
      X.push((padded[o] | (padded[o + 1] << 8) | (padded[o + 2] << 16) | (padded[o + 3] << 24)) >>> 0)
    }
    const [AA, BB, CC, DD] = [A, B, C, D]

    // Round 1
    for (let i = 0; i < 16; i++) {
      const f = F(B, C, D)
      const newA = rotl((A + f + X[i]) >>> 0, S1[i % 4])
      ;[A, B, C, D] = [D, newA, B, C]
    }
    // Round 2
    for (let idx = 0; idx < 16; idx++) {
      const k = ORDER2[idx]
      const f = G(B, C, D)
      const newA = rotl((A + f + X[k] + 0x5a827999) >>> 0, S2[idx % 4])
      ;[A, B, C, D] = [D, newA, B, C]
    }
    // Round 3
    for (let idx = 0; idx < 16; idx++) {
      const k = ORDER3[idx]
      const f = H(B, C, D)
      const newA = rotl((A + f + X[k] + 0x6ed9eba1) >>> 0, S3[idx % 4])
      ;[A, B, C, D] = [D, newA, B, C]
    }

    A = (A + AA) >>> 0
    B = (B + BB) >>> 0
    C = (C + CC) >>> 0
    D = (D + DD) >>> 0
  }
  return [A, B, C, D]
}

function md4Digest(input: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const messageBytes = toBytesUtf8(input)
  const numBlocks = Math.ceil((messageBytes.length + 9) / 64)

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Padding',
      inputState: `${messageBytes.length} byte(s)`,
      outputState: `${numBlocks} block(s) of 64 bytes`,
      note: 'Message padded with a 1-bit, zeros, then a 64-bit little-endian length field.',
      isMilestone: true,
    })
  }

  const [A, B, C, D] = md4Core(messageBytes)
  const digest = wordToHex(A) + wordToHex(B) + wordToHex(C) + wordToHex(D)

  if (instrument) {
    steps.push({
      index: steps.length,
      label: '3 rounds x 16 operations per block',
      inputState: bytesToHex(messageBytes),
      outputState: digest,
      note: 'Round 1 uses F (choice function), round 2 uses G (majority function) + a constant, round 3 uses H (XOR) + a different constant — MD5 later added a 4th round on top of this exact structure.',
      isMilestone: true,
    })
  }

  return {
    output: digest,
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function encrypt(input: string, _key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return md4Digest(input, !!options.instrument)
}
export function decrypt(_input: string, _key: string, _options: CipherOptions = {}): CipherResult {
  throw new CipherError('ALGORITHM_UNSUPPORTED', 'MD4 is a one-way hash function — it has no decrypt operation.')
}

export const TEST_VECTORS: TestVector[] = [
  { input: '', key: '', expected: '31d6cfe0d16ae931b73c59d7e0c089c0', description: 'RFC 1320 test vector, empty input' },
  { input: 'abc', key: '', expected: 'a448017aaf21d8525fc10ae87aa6729d', description: 'RFC 1320 test vector, "abc"' },
  { input: 'message digest', key: '', expected: 'd9130a8164549fe818874806e1c7014b', description: 'RFC 1320 test vector, "message digest"' },
]
