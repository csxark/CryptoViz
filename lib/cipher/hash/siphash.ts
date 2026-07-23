/**
 * SipHash-c-d keyed hash function (PRF) implementation.
 * Used for educational visualization.
 * 
 * SipHash is a family of pseudorandom functions designed for high performance
 * on short inputs, using a 128-bit key and 64-bit state registers.
 * Default is SipHash-2-4 (c=2 compression rounds, d=4 finalization rounds).
 */

import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, TestVector, CipherOptions } from '../types'

const METADATA: CipherMetadata = {
  name: 'SipHash',
  blockSize: 8, // 64 bits
  rounds: 6, // 2 compression + 4 finalization (default c=2, d=4)
  securityStatus: 'secure',
  yearDesigned: 2012,
  standardBody: 'Aumasson & Bernstein',
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '',
    key: '000102030405060708090a0b0c0d0e0f',
    expected: '310e0edd47db6f72',
    description: 'Official SipHash-2-4 vector for empty input',
  },
  {
    input: 'abc',
    key: '000102030405060708090a0b0c0d0e0f',
    expected: 'a50720aa53fabc5d',
    description: 'Official SipHash-2-4 vector for "abc"',
  },
]

function rotl(x: bigint, n: number): bigint {
  const bigN = BigInt(n)
  return ((x << bigN) | (x >> (64n - bigN))) & 0xffffffffffffffffn
}

function sipRound(state: { v0: bigint; v1: bigint; v2: bigint; v3: bigint }): void {
  state.v0 = (state.v0 + state.v1) & 0xffffffffffffffffn
  state.v1 = rotl(state.v1, 13) ^ state.v0
  state.v0 = rotl(state.v0, 32)
  
  state.v2 = (state.v2 + state.v3) & 0xffffffffffffffffn
  state.v3 = rotl(state.v3, 16) ^ state.v2
  
  state.v0 = (state.v0 + state.v3) & 0xffffffffffffffffn
  state.v3 = rotl(state.v3, 21) ^ state.v0
  
  state.v2 = (state.v2 + state.v1) & 0xffffffffffffffffn
  state.v1 = rotl(state.v1, 17) ^ state.v2
  
  state.v2 = rotl(state.v2, 32)
}

function bigintToLeHex(val: bigint): string {
  let hex = ''
  for (let i = 0; i < 8; i++) {
    const byte = Number((val >> BigInt(i * 8)) & 0xffn)
    hex += byte.toString(16).padStart(2, '0')
  }
  return hex
}

function bigintToHex(val: bigint): string {
  return val.toString(16).padStart(16, '0')
}

export function validateHashInput(input: unknown): asserts input is string {
  if (input === null || input === undefined) {
    throw new CipherError('INPUT_REQUIRED', 'Input is required.')
  }
  if (typeof input !== 'string') {
    throw new CipherError('INPUT_REQUIRED', 'Input must be a string.')
  }
  const byteLength = new TextEncoder().encode(input).length
  if (byteLength > 2 * 1024 * 1024) {
    throw new CipherError('INPUT_TOO_LONG', `Input exceeds maximum size of 2MB (got ${byteLength}).`)
  }
}

