/**
 * ChaCha20 — RFC 8439 ARX stream cipher.
 * @see CIPHER_ENGINE.md section "ChaCha20"
 *
 * 4x4 matrix of 32-bit words: 4 constants, 8 key words, a 32-bit block
 * counter, and 3 nonce words. 20 rounds (10 "double rounds": 4 column
 * quarter-rounds + 4 diagonal quarter-rounds) of add-rotate-XOR mixing
 * produce a keystream block, which is added back to the initial state
 * and XORed with the plaintext. Encryption and decryption are the same
 * operation (XOR with keystream).
 *
 * The block function's correctness was verified against the audited
 * @noble/ciphers implementation for the RFC 8439 test vectors before
 * this file was written (see PR description / issue for the byte-for-byte
 * comparison); it does not depend on @noble/ciphers at runtime.
 */

import { CipherError, validateInput, toByteArray, fromByteArray } from '../../utils'
import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'

const METADATA = {
  name: 'ChaCha20',
  keySize: 256,
  blockSize: 64,
  rounds: 20,
  securityStatus: 'secure' as const,
  yearDesigned: 2008,
  standardBody: 'RFC 8439',
}

const CONSTANTS = new Uint32Array([0x61707865, 0x3320646e, 0x79622d32, 0x6b206574])

function rotl32(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0
}

function add32(a: number, b: number): number {
  return (a + b) >>> 0
}

function quarterRound(state: Uint32Array, a: number, b: number, c: number, d: number): void {
  state[a] = add32(state[a], state[b]); state[d] ^= state[a]; state[d] = rotl32(state[d], 16)
  state[c] = add32(state[c], state[d]); state[b] ^= state[c]; state[b] = rotl32(state[b], 12)
  state[a] = add32(state[a], state[b]); state[d] ^= state[a]; state[d] = rotl32(state[d], 8)
  state[c] = add32(state[c], state[d]); state[b] ^= state[c]; state[b] = rotl32(state[b], 7)
}

function bytesToWordsLE(bytes: Uint8Array): Uint32Array {
  const words = new Uint32Array(bytes.length / 4)
  for (let i = 0; i < words.length; i++) {
    words[i] = bytes[i * 4] | (bytes[i * 4 + 1] << 8) | (bytes[i * 4 + 2] << 16) | (bytes[i * 4 + 3] << 24)
  }
  return words
}

function wordsToBytesLE(words: Uint32Array | number[]): Uint8Array {
  const bytes = new Uint8Array(words.length * 4)
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    bytes[i * 4] = w & 0xff
    bytes[i * 4 + 1] = (w >>> 8) & 0xff
    bytes[i * 4 + 2] = (w >>> 16) & 0xff
    bytes[i * 4 + 3] = (w >>> 24) & 0xff
  }
  return bytes
}

function initState(keyWords: Uint32Array, counter: number, nonceWords: Uint32Array): Uint32Array {
  const state = new Uint32Array(16)
  state.set(CONSTANTS, 0)
  state.set(keyWords, 4)
  state[12] = counter >>> 0
  state.set(nonceWords, 13)
  return state
}

function chacha20Block(state: Uint32Array): Uint32Array {
  const working = Uint32Array.from(state)
  for (let round = 0; round < 10; round++) {
    quarterRound(working, 0, 4, 8, 12)
    quarterRound(working, 1, 5, 9, 13)
    quarterRound(working, 2, 6, 10, 14)
    quarterRound(working, 3, 7, 11, 15)
    quarterRound(working, 0, 5, 10, 15)
    quarterRound(working, 1, 6, 11, 12)
    quarterRound(working, 2, 7, 8, 13)
    quarterRound(working, 3, 4, 9, 14)
  }
  const out = new Uint32Array(16)
  for (let i = 0; i < 16; i++) out[i] = add32(working[i], state[i])
  return out
}

function chacha20BlockInstrumented(state: Uint32Array, steps: CipherStep[], blockIndex: number): Uint32Array {
  const working = Uint32Array.from(state)
  const toHexRows = (s: Uint32Array): string[][] =>
    [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => '0x' + s[r * 4 + c].toString(16).padStart(8, '0')))

  steps.push({
    index: steps.length,
    label: `Block ${blockIndex} — initial state`,
    inputState: '',
    outputState: '',
    matrix: toHexRows(state),
    note: 'Row 0: constants. Rows 1-2: key. Row 3: counter + nonce.',
    isMilestone: true,
  })

  const rounds: [number, number, number, number][][] = [
    [[0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15]],
    [[0, 5, 10, 15], [1, 6, 11, 12], [2, 7, 8, 13], [3, 4, 9, 14]],
  ]
  for (let round = 0; round < 10; round++) {
    for (const group of rounds) {
      for (const [a, b, c, d] of group) {
        quarterRound(working, a, b, c, d)
      }
    }
    if (round === 0 || round === 9) {
      steps.push({
        index: steps.length,
        label: `Block ${blockIndex} — double-round ${round + 1}/10`,
        inputState: '',
        outputState: '',
        matrix: toHexRows(working),
        note: '4 column quarter-rounds + 4 diagonal quarter-rounds (add-rotate-XOR).',
      })
    }
  }

  const out = new Uint32Array(16)
  for (let i = 0; i < 16; i++) out[i] = add32(working[i], state[i])
  steps.push({
    index: steps.length,
    label: `Block ${blockIndex} — add initial state (keystream ready)`,
    inputState: '',
    outputState: '',
    matrix: toHexRows(out),
    note: 'Added the initial state back into the mixed state to produce this 64-byte keystream block.',
    isMilestone: true,
  })

  return out
}

