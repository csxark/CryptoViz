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

export const TEST_VECTORS: TestVector[] = [
  {
    input: '',
    key: '',
    expected: '19fa61d75522a4669b44e39c1d2e1726c530232130d407f89afee0964997f7a73e83be698b288febcf88e3e03c4f0757ea8964e59b63d93708b138cc42a66eb3',
    description: 'Standard vector for empty string',
  },
  {
    input: 'a',
    key: '',
    expected: '4dffea086381d6d6787601d723642d547f3319012470719875f6393b484553256086338b2581691a51240c5b3644f814981d33c87f4c546522c070267793d56f',
    description: 'Standard vector for "a"',
  },
  {
    input: 'abc',
    key: '',
    expected: '4e2448a4c6f486bb16b6562c73b4020bf3043e3a731bce721ae1b303d97e6d4c7181eebdb6c57e277d0e34957114cbd6c797fc9d95d8b582d225292076d4eef5',
    description: 'Standard vector for "abc"',
  },
  {
    input: 'message digest',
    key: '',
    expected: '378c84a4126e2dc6e56dcc7458377aac838d00032230f53ce1f5700c0ffb4d3b8421557659ef55c106b4b52ac5a4aaa692ed920052838f3362e86dbd37a8903e',
    description: 'Standard vector for "message digest"',
  },
]

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

function rotateRight64hi(hi: number, lo: number, n: number): number {
  if (n === 32) return lo
  if (n > 32) return rotateRight64hi(lo, hi, n - 32)
  return ((hi >>> n) | (lo << (32 - n))) | 0
}

function rotateRight64lo(hi: number, lo: number, n: number): number {
  if (n === 32) return hi
  if (n > 32) return rotateRight64lo(lo, hi, n - 32)
  return ((lo >>> n) | (hi << (32 - n))) | 0
}

// Precompute tables matching whirlpool-js
const u = Array.from({ length: 8 }, () => Array.from({ length: 256 }, () => new Int32Array(2)))
const w = Array.from({ length: 11 }, () => new Int32Array(2))

for (let p = 0; p < 256; p++) {
  const f = SBOX[p]

  let e = f << 1
  if (e >= 256) e ^= 285

  let b = e << 1
  if (b >= 256) b ^= 285

  const a = b ^ f

  let G = b << 1
  if (G >= 256) G ^= 285

  const F = G ^ f

  u[0][p][0] = (f << 24) | (f << 16) | (b << 8) | f
  u[0][p][1] = (G << 24) | (a << 16) | (e << 8) | F

  for (let q = 1; q < 8; q++) {
    u[q][p][0] = rotateRight64lo(u[0][p][1], u[0][p][0], q << 3)
    u[q][p][1] = rotateRight64hi(u[0][p][1], u[0][p][0], q << 3)
  }
}

w[0][0] = 0
w[0][1] = 0
for (let v = 1; v <= 10; v++) {
  const A = 8 * (v - 1)
  w[v][0] = (u[0][A][0] & 0xff000000) ^ (u[1][A + 1][0] & 0x00ff0000) ^ (u[2][A + 2][0] & 0x0000ff00) ^ (u[3][A + 3][0] & 0x000000ff)
  w[v][1] = (u[4][A + 4][1] & 0xff000000) ^ (u[5][A + 5][1] & 0x00ff0000) ^ (u[6][A + 6][1] & 0x0000ff00) ^ (u[7][A + 7][1] & 0x000000ff)
}

/**
 * Whirlpool block transformation (W cipher)
 */
