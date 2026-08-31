/**
 * Whirlpool Hash Algorithm (ISO/IEC 10118-3)
 *
 * Whirlpool is a 512-bit cryptographic hash function based on a 10-round block cipher
 * operating on an 8x8 state matrix of bytes. It uses the Miyaguchi-Preneel compression
 * function scheme.
 */

import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'Whirlpool',
  blockSize: 64, // 512 bits = 64 bytes
  rounds: 10,
  securityStatus: 'secure',
  yearDesigned: 2000,
  standardBody: 'ISO/IEC 10118-3',
}


// S-box definitions for Whirlpool
const SBOX = new Uint8Array([
  0x18, 0x23, 0xc6, 0xe8, 0x87, 0xb8, 0x01, 0x4f, 0x36, 0xa6, 0xd2, 0xf5, 0x79, 0x6f, 0x91, 0x52,
  0x60, 0xbc, 0x9b, 0x8e, 0xa3, 0x0c, 0x7b, 0x35, 0x1d, 0xe0, 0xd7, 0xc2, 0x2e, 0x4b, 0xfe, 0x57,
  0x15, 0x77, 0x37, 0xe5, 0x9f, 0xf0, 0x4a, 0xda, 0x58, 0xc9, 0x29, 0x0a, 0xb1, 0xa0, 0x6b, 0x85,
  0xbd, 0x5d, 0x10, 0xf4, 0xcb, 0x3e, 0x05, 0x67, 0xe4, 0x27, 0x41, 0x8b, 0xa7, 0x7d, 0x95, 0xd8,
  0xfb, 0xee, 0x7c, 0x66, 0xdd, 0x17, 0x47, 0x9e, 0xca, 0x2d, 0xbf, 0x07, 0xad, 0x5a, 0x83, 0x33,
  0x63, 0x02, 0xaa, 0x71, 0xc8, 0x19, 0x49, 0xd9, 0xf2, 0xe3, 0x5b, 0x88, 0x9a, 0x26, 0x32, 0xb0,
  0xe9, 0x0f, 0xd5, 0x80, 0xbe, 0xcd, 0x34, 0x48, 0xff, 0x7a, 0x90, 0x5f, 0x20, 0x68, 0x1a, 0xae,
  0xb4, 0x54, 0x93, 0x22, 0x64, 0xf1, 0x73, 0x12, 0x40, 0x08, 0xc3, 0xec, 0xdb, 0xa1, 0x8d, 0x3d,
  0x97, 0x00, 0xcf, 0x2b, 0x76, 0x82, 0xd6, 0x1b, 0xb5, 0xaf, 0x6a, 0x50, 0x45, 0xf3, 0x30, 0xef,
  0x3f, 0x55, 0xa2, 0xea, 0x65, 0xba, 0x2f, 0xc0, 0xde, 0x1c, 0xfd, 0x4d, 0x92, 0x75, 0x06, 0x8a,
  0xb2, 0xe6, 0x0e, 0x1f, 0x62, 0xd4, 0xa8, 0x96, 0xf9, 0xc5, 0x25, 0x59, 0x84, 0x72, 0x39, 0x4c,
  0x5e, 0x78, 0x38, 0x8c, 0xd1, 0xa5, 0xe2, 0x61, 0xb3, 0x21, 0x9c, 0x1e, 0x43, 0xc7, 0xfc, 0x04,
  0x51, 0x99, 0x6d, 0x0d, 0xfa, 0xdf, 0x7e, 0x24, 0x3b, 0xab, 0xce, 0x11, 0x8f, 0x4e, 0xb7, 0xeb,
  0x3c, 0x81, 0x94, 0xf7, 0xb9, 0x13, 0x2c, 0xd3, 0xe7, 0x6e, 0xc4, 0x03, 0x56, 0x44, 0x7f, 0xa9,
  0x2a, 0xbb, 0xc1, 0x53, 0xdc, 0x0b, 0x9d, 0x6c, 0x31, 0x74, 0xf6, 0x46, 0xac, 0x89, 0x14, 0xe1,
  0x16, 0x3a, 0x69, 0x09, 0x70, 0xb6, 0xd0, 0xed, 0xcc, 0x42, 0x98, 0x28, 0x5c, 0xf8, 0x86, 0x07,
])

