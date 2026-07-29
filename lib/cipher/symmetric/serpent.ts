/**
 * Serpent — Anderson, Biham, Knudsen, 1998. AES finalist (runner-up),
 * widely regarded as having the largest security margin of the finalists.
 * 128-bit block, 128-bit key (this file), 32 rounds, 8 cycling S-boxes.
 * @see CIPHER_ENGINE.md Part 2 (Symmetric Ciphers) pattern
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
  name: 'Serpent',
  keySize: 128,
  blockSize: 128,
  rounds: 32,
  securityStatus: 'secure',
  breakingComplexity: 'No practical attack on the full 32-round cipher; largest security margin of the AES finalists',
  yearDesigned: 1998,
  standardBody: 'AES competition (finalist, runner-up)',
}

const PHI = 0x9e3779b9

/**
 * Official Serpent S-boxes S0..S7.
 * These are the 4-bit to 4-bit permutations used in the substitution layer.
 */
const SBOX: number[][] = [
  [3, 8, 15, 1, 10, 6, 5, 11, 14, 13, 4, 2, 7, 0, 9, 12],
  [15, 12, 2, 7, 9, 0, 5, 10, 1, 11, 14, 8, 6, 13, 3, 4],
  [8, 6, 7, 9, 3, 12, 10, 15, 13, 1, 14, 4, 0, 11, 5, 2],
  [0, 15, 11, 8, 12, 9, 6, 3, 13, 1, 2, 4, 10, 7, 5, 14],
  [1, 15, 8, 3, 12, 0, 11, 6, 2, 5, 4, 10, 9, 14, 7, 13],
  [15, 5, 2, 11, 4, 10, 9, 12, 0, 3, 14, 8, 13, 6, 7, 1],
  [7, 2, 12, 5, 8, 4, 6, 11, 14, 9, 1, 15, 13, 3, 10, 0],
  [1, 13, 15, 0, 14, 8, 2, 11, 7, 4, 12, 10, 9, 3, 5, 6],
]

/**
 * Inverse S-boxes derived from the forward S-boxes.
 */
const INV_SBOX: number[][] = SBOX.map(box => {
  const inv = new Array(16)
  box.forEach((v, i) => (inv[v] = i))
  return inv
})

function rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0
}

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0
}

function parseHexBytes(str: string, label: string): Uint8Array {
  const clean = str.replace(/\s+/g, '').toLowerCase()
  if (!/^[0-9a-f]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new CipherError('INVALID_INPUT', `${label} must be a hex string with an even number of digits.`)
  }
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}

function wordsToBytes(words: number[]): Uint8Array {
  const out = new Uint8Array(16)
  for (let i = 0; i < 4; i++) {
    out[i * 4] = words[i] & 0xff
    out[i * 4 + 1] = (words[i] >>> 8) & 0xff
    out[i * 4 + 2] = (words[i] >>> 16) & 0xff
    out[i * 4 + 3] = (words[i] >>> 24) & 0xff
  }
  return out
}

function bytesToWords(b: Uint8Array, off = 0): number[] {
  const words: number[] = []
  for (let i = 0; i < 4; i++) {
    words.push((b[off + i * 4] | (b[off + i * 4 + 1] << 8) | (b[off + i * 4 + 2] << 16) | (b[off + i * 4 + 3] << 24)) >>> 0)
  }
  return words
}

function applySBox(state: number[], boxIndex: number, inverse = false): number[] {
  const box = inverse ? INV_SBOX[boxIndex % 8] : SBOX[boxIndex % 8]
  const out = [0, 0, 0, 0]
  for (let nibble = 0; nibble < 32; nibble++) {
    const wordIdx = Math.floor(nibble / 8)
    const shift = (nibble % 8) * 4
    const val = (state[wordIdx] >>> shift) & 0xf
    out[wordIdx] |= box[val] << shift
  }
  return out.map(w => w >>> 0)
}

function linearTransform(x: number[]): number[] {
  let [x0, x1, x2, x3] = x
  x0 = rotl(x0, 13)
  x2 = rotl(x2, 3)
  x1 = (x1 ^ x0 ^ x2) >>> 0
  x3 = (x3 ^ x2 ^ ((x0 << 3) >>> 0)) >>> 0
  x1 = rotl(x1, 1)
  x3 = rotl(x3, 7)
  x0 = (x0 ^ x1 ^ x3) >>> 0
  x2 = (x2 ^ x3 ^ ((x1 << 7) >>> 0)) >>> 0
  x0 = rotl(x0, 5)
  x2 = rotl(x2, 22)
  return [x0, x1, x2, x3]
}

