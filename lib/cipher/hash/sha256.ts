import { sha256 } from '@noble/hashes/sha2.js'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError, validateHashInput } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'SHA-256',
  blockSize: 64, // 512 bits
  rounds: 64,
  securityStatus: 'secure',
  yearDesigned: 2001,
  standardBody: 'NIST',
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
    input: 'abc',
    key: '',
    expected: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    description: 'NIST standard vector 1',
  },
  {
    input: '',
    key: '',
    expected: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    description: 'NIST standard vector for empty input',
  },
  {
    input: 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
    key: '',
    expected: '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    description: 'NIST standard vector 56-byte transition',
  },
]

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

const H_INIT = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0
}

function sigma0(x: number): number {
  return (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0
}

function sigma1(x: number): number {
  return (rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10)) >>> 0
}

function SIGMA0(x: number): number {
  return (rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22)) >>> 0
}

function SIGMA1(x: number): number {
  return (rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25)) >>> 0
}

function Ch(x: number, y: number, z: number): number {
  return ((x & y) ^ (~x & z)) >>> 0
}

function Maj(x: number, y: number, z: number): number {
  return ((x & y) ^ (x & z) ^ (y & z)) >>> 0
}

/**
 * Validate Hash Input cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Validate Hash Input operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export { validateHashInput }

function sha256Fast(inputBytes: Uint8Array): string {
  const hashBytes = sha256(inputBytes)
  return fromByteArray(hashBytes, 'hex')
}

function sha256Instrumented(inputBytes: Uint8Array): CipherResult {
  const start = performance.now()
  const steps: CipherStep[] = []

  // Preprocessing / padding
  const originalLenBits = inputBytes.length * 8
  const padLen = (448 - (originalLenBits + 8) % 512 + 512) % 512
  const paddedLenBytes = (originalLenBits + 8 + padLen + 64) / 8
  const padded = new Uint8Array(paddedLenBytes)
  padded.set(inputBytes, 0)
  padded[inputBytes.length] = 0x80
  
  // Write length as 64-bit big endian at the end
  const view = new DataView(padded.buffer)
  view.setUint32(paddedLenBytes - 4, originalLenBits & 0xffffffff)
  view.setUint32(paddedLenBytes - 8, (originalLenBits / 0x100000000) & 0xffffffff)

  steps.push({
    index: 0,
    label: 'Preprocessing - padding',
    inputState: fromByteArray(inputBytes, 'hex'),
    outputState: fromByteArray(padded, 'hex'),
    table: [
      { key: 'Original length', value: `${inputBytes.length} bytes` },
      { key: 'Padded length', value: `${paddedLenBytes} bytes` },
    ],
    note: 'Appended bit 1 (0x80), zero-padded until length = 448 mod 512 bits, and appended original length as 64-bit integer.',
    isMilestone: true,
  })

  // Initialize hash state
  const H = [...H_INIT]

  // We process the first block in detail for step visualization
  const numBlocks = padded.length / 64

  for (let b = 0; b < numBlocks; b++) {
    const block = padded.slice(b * 64, (b + 1) * 64)
    const isFirstBlock = b === 0

    const W = new Uint32Array(64)
    for (let i = 0; i < 16; i++) {
      W[i] = (block[i * 4] << 24) | (block[i * 4 + 1] << 16) | (block[i * 4 + 2] << 8) | block[i * 4 + 3]
    }
    for (let i = 16; i < 64; i++) {
      W[i] = (sigma1(W[i - 2]) + W[i - 7] + sigma0(W[i - 15]) + W[i - 16]) >>> 0
    }

    if (isFirstBlock) {
      // Step 1: W[0..15]
      const wRows4x4 = Array.from({ length: 4 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => {
          const val = W[r * 4 + c]
          return '0x' + val.toString(16).padStart(8, '0')
        })
      )
      steps.push({
        index: steps.length,
        label: 'Message schedule W[0..15]',
        inputState: fromByteArray(block, 'hex'),
        outputState: '',
        matrix: wRows4x4,
        note: 'Extracted first 16 words directly from block 1.',
      })

      // Step 2-4: W[16..31], W[32..47], W[48..63]
      for (let wGroup = 1; wGroup <= 3; wGroup++) {
        const startIdx = wGroup * 16
        const endIdx = startIdx + 15
        steps.push({
          index: steps.length,
          label: `Message schedule W[${startIdx}..${endIdx}]`,
          inputState: '',
          outputState: '',
          note: `Expanded message schedule words using sigma0 and sigma1 functions.`,
        })
      }

      // Step 5: Initialize working variables
      let [a, bVar, c, d, e, f, g, h] = H
      steps.push({
        index: steps.length,
        label: 'Initialize working variables',
        inputState: '',
        outputState: '',
        table: [
          { key: 'a', value: '0x' + a.toString(16).padStart(8, '0') },
          { key: 'b', value: '0x' + bVar.toString(16).padStart(8, '0') },
          { key: 'c', value: '0x' + c.toString(16).padStart(8, '0') },
          { key: 'd', value: '0x' + d.toString(16).padStart(8, '0') },
          { key: 'e', value: '0x' + e.toString(16).padStart(8, '0') },
          { key: 'f', value: '0x' + f.toString(16).padStart(8, '0') },
          { key: 'g', value: '0x' + g.toString(16).padStart(8, '0') },
          { key: 'h', value: '0x' + h.toString(16).padStart(8, '0') },
        ],
        note: 'Set working variables to current hash state.',
        isMilestone: true,
      })

      // Compression rounds 0..63
      for (let i = 0; i < 64; i++) {
        const T1 = (h + SIGMA1(e) + Ch(e, f, g) + K[i] + W[i]) >>> 0
        const T2 = (SIGMA0(a) + Maj(a, bVar, c)) >>> 0
        
        h = g
        g = f
        f = e
        e = (d + T1) >>> 0
        d = c
        c = bVar
        bVar = a
        a = (T1 + T2) >>> 0

        steps.push({
          index: steps.length,
          label: `Round ${i}`,
          inputState: '',
          outputState: '',
          table: [
            { key: `W[${i}]`, value: '0x' + W[i].toString(16).padStart(8, '0') },
            { key: `K[${i}]`, value: '0x' + K[i].toString(16).padStart(8, '0') },
            { key: 'T1', value: '0x' + T1.toString(16).padStart(8, '0') },
            { key: 'T2', value: '0x' + T2.toString(16).padStart(8, '0') },
            { key: 'new a', value: '0x' + a.toString(16).padStart(8, '0') },
            { key: 'new e', value: '0x' + e.toString(16).padStart(8, '0') },
          ],
          note: `Completed SHA-256 compression round ${i}.`,
        })
      }

      // Add to hash state
      H[0] = (H[0] + a) >>> 0
      H[1] = (H[1] + bVar) >>> 0
      H[2] = (H[2] + c) >>> 0
      H[3] = (H[3] + d) >>> 0
      H[4] = (H[4] + e) >>> 0
      H[5] = (H[5] + f) >>> 0
      H[6] = (H[6] + g) >>> 0
      H[7] = (H[7] + h) >>> 0

      steps.push({
        index: steps.length,
        label: 'Add to hash state',
        inputState: '',
        outputState: '',
        note: 'Added compressed working variables back to the hash state (modulo 2^32).',
        isMilestone: true,
      })
    } else {
      // Fast compression for subsequent blocks
      let [a, bVar, c, d, e, f, g, h] = H
      for (let i = 0; i < 64; i++) {
        const T1 = (h + SIGMA1(e) + Ch(e, f, g) + K[i] + W[i]) >>> 0
        const T2 = (SIGMA0(a) + Maj(a, bVar, c)) >>> 0
        h = g
        g = f
        f = e
        e = (d + T1) >>> 0
        d = c
        c = bVar
        bVar = a
        a = (T1 + T2) >>> 0
      }
      H[0] = (H[0] + a) >>> 0
      H[1] = (H[1] + bVar) >>> 0
      H[2] = (H[2] + c) >>> 0
      H[3] = (H[3] + d) >>> 0
      H[4] = (H[4] + e) >>> 0
      H[5] = (H[5] + f) >>> 0
      H[6] = (H[6] + g) >>> 0
      H[7] = (H[7] + h) >>> 0
    }
  }

  const outputHex = H.map(val => val.toString(16).padStart(8, '0')).join('')

  steps.push({
    index: steps.length,
    label: 'Final hash output',
    inputState: '',
    outputState: outputHex,
    note: 'Concatenated H0 through H7 to yield the final 256-bit message digest.',
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
    return sha256Instrumented(inputBytes)
  }

  const start = performance.now()
  const output = sha256Fast(inputBytes)
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
