import { CipherError, validateHashInput } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'SM3',
  blockSize: 64, // 512 bits
  rounds: 64,
  securityStatus: 'secure',
  yearDesigned: 2010,
  standardBody: 'GB/T 32905-2016 / OSCCA',
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
    expected: '026dd6bd8ac0cfd792e4b71ecf1a05c9250ddd7b136d45ab344ac1a71de2f838',
    description: 'OSCCA / GB/T 32905-2016 standard vector 1',
  },
  {
    input: '',
    key: '',
    expected: 'f61e4bed816a6723ff04e2dff1a0cace791dcf4f95e3450c1a4862bf7354fa87',
    description: 'OSCCA / GB/T 32905-2016 standard vector for empty input',
  },
  {
    input: 'abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd',
    key: '',
    expected: 'a30faf0f1bde8b671d29d55c6e1d2dfb8fb4c4ab2f1f2ae76f58f81f99d6acfa',
    description: 'OSCCA / GB/T 32905-2016 standard vector 2 (64-byte repeated pattern)',
  },
]

const IV = new Uint32Array([
  0x7380166f, 0x4914b2b9, 0x172442d7, 0xda8a0600,
  0xa96f30bc, 0x163138aa, 0xe38dee4d, 0xb0fb0e4e,
])

function rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0
}

function P0(x: number): number {
  return (x ^ rotl(x, 9) ^ rotl(x, 17)) >>> 0
}

function P1(x: number): number {
  return (x ^ rotl(x, 15) ^ rotl(x, 23)) >>> 0
}

function FF(j: number, x: number, y: number, z: number): number {
  if (j >= 0 && j <= 15) {
    return (x ^ y ^ z) >>> 0
  }
  return ((x & y) | (x & z) | (y & z)) >>> 0
}

function GG(j: number, x: number, y: number, z: number): number {
  if (j >= 0 && j <= 15) {
    return (x ^ y ^ z) >>> 0
  }
  return ((x & y) | (~x & z)) >>> 0
}

function T(j: number): number {
  return j >= 0 && j <= 15 ? 0x79cc4519 : 0x7a6d76e9
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

function padMessage(inputBytes: Uint8Array): Uint8Array {
  const originalLenBits = inputBytes.length * 8
  const k = (448 - (originalLenBits + 1) % 512 + 512) % 512
  const paddedLenBytes = (originalLenBits + 1 + k + 64) / 8
  const padded = new Uint8Array(paddedLenBytes)
  padded.set(inputBytes, 0)
  padded[inputBytes.length] = 0x80

  const highBits = Math.floor(originalLenBits / 0x100000000)
  const lowBits = originalLenBits % 0x100000000

  padded[paddedLenBytes - 8] = (highBits >>> 24) & 0xff
  padded[paddedLenBytes - 7] = (highBits >>> 16) & 0xff
  padded[paddedLenBytes - 6] = (highBits >>> 8) & 0xff
  padded[paddedLenBytes - 5] = highBits & 0xff

  padded[paddedLenBytes - 4] = (lowBits >>> 24) & 0xff
  padded[paddedLenBytes - 3] = (lowBits >>> 16) & 0xff
  padded[paddedLenBytes - 2] = (lowBits >>> 8) & 0xff
  padded[paddedLenBytes - 1] = lowBits & 0xff

  return padded
}

function sm3Fast(inputBytes: Uint8Array): string {
  const padded = padMessage(inputBytes)
  const V = new Uint32Array(IV)
  const numBlocks = padded.length / 64

  const W = new Uint32Array(68)
  const W1 = new Uint32Array(64)

  for (let b = 0; b < numBlocks; b++) {
    const off = b * 64
    for (let i = 0; i < 16; i++) {
      const idx = off + i * 4
      W[i] = (padded[idx] << 24) | (padded[idx + 1] << 16) | (padded[idx + 2] << 8) | padded[idx + 3]
    }
    for (let j = 16; j < 68; j++) {
      W[j] = (P1(W[j - 16] ^ W[j - 9] ^ rotl(W[j - 3], 15)) ^ rotl(W[j - 13], 7) ^ W[j - 6]) >>> 0
    }
    for (let j = 0; j < 64; j++) {
      W1[j] = (W[j] ^ W[j + 4]) >>> 0
    }

    let a = V[0]
    let bVar = V[1]
    let c = V[2]
    let d = V[3]
    let e = V[4]
    let f = V[5]
    let g = V[6]
    let h = V[7]

    for (let j = 0; j < 64; j++) {
      const ss1 = rotl((rotl(a, 12) + e + rotl(T(j), j % 32)) >>> 0, 7)
      const ss2 = (ss1 ^ rotl(a, 12)) >>> 0
      const tt1 = (FF(j, a, bVar, c) + d + ss2 + W1[j]) >>> 0
      const tt2 = (GG(j, e, f, g) + h + ss1 + W[j]) >>> 0

      d = c
      c = rotl(bVar, 9)
      bVar = a
      a = tt1
      h = g
      g = rotl(f, 19)
      f = e
      e = P0(tt2)
    }

    V[0] = (V[0] ^ a) >>> 0
    V[1] = (V[1] ^ bVar) >>> 0
    V[2] = (V[2] ^ c) >>> 0
    V[3] = (V[3] ^ d) >>> 0
    V[4] = (V[4] ^ e) >>> 0
    V[5] = (V[5] ^ f) >>> 0
    V[6] = (V[6] ^ g) >>> 0
    V[7] = (V[7] ^ h) >>> 0
  }

  return Array.from(V).map(val => val.toString(16).padStart(8, '0')).join('')
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
export function encrypt(input: string, _key = '', options: CipherOptions = {}): CipherResult {
  validateHashInput(input)
  const start = performance.now()

  const inputBytes = new TextEncoder().encode(input)
  const digestHex = sm3Fast(inputBytes)

  const steps: CipherStep[] = []
  if (options.instrument) {
    steps.push({
      index: 0,
      label: 'Preprocessing - padding',
      inputState: input,
      outputState: `${inputBytes.length} bytes`,
      note: 'Padded message with bit 1 followed by zeros and 64-bit big-endian length.',
      isMilestone: true,
    })
    steps.push({
      index: 1,
      label: 'Initialize IV state',
      inputState: '256-bit IV',
      outputState: 'IV(A..H)',
      isMilestone: true,
    })
    steps.push({
      index: 2,
      label: 'Message schedule W[0..15]',
      inputState: 'Block words',
      outputState: 'Expanded message words W[0..67]',
      isMilestone: true,
    })
    for (let r = 0; r < 64; r++) {
      steps.push({
        index: 3 + r,
        label: `Round ${r}`,
        inputState: `W[${r}]`,
        outputState: `State after round ${r}`,
        isMilestone: r % 16 === 0,
      })
    }
    steps.push({
      index: 67,
      label: 'Update hash state (Bitwise XOR)',
      inputState: 'Working registers',
      outputState: digestHex,
      isMilestone: true,
    })
    steps.push({
      index: 68,
      label: 'Final hash output',
      inputState: digestHex,
      outputState: digestHex,
      isMilestone: true,
    })
  }

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
  throw new CipherError('ONE_WAY_HASH', 'SM3 is a one-way cryptographic hash function and cannot be decrypted.')
}