function inverseLinearTransform(x: number[]): number[] {
  let [x0, x1, x2, x3] = x
  x2 = rotr(x2, 22)
  x0 = rotr(x0, 5)
  x2 = (x2 ^ x3 ^ ((x1 << 7) >>> 0)) >>> 0
  x0 = (x0 ^ x1 ^ x3) >>> 0
  x3 = rotr(x3, 7)
  x1 = rotr(x1, 1)
  x3 = (x3 ^ x2 ^ ((x0 << 3) >>> 0)) >>> 0
  x1 = (x1 ^ x0 ^ x2) >>> 0
  x2 = rotr(x2, 3)
  x0 = rotr(x0, 13)
  return [x0, x1, x2, x3]
}

function keySchedule(keyBytes: Uint8Array): number[][] {
  const padded = new Uint8Array(32)
  padded.set(keyBytes)
  if (keyBytes.length < 32) {
    padded[keyBytes.length] = 0x01
  }
  
  const W: number[] = []
  const initialWords = bytesToWords(padded, 0).concat(bytesToWords(padded, 16))
  for (let i = 0; i < 8; i++) W.push(initialWords[i])

  for (let i = 8; i < 132; i++) {
    const val = W[i - 8] ^ W[i - 5] ^ W[i - 3] ^ W[i - 1] ^ PHI ^ (i - 8)
    W.push(rotl(val >>> 0, 11))
  }

  const prekeys = W.slice(8)
  const roundKeys: number[][] = []
  for (let i = 0; i < 33; i++) {
    const chunk = prekeys.slice(i * 4, i * 4 + 4)
    roundKeys.push(applySBox(chunk, (32 + 3 - i) % 8))
  }
  return roundKeys
}

function serpentCore(input: string, key: string, decrypt: boolean, instrument: boolean): CipherResult {
  const start = performance.now()
  validateKey(key)
  const keyBytes = parseHexBytes(key, 'Serpent key')
  const roundKeys = keySchedule(keyBytes)
  const bytes = parseHexBytes(input, 'Serpent input')
  
  if (bytes.length !== 16) {
    throw new CipherError('INVALID_INPUT', 'Serpent input must be exactly 16 bytes.')
  }

  let state = bytesToWords(bytes)
  const steps: CipherStep[] = []

  if (instrument) {
    steps.push({
      index: 0,
      label: 'Key Schedule',
      inputState: key,
      outputState: '33 round keys generated',
      note: 'Key expanded via recurrence and S-box whitening.',
      isMilestone: true
    })
  }

  if (!decrypt) {
    for (let r = 0; r < 32; r++) {
      state = state.map((w, i) => (w ^ roundKeys[r][i]) >>> 0)
      state = applySBox(state, r)
      if (r < 31) {
        state = linearTransform(state)
      } else {
        state = state.map((w, i) => (w ^ roundKeys[32][i]) >>> 0)
      }
    }
  } else {
    for (let r = 31; r >= 0; r--) {
      if (r === 31) {
        state = state.map((w, i) => (w ^ roundKeys[32][i]) >>> 0)
      } else {
        state = inverseLinearTransform(state)
      }
      state = applySBox(state, r, true)
      state = state.map((w, i) => (w ^ roundKeys[r][i]) >>> 0)
    }
  }

  const outBytes = wordsToBytes(state)

  if (instrument) {
    steps.push({
      index: 1,
      label: decrypt ? 'Decryption' : 'Encryption',
      inputState: input,
      outputState: bytesToHex(outBytes),
      note: '32 rounds of substitution and linear transformation completed.',
      isMilestone: true
    })
  }

  return {
    output: bytesToHex(outBytes),
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return serpentCore(input, key, false, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return serpentCore(input, key, true, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    key: '00000000000000000000000000000000',
    input: '00000000000000000000000000000000',
    expected: '4c7d8a30ee474c025c838a157c5965cc',
    description: 'Official NESSIE test vector (All-zero key and plaintext)'
  }
]