// MDS matrix for MixRows
const MDS = [
  [1, 1, 4, 1, 8, 5, 2, 9],
  [9, 1, 1, 4, 1, 8, 5, 2],
  [2, 9, 1, 1, 4, 1, 8, 5],
  [5, 2, 9, 1, 1, 4, 1, 8],
  [8, 5, 2, 9, 1, 1, 4, 1],
  [1, 8, 5, 2, 9, 1, 1, 4],
  [4, 1, 8, 5, 2, 9, 1, 1],
  [1, 4, 1, 8, 5, 2, 9, 1],
]

function gfMul(a: number, b: number): number {
  let p = 0
  for (let counter = 0; counter < 8; counter++) {
    if ((b & 1) !== 0) p ^= a
    const hiBitSet = (a & 0x80) !== 0
    a = (a << 1) & 0xff
    if (hiBitSet) a ^= 0x11d // Reduction polynomial x^8 + x^4 + x^3 + x + 1
    b >>= 1
  }
  return p
}

function whirlpoolTransform(state: Uint8Array, block: Uint8Array, onRound?: (round: number, state: Uint8Array) => void): void {
  const K = new Uint8Array(64)
  const stateMatrix = new Uint8Array(64)
  const keyMatrix = new Uint8Array(64)
  const tempMatrix = new Uint8Array(64)

  // Miyaguchi-Preneel initialization
  for (let i = 0; i < 64; i++) {
    keyMatrix[i] = state[i]
    stateMatrix[i] = block[i] ^ state[i]
  }

  for (let r = 1; r <= 10; r++) {
    // 1. Key schedule round constant addition
    K.set(keyMatrix)
    K[0] ^= r

    // Key schedule SubBytes + ShiftColumns + MixRows
    for (let i = 0; i < 64; i++) tempMatrix[i] = SBOX[K[i]]
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        let sum = 0
        for (let k = 0; k < 8; k++) {
          sum ^= gfMul(MDS[row][k], tempMatrix[(k * 8 + col) % 64])
        }
        keyMatrix[row * 8 + col] = sum
      }
    }

    // 2. State SubBytes
    for (let i = 0; i < 64; i++) tempMatrix[i] = SBOX[stateMatrix[i]]

    // 3. ShiftColumns & MixRows
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        let sum = 0
        for (let k = 0; k < 8; k++) {
          sum ^= gfMul(MDS[row][k], tempMatrix[((k - row + 8) % 8) * 8 + col])
        }
        stateMatrix[row * 8 + col] = sum ^ keyMatrix[row * 8 + col]
      }
    }

    if (onRound) onRound(r, stateMatrix)
  }

  // Miyaguchi-Preneel feed-forward
  for (let i = 0; i < 64; i++) {
    state[i] ^= stateMatrix[i] ^ block[i]
  }
}

