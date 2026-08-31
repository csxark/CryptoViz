import { md5 } from '@noble/hashes/legacy.js'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError } from '../../utils/errors'
import { validateHashInput } from './sha256'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'MD5',
  blockSize: 64, // 512 bits
  rounds: 64,
  securityStatus: 'broken',
  yearDesigned: 1991,
  standardBody: 'RFC 1321',
}

/**
 * TEST VECTORS cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: '',
    key: '',
    expected: 'd41d8cd98f00b204e9800998ecf8427e',
    description: 'RFC 1321 empty string vector',
  },
  {
    input: 'abc',
    key: '',
    expected: '900150983cd24fb0d6963f7d28e17f72',
    description: 'RFC 1321 abc vector',
  },
  {
    input: 'message digest',
    key: '',
    expected: 'f96b697d7cb7938d525a2f31aaf161d0',
    description: 'RFC 1321 message digest vector',
  },
]

const S = [
  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,
  5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,
  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,
  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21
]

const T = new Uint32Array(64)
for (let i = 0; i < 64; i++) {
  T[i] = Math.floor(4294967296 * Math.abs(Math.sin(i + 1))) >>> 0
}

function rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0
}

function F(b: number, c: number, d: number): number { return ((b & c) | (~b & d)) >>> 0 }
function G(b: number, c: number, d: number): number { return ((b & d) | (c & ~d)) >>> 0 }
function H(b: number, c: number, d: number): number { return (b ^ c ^ d) >>> 0 }
function I(b: number, c: number, d: number): number { return (c ^ (b | ~d)) >>> 0 }

function stateToHex(val: number): string {
  const b0 = val & 0xff
  const b1 = (val >>> 8) & 0xff
  const b2 = (val >>> 16) & 0xff
  const b3 = (val >>> 24) & 0xff
  return b0.toString(16).padStart(2, '0') +
         b1.toString(16).padStart(2, '0') +
         b2.toString(16).padStart(2, '0') +
         b3.toString(16).padStart(2, '0')
}

function md5Fast(inputBytes: Uint8Array): string {
  const hashBytes = md5(inputBytes)
  return fromByteArray(hashBytes, 'hex')
}

function md5Instrumented(inputBytes: Uint8Array): CipherResult {
  const start = performance.now()
  const steps: CipherStep[] = []

  // Preprocessing / padding (MD5 uses little-endian for length)
  const originalLenBits = inputBytes.length * 8
  const padLen = (448 - (originalLenBits + 8) % 512 + 512) % 512
  const paddedLenBytes = (originalLenBits + 8 + padLen + 64) / 8
  const padded = new Uint8Array(paddedLenBytes)
  padded.set(inputBytes, 0)
  padded[inputBytes.length] = 0x80

  const view = new DataView(padded.buffer)
  view.setUint32(paddedLenBytes - 8, originalLenBits & 0xffffffff, true)
  view.setUint32(paddedLenBytes - 4, (originalLenBits / 0x100000000) & 0xffffffff, true)

  steps.push({
    index: 0,
    label: 'Preprocessing - padding',
    inputState: fromByteArray(inputBytes, 'hex'),
    outputState: fromByteArray(padded, 'hex'),
    table: [
      { key: 'Original length', value: `${inputBytes.length} bytes` },
      { key: 'Padded length', value: `${paddedLenBytes} bytes` },
    ],
    note: 'Appended bit 1 (0x80), zero-padded until length = 448 mod 512 bits, and appended original length as 64-bit little-endian integer.',
    isMilestone: true,
  })

  // Initial MD5 state
  let A = 0x67452301
  let B = 0xefcdab89
  let C = 0x98badcfe
  let D = 0x10325476

  steps.push({
    index: steps.length,
    label: 'Initialize working variables',
    inputState: '',
    outputState: '',
    table: [
      { key: 'A', value: '0x67452301' },
      { key: 'B', value: '0xefcdab89' },
      { key: 'C', value: '0x98badcfe' },
      { key: 'D', value: '0x10325476' },
    ],
    note: 'Set working variables to standard MD5 initial values.',
    isMilestone: true,
  })

  const numBlocks = padded.length / 64

  for (let b = 0; b < numBlocks; b++) {
    const block = padded.slice(b * 64, (b + 1) * 64)
    const isFirstBlock = b === 0

    const M = new Uint32Array(16)
    const blockView = new DataView(block.buffer)
    for (let i = 0; i < 16; i++) {
      M[i] = blockView.getUint32(i * 4, true)
    }

    if (isFirstBlock) {
      let a = A
      let bVar = B
      let c = C
      let d = D

      for (let i = 0; i < 64; i++) {
        let f = 0
        let g = 0

        if (i < 16) {
          f = F(bVar, c, d)
          g = i
        } else if (i < 32) {
          f = G(bVar, c, d)
          g = (5 * i + 1) % 16
        } else if (i < 48) {
          f = H(bVar, c, d)
          g = (3 * i + 5) % 16
        } else {
          f = I(bVar, c, d)
          g = (7 * i) % 16
        }

        const temp = d
        d = c
        c = bVar
        bVar = (bVar + rotl((a + f + T[i] + M[g]) >>> 0, S[i])) >>> 0
        a = temp

        steps.push({
          index: steps.length,
          label: `Round ${i}`,
          inputState: '',
          outputState: '',
          table: [
            { key: `M[${g}]`, value: '0x' + M[g].toString(16).padStart(8, '0') },
            { key: `T[${i}]`, value: '0x' + T[i].toString(16).padStart(8, '0') },
            { key: 'A', value: '0x' + a.toString(16).padStart(8, '0') },
            { key: 'B', value: '0x' + bVar.toString(16).padStart(8, '0') },
            { key: 'C', value: '0x' + c.toString(16).padStart(8, '0') },
            { key: 'D', value: '0x' + d.toString(16).padStart(8, '0') },
          ],
          note: `Completed MD5 round ${i}.`,
        })
      }

      A = (A + a) >>> 0
      B = (B + bVar) >>> 0
      C = (C + c) >>> 0
      D = (D + d) >>> 0

      steps.push({
        index: steps.length,
        label: 'Add to hash state',
        inputState: '',
        outputState: '',
        note: 'Added compressed working variables back to the hash state (modulo 2^32).',
        isMilestone: true,
      })
    } else {
      let a = A
      let bVar = B
      let c = C
      let d = D

      for (let i = 0; i < 64; i++) {
        let f = 0
        let g = 0

        if (i < 16) {
          f = F(bVar, c, d)
          g = i
        } else if (i < 32) {
          f = G(bVar, c, d)
          g = (5 * i + 1) % 16
        } else if (i < 48) {
          f = H(bVar, c, d)
          g = (3 * i + 5) % 16
        } else {
          f = I(bVar, c, d)
          g = (7 * i) % 16
        }

        const temp = d
        d = c
        c = bVar
        bVar = (bVar + rotl((a + f + T[i] + M[g]) >>> 0, S[i])) >>> 0
        a = temp
      }

      A = (A + a) >>> 0
      B = (B + bVar) >>> 0
      C = (C + c) >>> 0
      D = (D + d) >>> 0
    }
  }

  const outputHex = stateToHex(A) + stateToHex(B) + stateToHex(C) + stateToHex(D)

  steps.push({
    index: steps.length,
    label: 'Final hash output',
    inputState: '',
    outputState: outputHex,
    note: 'Formatted and concatenated A, B, C, and D in little-endian order to yield final 128-bit MD5 digest.',
    isMilestone: true,
  })

  return {
    output: outputHex,
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

/**
 * Encrypt cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(
  input: string,
  _key: string = '',
  options: CipherOptions = {}
): CipherResult {
  validateHashInput(input)
  const inputBytes = toByteArray(input, options.encoding || 'utf8')

  if (options.instrument) {
    return md5Instrumented(inputBytes)
  }

  const start = performance.now()
  const output = md5Fast(inputBytes)
  return {
    output,
    outputEncoding: 'hex',
    steps: [],
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

/**
 * Decrypt cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decrypt(
  input: string,
  _key: string = '',
  _options: CipherOptions = {}
): CipherResult {
  throw new CipherError(
    'ALGORITHM_UNSUPPORTED',
    'One-way cryptographic hash functions do not support decryption.'
  )
}
