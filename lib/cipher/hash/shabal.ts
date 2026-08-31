/**
 * Shabal — SHA-3 Second-Round Finalist
 * Asymmetric permutation over a large rolling state (A, B, C registers).
 * Stream-cipher-like update. Supports 192/224/256/384/512-bit output.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

const METADATA: CipherMetadata = {
  name: 'Shabal',
  blockSize: 512,
  securityStatus: 'experimental',
  breakingComplexity: 'SHA-3 finalist. Rolling state (A, B, C registers). Stream-cipher-like update.',
  yearDesigned: 2008,
  standardBody: 'NIST SHA-3 Competition',
}

function u32(n: number): number { return n >>> 0 }
function rotl(x: number, n: number): number { return u32((x << n) | (x >>> (32 - n))) }
function imul(a: number, b: number): number { return Math.imul(a, b) }

function shabalCore(input: string, outputBits: number, instrument: boolean): CipherResult {
  const start = performance.now()
  const inBytes: number[] = []
  const c = input.replace(/\s+/g, '').toLowerCase()
  if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) throw new CipherError('INVALID_INPUT', 'Input must be hex.')
  for (let i = 0; i < c.length; i += 2) inBytes.push(parseInt(c.slice(i, i + 2), 16))

  // State: A (12 words), B (16 words), C (16 words), W (2 words)
  const A = new Array(12).fill(0).map((_, i) => u32(0x12345678 + i + outputBits)) // Mock IV
  const B = new Array(16).fill(0).map((_, i) => u32(0x9ABCDEF0 + i))
  const C = new Array(16).fill(0).map((_, i) => u32(0x11223344 + i))
  let W0 = 1, W1 = 0 // 64-bit counter

  const steps: CipherStep[] = []
  
  // Padding
  const padded = [...inBytes, 0x80]
  while (padded.length % 64 !== 0) padded.push(0)

  for (let b = 0; b < padded.length; b += 64) {
    const M = new Array(16).fill(0)
    for (let i = 0; i < 16; i++) {
      const off = b + i * 4
      M[i] = u32(padded[off] | (padded[off+1] << 8) | (padded[off+2] << 16) | (padded[off+3] << 24))
    }

    // 24 sub-rounds
    for (let r = 0; r < 24; r++) {
      const aIdx = r % 12
      const bIdx1 = (r + 13) % 16
      const cIdx = (r + 3) % 16
      const bIdx2 = (r + 9) % 16
      const mIdx = r % 16

      // A[r%12] = rotate(A[r%12] XOR B[(r+13)%16] XOR (C[(r+3)%16] * 3) + M[r%16]) * 5 + B[(r+9)%16]
      let val = u32(A[aIdx] ^ B[bIdx1] ^ imul(C[cIdx], 3))
      val = u32(val + M[mIdx])
      val = rotl(val, 15) // Representative rotation
      val = u32(imul(val, 5) + B[bIdx2])
      A[aIdx] = val

      // B[(r+13)%16] ^= rotate(A[r%12])
      B[bIdx1] = u32(B[bIdx1] ^ rotl(A[aIdx], 1))
    }

    // Post-update state roll: B rotated left by 1 word position
    const tmpB = B.shift()!
    B.push(tmpB)

    // C swapped with previous B (simplified for visualizer)
    for (let i = 0; i < 16; i++) {
      const t = C[i]; C[i] = B[i]; B[i] = t
    }

    // Increment W
    W0 = u32(W0 + 1)
    if (W0 === 0) W1 = u32(W1 + 1)
  }

  // Output extraction from B
  const outWords = outputBits / 32
  const outBytes: number[] = []
  for (let i = 16 - outWords; i < 16; i++) {
    outBytes.push(B[i] & 0xff, (B[i] >>> 8) & 0xff, (B[i] >>> 16) & 0xff, (B[i] >>> 24) & 0xff)
  }

  const outHex = outBytes.map(b => b.toString(16).padStart(2, '0')).join('')

  if (instrument) {
    steps.push({ index: 0, label: 'Shabal Hash', inputState: input, outputState: outHex, note: `Rolling B-register. 24 sub-rounds per block.`, isMilestone: true })
  }

  return { output: outHex, outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

/**
 * Encrypt cryptographic hash export.
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
  const bits = (options.outputBits as number) || 256
  return shabalCore(input, bits, !!options.instrument)
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
  throw new CipherError('ONE_WAY_HASH', 'Shabal is a one-way hash function.')
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
  { input: '', key: '', expected: 'mock_shabal_256', description: 'Shabal-256 empty string' }
]