interface ParsedKey {
  keyWords: Uint32Array
  nonceWords: Uint32Array
  counter: number
}

function parseKey(key: string): ParsedKey {
  if (!key) {
    throw new CipherError('INVALID_KEY', 'ChaCha20 requires a 32-byte (64 hex char) key.')
  }
  const [keyPart, nonceCounterPart] = key.split('|')
  if (!/^[0-9a-fA-F]{64}$/.test(keyPart)) {
    throw new CipherError('INVALID_KEY_LENGTH', `Key must be exactly 32 bytes (64 hex characters), got ${keyPart.length} hex characters.`)
  }
  if (!nonceCounterPart) {
    throw new CipherError('INVALID_KEY', 'ChaCha20 key must include a nonce: "key|nonce" or "key|nonce:counter" (nonce = 12 bytes / 24 hex chars).')
  }
  const [noncePart, counterPart] = nonceCounterPart.split(':')
  if (!/^[0-9a-fA-F]{24}$/.test(noncePart)) {
    throw new CipherError('INVALID_KEY_LENGTH', `Nonce must be exactly 12 bytes (24 hex characters), got ${noncePart.length} hex characters.`)
  }
  const counter = counterPart ? parseInt(counterPart, 10) : 0
  if (!Number.isInteger(counter) || counter < 0) {
    throw new CipherError('INVALID_KEY', 'Counter must be a non-negative integer.')
  }
  return {
    keyWords: bytesToWordsLE(toByteArray(keyPart, 'hex')),
    nonceWords: bytesToWordsLE(toByteArray(noncePart, 'hex')),
    counter,
  }
}

function chacha20Core(input: string, key: string, options: CipherOptions, instrument: boolean): CipherResult {
  const start = performance.now()
  const { keyWords, nonceWords, counter } = parseKey(key)
  const inputBytes = toByteArray(input, options.encoding || 'utf8')

  const steps: CipherStep[] = []
  const outputBytes = new Uint8Array(inputBytes.length)
  const numBlocks = Math.ceil(inputBytes.length / 64) || 0

  for (let b = 0; b < numBlocks; b++) {
    const state = initState(keyWords, counter + b, nonceWords)
    const keystreamWords = instrument ? chacha20BlockInstrumented(state, steps, b + 1) : chacha20Block(state)
    const keystreamBytes = wordsToBytesLE(keystreamWords)
    const offset = b * 64
    const blockLen = Math.min(64, inputBytes.length - offset)
    for (let i = 0; i < blockLen; i++) {
      outputBytes[offset + i] = inputBytes[offset + i] ^ keystreamBytes[i]
    }
  }

  return {
    output: fromByteArray(outputBytes, 'hex'),
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

/**
 * Encrypt cipher-engine utility export.
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
  validateInput(input)
  return chacha20Core(input, key, options, !!options.instrument)
}

/**
 * Decrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Decrypt operation.
 * @param key Input required by the Decrypt operation.
 * @param options Input required by the Decrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  const { keyWords, nonceWords, counter } = parseKey(key)
  const inputBytes = toByteArray(input, 'hex')

  const steps: CipherStep[] = []
  const outputBytes = new Uint8Array(inputBytes.length)
  const numBlocks = Math.ceil(inputBytes.length / 64) || 0
  const instrument = !!options.instrument

  for (let b = 0; b < numBlocks; b++) {
    const state = initState(keyWords, counter + b, nonceWords)
    const keystreamWords = instrument ? chacha20BlockInstrumented(state, steps, b + 1) : chacha20Block(state)
    const keystreamBytes = wordsToBytesLE(keystreamWords)
    const offset = b * 64
    const blockLen = Math.min(64, inputBytes.length - offset)
    for (let i = 0; i < blockLen; i++) {
      outputBytes[offset + i] = inputBytes[offset + i] ^ keystreamBytes[i]
    }
  }

  const start = performance.now()
  return {
    output: fromByteArray(outputBytes, options.encoding || 'utf8'),
    outputEncoding: options.encoding || 'utf8',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

/**
 * TEST VECTORS cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: 'Hello, ChaCha20!',
    key: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f|000000000000004a00000000:0',
    expected: 'e760722cd48c150ae953d9e80b263e8e',
    description: 'Default counter=0 vector (cross-checked against @noble/ciphers)',
  },
  {
    input: "Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it.",
    key: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f|000000000000004a00000000:1',
    expected:
      '6e2e359a2568f98041ba0728dd0d6981e97e7aec1d4360c20a27afccfd9fae0bf91b65c5524733ab8f593dabcd62b3571639d624e65152ab8f530c359f0861d807ca0dbf500d6a6156a38e088a22b65e52bc514d16ccf806818ce91ab77937365af90bbf74a35be6b40b8eedf2785e42874d',
    description: 'RFC 8439 Section 2.4.2 official "sunscreen" test vector, counter=1',
  },
]
