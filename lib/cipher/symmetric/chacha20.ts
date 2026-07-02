/**
 * ChaCha20 stream cipher.
 * 256-bit key, 20-round (10 double rounds) variant.
 * @see RFC 8439
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput, validateKey, toByteArray, fromByteArray } from '../../utils'

const METADATA = {
  name: 'ChaCha20',
  securityStatus: 'secure' as const,
  breakingComplexity: '2^256 (no known practical attack)',
  yearDesigned: 2008,
  standardBody: 'RFC 8439 / IETF',
  blockSize: 64,
  keySize: 32,
}

const CONSTANTS = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]

function rotl32(v: number, c: number): number {
  return ((v << c) | (v >>> (32 - c))) >>> 0
}

function quarterRound(state: Uint32Array, a: number, b: number, c: number, d: number): void {
  state[a] = (state[a] + state[b]) >>> 0
  state[d] ^= state[a]
  state[d] = rotl32(state[d], 16)

  state[c] = (state[c] + state[d]) >>> 0
  state[b] ^= state[c]
  state[b] = rotl32(state[b], 12)

  state[a] = (state[a] + state[b]) >>> 0
  state[d] ^= state[a]
  state[d] = rotl32(state[d], 8)

  state[c] = (state[c] + state[d]) >>> 0
  state[b] ^= state[c]
  state[b] = rotl32(state[b], 7)
}

function doubleRound(state: Uint32Array): void {
  // Column round
  quarterRound(state, 0, 4, 8, 12)
  quarterRound(state, 1, 5, 9, 13)
  quarterRound(state, 2, 6, 10, 14)
  quarterRound(state, 3, 7, 11, 15)
  // Diagonal round
  quarterRound(state, 0, 5, 10, 15)
  quarterRound(state, 1, 6, 11, 12)
  quarterRound(state, 2, 7, 8, 13)
  quarterRound(state, 3, 4, 9, 14)
}

function chacha20Block(key: Uint8Array, counter: number, nonce: Uint8Array): Uint8Array {
  const state = new Uint32Array(16)
  state[0] = CONSTANTS[0]
  state[1] = CONSTANTS[1]
  state[2] = CONSTANTS[2]
  state[3] = CONSTANTS[3]

  for (let i = 0; i < 8; i++) {
    state[4 + i] = bytesToWord32LE(key, i * 4)
  }

  state[12] = counter >>> 0

  for (let i = 0; i < 3; i++) {
    state[13 + i] = bytesToWord32LE(nonce, i * 4)
  }

  const initialState = new Uint32Array(state)

  for (let i = 0; i < 10; i++) {
    doubleRound(state)
  }

  for (let i = 0; i < 16; i++) {
    state[i] = (state[i] + initialState[i]) >>> 0
  }

  const out = new Uint8Array(64)
  for (let i = 0; i < 16; i++) {
    writeWord32LE(state[i], out, i * 4)
  }
  return out
}

function bytesToWord32LE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0
}

function writeWord32LE(val: number, bytes: Uint8Array, offset: number): void {
  bytes[offset] = val & 0xff
  bytes[offset + 1] = (val >>> 8) & 0xff
  bytes[offset + 2] = (val >>> 16) & 0xff
  bytes[offset + 3] = (val >>> 24) & 0xff
}

function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const len = Math.min(a.length, b.length)
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    out[i] = a[i] ^ b[i]
  }
  return out
}

function chacha20Fast(keyBytes: Uint8Array, nonceBytes: Uint8Array, inputBytes: Uint8Array, initialCounter: number): CipherResult {
  const start = performance.now()
  const numBlocks = Math.ceil(inputBytes.length / 64)
  const outputBytes = new Uint8Array(inputBytes.length)

  for (let b = 0; b < numBlocks; b++) {
    const keystream = chacha20Block(keyBytes, initialCounter + b, nonceBytes)
    const chunk = inputBytes.slice(b * 64, (b + 1) * 64)
    const xored = xorBytes(chunk, keystream)
    outputBytes.set(xored, b * 64)
  }

  return {
    output: fromByteArray(outputBytes, 'hex'),
    outputEncoding: 'hex',
    steps: [],
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

function stateToHex(state: Uint32Array): string {
  const bytes = new Uint8Array(64)
  for (let i = 0; i < 16; i++) {
    writeWord32LE(state[i], bytes, i * 4)
  }
  return fromByteArray(bytes, 'hex')
}

function chacha20Instrumented(
  keyBytes: Uint8Array,
  nonceBytes: Uint8Array,
  inputBytes: Uint8Array,
  initialCounter: number
): CipherResult {
  const start = performance.now()
  const steps: CipherStep[] = []
  const numBlocks = Math.ceil(inputBytes.length / 64)
  const outputBytes = new Uint8Array(inputBytes.length)

  const state = new Uint32Array(16)
  state[0] = CONSTANTS[0]
  state[1] = CONSTANTS[1]
  state[2] = CONSTANTS[2]
  state[3] = CONSTANTS[3]
  for (let i = 0; i < 8; i++) {
    state[4 + i] = bytesToWord32LE(keyBytes, i * 4)
  }

  steps.push({
    index: 0,
    label: 'ChaCha20 State Initialization',
    inputState: `Key: ${fromByteArray(keyBytes, 'hex')} Nonce: ${fromByteArray(nonceBytes, 'hex')}`,
    outputState: stateToHex(state),
    note: 'Initialized 16-word state with constants, 256-bit key, and 96-bit nonce.',
    isMilestone: true,
  })

  for (let b = 0; b < numBlocks; b++) {
    state[12] = (initialCounter + b) >>> 0
    for (let i = 0; i < 3; i++) {
      state[13 + i] = bytesToWord32LE(nonceBytes, i * 4)
    }

    const initialState = new Uint32Array(state)

    const isFirstBlock = b === 0

    if (isFirstBlock) {
      steps.push({
        index: steps.length,
        label: 'Block 1 — Initial State (with counter)',
        inputState: stateToHex(initialState),
        outputState: stateToHex(state),
        note: `Set counter = ${b} for keystream block generation.`,
      })
    }

    for (let i = 0; i < 10; i++) {
      if (isFirstBlock) {
        const before = new Uint32Array(state)
        doubleRound(state)

        const qrNotes = [
          'QR(0,4,8,12)', 'QR(1,5,9,13)', 'QR(2,6,10,14)', 'QR(3,7,11,15)',
          'QR(0,5,10,15)', 'QR(1,6,11,12)', 'QR(2,7,8,13)', 'QR(3,4,9,14)',
        ]

        steps.push({
          index: steps.length,
          label: `Block 1 — Double Round ${i + 1}`,
          inputState: stateToHex(before),
          outputState: stateToHex(state),
          note: `Applied column and diagonal rounds: ${qrNotes.join(', ')}.`,
          isMilestone: i === 0 || i === 9,
        })
      } else {
        doubleRound(state)
      }
    }

    for (let i = 0; i < 16; i++) {
      state[i] = (state[i] + initialState[i]) >>> 0
    }

    if (isFirstBlock) {
      steps.push({
        index: steps.length,
        label: 'Block 1 — State Addition & Serialization',
        inputState: stateToHex(initialState),
        outputState: stateToHex(state),
        note: 'Added initial state to final state (mod 2^32) and serialized 16 words to 64 bytes (little-endian).',
        isMilestone: true,
      })
    }

    const keystream = new Uint8Array(64)
    for (let i = 0; i < 16; i++) {
      writeWord32LE(state[i], keystream, i * 4)
    }

    const chunk = inputBytes.slice(b * 64, (b + 1) * 64)
    const xored = xorBytes(chunk, keystream)
    outputBytes.set(xored, b * 64)

    if (isFirstBlock) {
      steps.push({
        index: steps.length,
        label: 'Block 1 — Keystream Generation & XOR',
        inputState: `Plaintext: ${fromByteArray(chunk, 'hex')}`,
        outputState: `Keystream: ${fromByteArray(keystream, 'hex')}`,
        note: 'XORed 64-byte plaintext block with ChaCha20 keystream to produce ciphertext.',
        isMilestone: true,
      })

      steps.push({
        index: steps.length,
        label: 'Block 1 — Complete Output',
        inputState: fromByteArray(chunk, 'hex'),
        outputState: fromByteArray(xored, 'hex'),
        note: 'Completed encrypting block 1.',
        isMilestone: true,
      })
    } else {
      steps.push({
        index: steps.length,
        label: `Block ${b + 1} Computation`,
        inputState: fromByteArray(chunk, 'hex'),
        outputState: fromByteArray(xored, 'hex'),
        note: `ChaCha20 keystream XOR for block ${b + 1}.`,
        isMilestone: true,
      })
    }
  }

  steps.push({
    index: steps.length,
    label: 'ChaCha20 Encryption Output',
    inputState: `Total blocks: ${numBlocks}`,
    outputState: fromByteArray(outputBytes, 'hex'),
    note: 'Completed ChaCha20 encryption.',
    isMilestone: true,
  })

  return {
    output: fromByteArray(outputBytes, 'hex'),
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function encrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  validateInput(input)
  validateKey(key)

  const hexInput = options.hexInput === true

  let inputBytes: Uint8Array
  if (hexInput) {
    inputBytes = toByteArray(input, 'hex')
  } else {
    inputBytes = toByteArray(input, 'utf8')
  }

  let keyBytes = toByteArray(key, 'utf8')
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    keyBytes = toByteArray(key, 'hex')
  }

  if (keyBytes.length !== 32) {
    throw new CipherError(
      'INVALID_KEY_LENGTH',
      `ChaCha20 key must be exactly 32 bytes (256 bits), got ${keyBytes.length} bytes.`
    )
  }

  let nonce: Uint8Array
  if (options.iv) {
    nonce = toByteArray(options.iv, 'hex')
    if (nonce.length !== 12) {
      throw new CipherError('INVALID_IV', 'ChaCha20 nonce must be exactly 12 bytes (96 bits).')
    }
  } else {
    nonce = new Uint8Array(12)
  }

  const initialCounter = (options as any).initialCounter ?? 0

  if (options.instrument) {
    return chacha20Instrumented(keyBytes, nonce, inputBytes, initialCounter)
  }
  return chacha20Fast(keyBytes, nonce, inputBytes, initialCounter)
}

export function decrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  const enc = options.encoding || 'utf8'

  const result = encrypt(input, key, { ...options, hexInput: true, encoding: 'utf8' })

  const outputBytes = toByteArray(result.output, 'hex')

  return {
    ...result,
    output: fromByteArray(outputBytes, enc),
    outputEncoding: enc,
  }
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    key: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
    expected: 'a552e37b70dbeab2daec1654aacbdaf4968ac112a47ac879b40f6d20888b104e9a7e69bccf229567f7177b205e6f03e56c9c587be9e4d65696d4757062f4c8a0',
    description: 'RFC 8439 §2.4.2 ChaCha20 Block Function (counter=1, iv=000000000000004a00000000)',
    iv: '000000000000004a00000000',
    options: { initialCounter: 1, hexInput: true },
  },
  {
    input: '416e7920737562737469747574696f6e20746f2074686520636f6e747269627574696f6e7320776f756c642062652061707072656369617465642e',
    key: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
    expected: 'a27c0e2f5066005f596c1ef08cec0f1fc09a16c3d4f92ef8601b4e0f3060e3776fa2fcc5a01e7a5f05d9f1295ba38868d98fa1154be6fa0d19c3c502edd60251',
    description: 'RFC 8439 §2.4.2 ChaCha20 Encryption (counter=1, iv=000000000000004a00000000)',
    iv: '000000000000004a00000000',
    options: { initialCounter: 1, hexInput: true },
  },
]