export function encrypt(
  input: string,
  key: string = '',
  options: CipherOptions & { cRounds?: number; dRounds?: number } = {}
): CipherResult {
  validateHashInput(input)

  let keyBytes: Uint8Array
  if (!key) {
    throw new CipherError('INVALID_KEY', 'SipHash key is required.')
  }
  if (key.length === 32 && /^[0-9a-fA-F]+$/.test(key)) {
    keyBytes = toByteArray(key, 'hex')
  } else {
    keyBytes = toByteArray(key, 'utf8')
  }

  if (keyBytes.length !== 16) {
    throw new CipherError(
      'INVALID_KEY_LENGTH',
      `SipHash key must be exactly 16 bytes (128 bits). Got ${keyBytes.length} bytes. Provide either a 16-character ASCII string or a 32-character hex string.`
    )
  }

  const cRounds = options.cRounds ?? 2
  const dRounds = options.dRounds ?? 4

  const start = performance.now()
  const inputBytes = toByteArray(input, options.encoding || 'utf8')

  // Read keys as 64-bit little endian
  const keyView = new DataView(keyBytes.buffer, keyBytes.byteOffset, keyBytes.byteLength)
  const k0 = keyView.getBigUint64(0, true)
  const k1 = keyView.getBigUint64(8, true)

  if (options.instrument) {
    return siphashInstrumented(inputBytes, k0, k1, cRounds, dRounds, start)
  }

  // Fast implementation
  let v0 = k0 ^ 0x736f6d6570736575n
  let v1 = k1 ^ 0x646f72616e646f6dn
  let v2 = k0 ^ 0x6c7967656e657261n
  let v3 = k1 ^ 0x7465646279746573n

  const numBlocks = Math.floor(inputBytes.length / 8)
  const blocks: bigint[] = []
  for (let i = 0; i < numBlocks; i++) {
    const offset = i * 8
    const blockView = new DataView(inputBytes.buffer, inputBytes.byteOffset + offset, 8)
    blocks.push(blockView.getBigUint64(0, true))
  }

  // Final block padding
  const finalBlockBytes = new Uint8Array(8)
  const rem = inputBytes.length % 8
  const offset = numBlocks * 8
  for (let i = 0; i < rem; i++) {
    finalBlockBytes[i] = inputBytes[offset + i]
  }
  finalBlockBytes[7] = inputBytes.length & 0xff
  const finalBlockVal = new DataView(finalBlockBytes.buffer).getBigUint64(0, true)
  blocks.push(finalBlockVal)

  const state = { v0, v1, v2, v3 }

  // Compression
  for (const m of blocks) {
    state.v3 ^= m
    for (let r = 0; r < cRounds; r++) {
      sipRound(state)
    }
    state.v0 ^= m
  }

  // Finalization
  state.v2 ^= 0xffn
  for (let r = 0; r < dRounds; r++) {
    sipRound(state)
  }

  const hash = state.v0 ^ state.v1 ^ state.v2 ^ state.v3
  const output = bigintToLeHex(hash)

  return {
    output,
    outputEncoding: 'hex',
    steps: [],
    metadata: {
      ...METADATA,
      rounds: cRounds + dRounds,
      modeOfOperation: `SipHash-${cRounds}-${dRounds}`,
    },
    durationMs: performance.now() - start,
  }
}

export function decrypt(
  _input?: string,
  _key: string = '',
  _options: CipherOptions = {}
): CipherResult {
  throw new CipherError(
    'ALGORITHM_UNSUPPORTED',
    'SipHash is a one-way pseudorandom function (hash). Decryption/reversal is mathematically impossible.'
  )
}

