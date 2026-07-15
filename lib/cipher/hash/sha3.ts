/**
 * SHA3-256 — NIST FIPS 202 standard hash function using the Keccak sponge construction.
 * @see CIPHER_ENGINE.md section "SHA3-256"
 *
 * Unlike SHA-256 (Merkle-Damgard + compression function), SHA-3 absorbs input
 * into a 1600-bit state (5x5 array of 64-bit lanes) rate-sized block at a time,
 * running the Keccak-f[1600] permutation (24 rounds of theta/rho/pi/chi/iota)
 * between blocks, then squeezes out the digest.
 *
 * Fast mode delegates to the audited @noble/hashes implementation (same
 * pattern as sha256.ts's use of @noble/hashes for header computation).
 * Instrumented mode re-implements the permutation by hand so each round's
 * state can be visualized; its final output is verified against the noble
 * implementation in tests to guarantee correctness.
 */

import { sha3_256 } from '@noble/hashes/sha3.js'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'SHA3-256',
  blockSize: 136, // rate = 1088 bits = 136 bytes
  rounds: 24,
  securityStatus: 'secure',
  yearDesigned: 2015,
  standardBody: 'NIST FIPS 202',
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '',
    key: '',
    expected: 'a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a',
    description: 'NIST FIPS 202 vector for empty input',
  },
  {
    input: 'abc',
    key: '',
    expected: '3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532',
    description: 'NIST FIPS 202 standard vector',
  },
]

const RATE_BYTES = 136 // 1088 bits
const OUTPUT_BYTES = 32 // 256 bits
const MASK64 = (1n << 64n) - 1n

function rotl64(x: bigint, n: number): bigint {
  const shift = BigInt(n % 64)
  if (shift === 0n) return x & MASK64
  return ((x << shift) | (x >> (64n - shift))) & MASK64
}

// Round constants generated via FIPS 202 Algorithm 5/6 (LFSR-based), not a
// hand-transcribed table — avoids silent transcription errors in 24 hex constants.
function generateRoundConstants(): bigint[] {
  function rc(t: number): number {
    if (t % 255 === 0) return 1
    let R = [1, 0, 0, 0, 0, 0, 0, 0]
    for (let i = 1; i <= t % 255; i++) {
      R = [0, ...R]
      R[0] ^= R[8]
      R[4] ^= R[8]
      R[5] ^= R[8]
      R[6] ^= R[8]
      R = R.slice(0, 8)
    }
    return R[0]
  }
  const RC: bigint[] = []
  for (let round = 0; round < 24; round++) {
    let val = 0n
    for (let j = 0; j <= 6; j++) {
      if (rc(j + 7 * round)) {
        val |= 1n << ((1n << BigInt(j)) - 1n)
      }
    }
    RC.push(val)
  }
  return RC
}

// Rho rotation offsets generated via the standard Keccak spec recurrence,
// not a hand-transcribed table.
function generateRhoOffsets(): number[][] {
  const off = Array.from({ length: 5 }, () => new Array(5).fill(0))
  let x = 1
  let y = 0
  for (let t = 0; t < 24; t++) {
    off[x][y] = Number((BigInt((t + 1) * (t + 2)) / 2n) % 64n)
    const newX = y
    const newY = (2 * x + 3 * y) % 5
    x = newX
    y = newY
  }
  return off
}

const ROUND_CONSTANTS = generateRoundConstants()
const RHO_OFFSETS = generateRhoOffsets()

// state[x + 5*y] holds lane (x,y). Mutates state in place.
function keccakF1600(state: BigUint64Array, steps?: CipherStep[], stepLabelPrefix?: string): void {
  for (let round = 0; round < 24; round++) {
    // Theta: XOR each column's parity into every lane in that column's neighbors
    const C = new Array<bigint>(5)
    for (let x = 0; x < 5; x++) {
      C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20]
    }
    const D = new Array<bigint>(5)
    for (let x = 0; x < 5; x++) {
      D[x] = C[(x + 4) % 5] ^ rotl64(C[(x + 1) % 5], 1)
    }
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        state[x + 5 * y] ^= D[x]
      }
    }

    // Rho (rotate each lane) + Pi (permute lane positions), combined
    const B = new BigUint64Array(25)
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const newX = y
        const newY = (2 * x + 3 * y) % 5
        B[newX + 5 * newY] = rotl64(state[x + 5 * y], RHO_OFFSETS[x][y])
      }
    }

    // Chi: nonlinear mixing within each row
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        state[x + 5 * y] = B[x + 5 * y] ^ (~B[(x + 1) % 5 + 5 * y] & MASK64 & B[(x + 2) % 5 + 5 * y])
      }
    }

    // Iota: XOR the round constant into lane (0,0) to break symmetry
    state[0] ^= ROUND_CONSTANTS[round]

    if (steps) {
      steps.push({
        index: steps.length,
        label: `${stepLabelPrefix ?? 'Permutation'} — round ${round + 1}/24`,
        inputState: '',
        outputState: '',
        table: [{ key: 'Lane (0,0) after iota', value: '0x' + state[0].toString(16).padStart(16, '0') }],
        note: 'theta -> rho -> pi -> chi -> iota applied to the 1600-bit state.',
      })
    }
  }
}