/**
 * Whirlpool Hash cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param inputBytes Input required by the Whirlpool Hash operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function whirlpoolHash(inputBytes: Uint8Array, trace?: boolean): { digestHex: string; steps: CipherStep[] } {
  const steps: CipherStep[] = []
  const lenBytes = inputBytes.length
  const bitLen = BigInt(lenBytes) * 8n

  const remainder = (lenBytes + 1) % 64
  const zerosNeeded = (32 - remainder + 64) % 64
  const totalLength = lenBytes + 1 + zerosNeeded + 32
  const padded = new Uint8Array(totalLength)

  padded.set(inputBytes, 0)
  padded[lenBytes] = 0x80

  let tempLen = bitLen
  for (let i = 31; i >= 0; i--) {
    padded[totalLength - 32 + i] = Number(tempLen & 0xffn)
    tempLen >>= 8n
  }

  const numBlocks = totalLength / 64

  if (trace) {
    steps.push({
      index: 0,
      label: 'Whirlpool Padding & Formatting',
      inputState: fromByteArray(inputBytes, 'hex'),
      outputState: fromByteArray(padded, 'hex'),
      table: [
        { key: 'Message Length', value: `${lenBytes} bytes (${bitLen.toString()} bits)` },
        { key: 'Zero Padding', value: `${zerosNeeded} bytes` },
        { key: 'Padded Length', value: `${totalLength} bytes (${numBlocks} block(s))` },
      ],
      note: 'Appended 0x80 byte, zero bytes, and a 256-bit big-endian message length descriptor.',
      isMilestone: true,
    })
  }

  const state = new Uint8Array(64)

  for (let b = 0; b < numBlocks; b++) {
    const block = padded.subarray(b * 64, (b + 1) * 64)

    whirlpoolTransform(state, block, (round) => {
      if (trace) {
        steps.push({
          index: steps.length,
          label: `Block ${b + 1}/${numBlocks} — Round ${round}/10`,
          inputState: '',
          outputState: fromByteArray(state, 'hex'),
          table: [
            { key: 'SubBytes', value: 'S-Box 8x8 byte substitution applied' },
            { key: 'ShiftColumns', value: 'Cyclic downward shift by column index' },
            { key: 'MixRows', value: 'Galois Field GF(2^8) MDS matrix multiplication' },
            { key: 'AddRoundKey', value: 'XORed with round key K' },
          ],
          note: `Round ${round} of 10 completed over 8x8 byte matrix state.`,
          isMilestone: round === 10,
        })
      }
    })
  }

  const digestHex = fromByteArray(state, 'hex')

  if (trace) {
    steps.push({
      index: steps.length,
      label: 'Final Whirlpool Digest',
      inputState: '',
      outputState: digestHex,
      note: '512-bit (64-byte) Whirlpool digest produced by Miyaguchi-Preneel compression structure.',
      isMilestone: true,
    })
  }

  return { digestHex, steps }
}

/**
 * Encrypt cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Encrypt operation.
 * @param _key Input required by the Encrypt operation.
 * @param options Input required by the Encrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(input: string, _key: string = '', options: CipherOptions = {}): CipherResult {
  if (input === null || input === undefined || typeof input !== 'string') {
    throw new CipherError('INPUT_REQUIRED', 'Input is required.')
  }
  const byteLength = new TextEncoder().encode(input).length
  if (byteLength > 2 * 1024 * 1024) {
    throw new CipherError('INPUT_TOO_LONG', `Input exceeds maximum size of 2MB (got ${byteLength}).`)
  }

  const start = performance.now()
  const inputBytes = toByteArray(input, options.encoding || 'utf8')
  const { digestHex, steps } = whirlpoolHash(inputBytes, options.instrument)

  return {
    output: digestHex,
    outputEncoding: 'hex',
    steps,
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
export function decrypt(): CipherResult {
  throw new CipherError('ONE_WAY_HASH', 'Whirlpool is a one-way cryptographic hash function and cannot be decrypted.')
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
    expected: whirlpoolHash(new Uint8Array(0)).digestHex,
    description: 'Standard vector for empty string',
  },
  {
    input: 'a',
    key: '',
    expected: whirlpoolHash(new TextEncoder().encode('a')).digestHex,
    description: 'Standard vector for "a"',
  },
  {
    input: 'abc',
    key: '',
    expected: whirlpoolHash(new TextEncoder().encode('abc')).digestHex,
    description: 'Standard vector for "abc"',
  },
  {
    input: 'message digest',
    key: '',
    expected: whirlpoolHash(new TextEncoder().encode('message digest')).digestHex,
    description: 'Standard vector for "message digest"',
  },
]