function siphashInstrumented(
  inputBytes: Uint8Array,
  k0: bigint,
  k1: bigint,
  cRounds: number,
  dRounds: number,
  startTime: number
): CipherResult {
  const steps: CipherStep[] = []
  let stepIndex = 0

  // 1. Initial State Setup
  let v0 = k0 ^ 0x736f6d6570736575n
  let v1 = k1 ^ 0x646f72616e646f6dn
  let v2 = k0 ^ 0x6c7967656e657261n
  let v3 = k1 ^ 0x7465646279746573n

  steps.push({
    index: stepIndex++,
    label: 'State Initialization',
    sublabel: 'Set up v0-v3 state registers using key words k0 and k1',
    inputState: '',
    outputState: `v0:${bigintToHex(v0)} v1:${bigintToHex(v1)} v2:${bigintToHex(v2)} v3:${bigintToHex(v3)}`,
    table: [
      { key: 'Key word k0', value: `0x${bigintToHex(k0)}` },
      { key: 'Key word k1', value: `0x${bigintToHex(k1)}` },
      { key: 'Register v0 = k0 ⊕ 0x736f6d6570736575', value: `0x${bigintToHex(v0)}` },
      { key: 'Register v1 = k1 ⊕ 0x646f72616e646f6d', value: `0x${bigintToHex(v1)}` },
      { key: 'Register v2 = k0 ⊕ 0x6c7967656e657261', value: `0x${bigintToHex(v2)}` },
      { key: 'Register v3 = k1 ⊕ 0x7465646279746573', value: `0x${bigintToHex(v3)}` },
    ],
    note: `Initialized the 256-bit state variables v0-v3 by XORing 64-bit key slices k0 and k1 with the ASCII-based constants 'somepseu', 'domorand', 'lygenera', and 'tedbytes'.`,
    isMilestone: true,
  })

  // 2. Padding and Chunking
  const numBlocks = Math.floor(inputBytes.length / 8)
  const blocks: bigint[] = []
  for (let i = 0; i < numBlocks; i++) {
    const offset = i * 8
    const blockView = new DataView(inputBytes.buffer, inputBytes.byteOffset + offset, 8)
    blocks.push(blockView.getBigUint64(0, true))
  }

  const finalBlockBytes = new Uint8Array(8)
  const rem = inputBytes.length % 8
  const offset = numBlocks * 8
  for (let i = 0; i < rem; i++) {
    finalBlockBytes[i] = inputBytes[offset + i]
  }
  finalBlockBytes[7] = inputBytes.length & 0xff
  const finalBlockVal = new DataView(finalBlockBytes.buffer).getBigUint64(0, true)
  blocks.push(finalBlockVal)

  const blockHexStrings = blocks.map((b) => bigintToLeHex(b))
  steps.push({
    index: stepIndex++,
    label: 'Padding & Chunking',
    sublabel: 'Parse message into 8-byte little-endian blocks',
    inputState: fromByteArray(inputBytes, 'hex'),
    outputState: blockHexStrings.join(' | '),
    table: blocks.map((b, i) => ({
      key: `Block m_${i}${i === blocks.length - 1 ? ' (padded)' : ''}`,
      value: `0x${bigintToHex(b)} (${bigintToLeHex(b)})`,
    })),
    note: `The input is parsed into 8-byte words in little-endian format. The final block padding places the message length (modulo 256) in the last byte. Standard padding ensures inputs of different lengths result in different terminal blocks.`,
    isMilestone: true,
  })

  const state = { v0, v1, v2, v3 }

  // 3. Compression blocks
  for (let i = 0; i < blocks.length; i++) {
    const m = blocks[i]
    const mLeHex = bigintToLeHex(m)

    // Step 3.1: XOR block into v3
    const stateBeforeV3 = { ...state }
    state.v3 ^= m
    steps.push({
      index: stepIndex++,
      label: `Block m_${i} — Inject to v3`,
      sublabel: `v3 ⊕= m_${i}`,
      inputState: `v0:${bigintToHex(stateBeforeV3.v0)} v1:${bigintToHex(stateBeforeV3.v1)} v2:${bigintToHex(stateBeforeV3.v2)} v3:${bigintToHex(stateBeforeV3.v3)}`,
      outputState: `v0:${bigintToHex(state.v0)} v1:${bigintToHex(state.v1)} v2:${bigintToHex(state.v2)} v3:${bigintToHex(state.v3)}`,
      table: [
        { key: `Block word m_${i}`, value: `0x${bigintToHex(m)} (${mLeHex})` },
        { key: `v3 (before)`, value: `0x${bigintToHex(stateBeforeV3.v3)}` },
        { key: `v3 (after) = v3 ⊕ m_${i}`, value: `0x${bigintToHex(state.v3)}` },
      ],
      note: `XORed the message block m_${i} into register v3 to begin absorbing it into the internal state.`,
    })

    // Step 3.2: cRounds of SipRound
    for (let r = 0; r < cRounds; r++) {
      const stateBeforeRound = { ...state }
      sipRound(state)
      steps.push({
        index: stepIndex++,
        label: `Block m_${i} — SipRound ${r + 1}/${cRounds}`,
        sublabel: `Mixing internal state variables`,
        inputState: `v0:${bigintToHex(stateBeforeRound.v0)} v1:${bigintToHex(stateBeforeRound.v1)} v2:${bigintToHex(stateBeforeRound.v2)} v3:${bigintToHex(stateBeforeRound.v3)}`,
        outputState: `v0:${bigintToHex(state.v0)} v1:${bigintToHex(state.v1)} v2:${bigintToHex(state.v2)} v3:${bigintToHex(state.v3)}`,
        note: `Applied the Add-Rotate-Xor (ARX) permutation SipRound to mix the state:
- Add: v0 += v1; v2 += v3
- Rotate: v1 <<< 13; v3 <<< 16
- XOR: v1 ⊕= v0; v3 ⊕= v2
- Rotate: v0 <<< 32
- Add: v0 += v3; v2 += v1
- Rotate: v3 <<< 21; v1 <<< 17
- XOR: v3 ⊕= v0; v1 ⊕= v2
- Rotate: v2 <<< 32`,
      })
    }

    // Step 3.3: XOR block into v0
    const stateBeforeV0 = { ...state }
    state.v0 ^= m
    steps.push({
      index: stepIndex++,
      label: `Block m_${i} — Inject to v0`,
      sublabel: `v0 ⊕= m_${i}`,
      inputState: `v0:${bigintToHex(stateBeforeV0.v0)} v1:${bigintToHex(stateBeforeV0.v1)} v2:${bigintToHex(stateBeforeV0.v2)} v3:${bigintToHex(stateBeforeV0.v3)}`,
      outputState: `v0:${bigintToHex(state.v0)} v1:${bigintToHex(state.v1)} v2:${bigintToHex(state.v2)} v3:${bigintToHex(state.v3)}`,
      table: [
        { key: `Block word m_${i}`, value: `0x${bigintToHex(m)} (${mLeHex})` },
        { key: `v0 (before)`, value: `0x${bigintToHex(stateBeforeV0.v0)}` },
        { key: `v0 (after) = v0 ⊕ m_${i}`, value: `0x${bigintToHex(state.v0)}` },
      ],
      note: `XORed the message block m_${i} into register v0 to conclude the block compression step.`,
      isMilestone: true,
    })
  }

  // 4. Finalization setup
  const stateBeforeFinalize = { ...state }
  state.v2 ^= 0xffn
  steps.push({
    index: stepIndex++,
    label: 'Finalization Setup',
    sublabel: 'v2 ⊕= 0xff',
    inputState: `v0:${bigintToHex(stateBeforeFinalize.v0)} v1:${bigintToHex(stateBeforeFinalize.v1)} v2:${bigintToHex(stateBeforeFinalize.v2)} v3:${bigintToHex(stateBeforeFinalize.v3)}`,
    outputState: `v0:${bigintToHex(state.v0)} v1:${bigintToHex(state.v1)} v2:${bigintToHex(state.v2)} v3:${bigintToHex(state.v3)}`,
    table: [
      { key: 'v2 (before)', value: `0x${bigintToHex(stateBeforeFinalize.v2)}` },
      { key: 'v2 (after) = v2 ⊕ 0xff', value: `0x${bigintToHex(state.v2)}` },
    ],
    note: `XORed the constant 0xff into register v2 to prevent message extension attacks (absorbing subsequent blocks to reveal intermediate hash state).`,
  })

  // 5. Finalization rounds
  for (let r = 0; r < dRounds; r++) {
    const stateBeforeRound = { ...state }
    sipRound(state)
    steps.push({
      index: stepIndex++,
      label: `Finalization — SipRound ${r + 1}/${dRounds}`,
      sublabel: `Mixing internal state variables`,
      inputState: `v0:${bigintToHex(stateBeforeRound.v0)} v1:${bigintToHex(stateBeforeRound.v1)} v2:${bigintToHex(stateBeforeRound.v2)} v3:${bigintToHex(stateBeforeRound.v3)}`,
      outputState: `v0:${bigintToHex(state.v0)} v1:${bigintToHex(state.v1)} v2:${bigintToHex(state.v2)} v3:${bigintToHex(state.v3)}`,
      note: `Applied the Add-Rotate-Xor (ARX) permutation SipRound to finalize state mixing.`,
    })
  }

  // 6. Output reduction
  const hash = state.v0 ^ state.v1 ^ state.v2 ^ state.v3
  const output = bigintToLeHex(hash)
  steps.push({
    index: stepIndex++,
    label: 'Final Tag Generation',
    sublabel: 'Tag = v0 ⊕ v1 ⊕ v2 ⊕ v3',
    inputState: `v0:${bigintToHex(state.v0)} v1:${bigintToHex(state.v1)} v2:${bigintToHex(state.v2)} v3:${bigintToHex(state.v3)}`,
    outputState: output,
    table: [
      { key: 'Register v0', value: `0x${bigintToHex(state.v0)}` },
      { key: 'Register v1', value: `0x${bigintToHex(state.v1)}` },
      { key: 'Register v2', value: `0x${bigintToHex(state.v2)}` },
      { key: 'Register v3', value: `0x${bigintToHex(state.v3)}` },
      { key: 'XOR Output (64-bit)', value: `0x${bigintToHex(hash)}` },
      { key: 'Final Output (Little-Endian Hex)', value: output },
    ],
    note: `XORed all four state registers together (v0 ⊕ v1 ⊕ v2 ⊕ v3) to produce the final 64-bit hash digest, formatted as a little-endian hex string.`,
    isMilestone: true,
  })

  return {
    output,
    outputEncoding: 'hex',
    steps,
    metadata: {
      ...METADATA,
      rounds: cRounds + dRounds,
      modeOfOperation: `SipHash-${cRounds}-${dRounds}`,
    },
    durationMs: performance.now() - startTime,
  }
}