function padTenOne(inputBytes: Uint8Array): Uint8Array {
  const numBlocks = Math.floor(inputBytes.length / RATE_BYTES) + 1
  const paddedLen = numBlocks * RATE_BYTES
  const padded = new Uint8Array(paddedLen)
  padded.set(inputBytes, 0)
  padded[inputBytes.length] ^= 0x06 // SHA-3 domain separator (01 appended, then pad10*1)
  padded[paddedLen - 1] ^= 0x80
  return padded
}

function sha3Fast(inputBytes: Uint8Array): string {
  return fromByteArray(sha3_256(inputBytes), 'hex')
}

function sha3Instrumented(inputBytes: Uint8Array): CipherResult {
  const start = performance.now()
  const steps: CipherStep[] = []

  const padded = padTenOne(inputBytes)
  const numBlocks = padded.length / RATE_BYTES

  steps.push({
    index: 0,
    label: 'Padding (pad10*1 with SHA-3 domain separator)',
    inputState: fromByteArray(inputBytes, 'hex'),
    outputState: fromByteArray(padded, 'hex'),
    table: [
      { key: 'Original length', value: `${inputBytes.length} bytes` },
      { key: 'Rate (block size)', value: `${RATE_BYTES} bytes (1088 bits)` },
      { key: 'Padded length', value: `${padded.length} bytes` },
    ],
    note: 'Appended 0x06 domain-separator byte, zero-padded, and set the top bit of the last byte (0x80) to close the padding.',
    isMilestone: true,
  })

  const state = new BigUint64Array(25)
  for (let b = 0; b < numBlocks; b++) {
    const block = padded.slice(b * RATE_BYTES, (b + 1) * RATE_BYTES)
    for (let i = 0; i < RATE_BYTES; i++) {
      const laneIdx = Math.floor(i / 8)
      const byteIdx = i % 8
      state[laneIdx] ^= BigInt(block[i]) << (8n * BigInt(byteIdx))
    }
    steps.push({
      index: steps.length,
      label: `Absorb block ${b + 1}/${numBlocks}`,
      inputState: fromByteArray(block, 'hex'),
      outputState: '',
      note: 'XORed this rate-sized block into the first 136 bytes of the 1600-bit state.',
      isMilestone: true,
    })
    // Only the first block's permutation is traced round-by-round to stay
    // within the visualizer's step budget for long inputs.
    keccakF1600(state, b === 0 ? steps : undefined, 'Keccak-f[1600]')
  }

  const outBytes = new Uint8Array(OUTPUT_BYTES)
  for (let i = 0; i < OUTPUT_BYTES; i++) {
    const laneIdx = Math.floor(i / 8)
    const byteIdx = i % 8
    outBytes[i] = Number((state[laneIdx] >> (8n * BigInt(byteIdx))) & 0xffn)
  }
  const outputHex = fromByteArray(outBytes, 'hex')

  steps.push({
    index: steps.length,
    label: 'Squeeze final digest',
    inputState: '',
    outputState: outputHex,
    note: 'Read the first 32 bytes (256 bits) of the state as the digest.',
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

export function encrypt(input: string, key: string = '', options: CipherOptions = {}): CipherResult {
  if (input === null || input === undefined || typeof input !== 'string') {
    throw new CipherError('INPUT_REQUIRED', 'Input is required.')
  }
  const byteLength = new TextEncoder().encode(input).length
  if (byteLength > 2 * 1024 * 1024) {
    throw new CipherError('INPUT_TOO_LONG', `Input exceeds maximum size of 2MB (got ${byteLength}).`)
  }
  const inputBytes = toByteArray(input, options.encoding || 'utf8')

  if (options.instrument) {
    return sha3Instrumented(inputBytes)
  }

  const start = performance.now()
  const output = sha3Fast(inputBytes)
  return {
    output,
    outputEncoding: 'hex',
    steps: [],
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function decrypt(): CipherResult {
  throw new CipherError(
    'ALGORITHM_UNSUPPORTED',
    'One-way cryptographic hash functions do not support decryption.'
  )
}