function whirlpoolTransform(state: Uint8Array, block: Uint8Array, traceSteps?: (round: number, stateMat: number[][]) => void): void {
  const K = new Int32Array(16)
  const stateWords = new Int32Array(16)

  for (let i = 0; i < 16; i++) {
    const b = i * 4
    const stateVal = (state[b] << 24) | (state[b + 1] << 16) | (state[b + 2] << 8) | state[b + 3]
    const blockVal = (block[b] << 24) | (block[b + 1] << 16) | (block[b + 2] << 8) | block[b + 3]
    K[i] = stateVal
    stateWords[i] = blockVal ^ stateVal
  }

  const L = new Int32Array(16)

  for (let r = 1; r <= 10; r++) {
    for (let i = 0; i < 8; i++) {
      L[i * 2] = 0
      L[i * 2 + 1] = 0
      for (let t = 0; t < 8; t++) {
        const s = 56 - t * 8
        const j = s < 32 ? 1 : 0
        const byte = (K[((i - t) & 7) * 2 + j] >>> (s % 32)) & 255
        L[i * 2] ^= u[t][byte][0]
        L[i * 2 + 1] ^= u[t][byte][1]
      }
    }
    for (let i = 0; i < 16; i++) {
      K[i] = L[i]
    }
    K[0] ^= w[r][0]
    K[1] ^= w[r][1]

    for (let i = 0; i < 8; i++) {
      L[i * 2] = K[i * 2]
      L[i * 2 + 1] = K[i * 2 + 1]
      for (let t = 0; t < 8; t++) {
        const s = 56 - t * 8
        const j = s < 32 ? 1 : 0
        const byte = (stateWords[((i - t) & 7) * 2 + j] >>> (s % 32)) & 255
        L[i * 2] ^= u[t][byte][0]
        L[i * 2 + 1] ^= u[t][byte][1]
      }
    }
    for (let i = 0; i < 16; i++) {
      stateWords[i] = L[i]
    }

    if (traceSteps) {
      const mat: number[][] = []
      for (let C = 0; C < 8; C++) {
        const rowArr = [
          (stateWords[C * 2] >>> 24) & 255,
          (stateWords[C * 2] >>> 16) & 255,
          (stateWords[C * 2] >>> 8) & 255,
          stateWords[C * 2] & 255,
          (stateWords[C * 2 + 1] >>> 24) & 255,
          (stateWords[C * 2 + 1] >>> 16) & 255,
          (stateWords[C * 2 + 1] >>> 8) & 255,
          stateWords[C * 2 + 1] & 255,
        ]
        mat.push(rowArr)
      }
      traceSteps(r, mat)
    }
  }

  for (let i = 0; i < 16; i++) {
    const b = i * 4
    const blockVal = (block[b] << 24) | (block[b + 1] << 16) | (block[b + 2] << 8) | block[b + 3]
    const stateVal = (state[b] << 24) | (state[b + 1] << 16) | (state[b + 2] << 8) | state[b + 3]
    const newVal = stateVal ^ stateWords[i] ^ blockVal

    state[b] = (newVal >>> 24) & 255
    state[b + 1] = (newVal >>> 16) & 255
    state[b + 2] = (newVal >>> 8) & 255
    state[b + 3] = newVal & 255
  }
}

/**
 * Calculates Whirlpool hash of input bytes
 */
export function whirlpoolHash(inputBytes: Uint8Array, trace?: boolean): { digestHex: string; steps: CipherStep[] } {
  const steps: CipherStep[] = []
  const lenBytes = inputBytes.length
  const bitLen = BigInt(lenBytes) * 8n

  // Whirlpool padding: message + 0x80 + zero bytes + 256-bit (32-byte) bit length representation
  // Total padded size must be a multiple of 64 bytes (512 bits)
  const remainder = (lenBytes + 1) % 64
  const zerosNeeded = (32 - remainder + 64) % 64
  const totalLength = lenBytes + 1 + zerosNeeded + 32
  const padded = new Uint8Array(totalLength)

  padded.set(inputBytes, 0)
  padded[lenBytes] = 0x80

  // Encode bit length as 256-bit big-endian integer at the end (last 32 bytes)
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

  const state = new Uint8Array(64) // Initial hash state (all zeros)

  for (let b = 0; b < numBlocks; b++) {
    const block = padded.subarray(b * 64, (b + 1) * 64)

    whirlpoolTransform(state, block, (round, mat) => {
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

export function encrypt(input: string, key: string = '', options: CipherOptions = {}): CipherResult {
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

export function decrypt(): CipherResult {
  throw new CipherError('ALGORITHM_UNSUPPORTED', 'One-way cryptographic hash functions do not support decryption.')
}
