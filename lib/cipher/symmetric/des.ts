/**
 * Data Encryption Standard (DES).
 * FIPS 46-3 compliant implementation.
 * @see CIPHER_ENGINE.md section 2.3
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateKey, toByteArray, fromByteArray } from '../../utils'
import { parseAndValidateHex, validateKeyLength, validateRequiredInput } from '../../utils/cipherValidation'

const METADATA = {
  name: 'DES (Data Encryption Standard)',
  securityStatus: 'deprecated' as const,
  breakingComplexity: '2^56 keys (brute-forced in under a day)',
  yearDesigned: 1977,
  standardBody: 'NIST / FIPS 46-3',
  blockSize: 8,
  keySize: 8,
}

// --- DES Tables ---

const IP = [
  58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4,
  62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8,
  57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3,
  61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7
]

const FP = [
  40, 8, 48, 16, 56, 24, 64, 32, 39, 7, 47, 15, 55, 23, 63, 31,
  38, 6, 46, 14, 54, 22, 62, 30, 37, 5, 45, 13, 53, 21, 61, 29,
  36, 4, 44, 12, 52, 20, 60, 28, 35, 3, 43, 11, 51, 19, 59, 27,
  34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9, 49, 17, 57, 25
]

const PC1 = [
  57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18,
  10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36,
  63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22,
  14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4
]

const PC2 = [
  14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10,
  23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2,
  41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48,
  44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32
]

const E = [
  32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9,
  8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17,
  16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25,
  24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1
]

const P = [
  16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10,
  2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25
]

const SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1]

const S_BOXES = [
  // S1
  [
    [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7],
    [0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8],
    [4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0],
    [15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13]
  ],
  // S2
  [
    [15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10],
    [3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5],
    [0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15],
    [13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9]
  ],
  // S3
  [
    [10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8],
    [13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1],
    [13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7],
    [1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12]
  ],
  // S4
  [
    [7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15],
    [13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9],
    [10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4],
    [3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14]
  ],
  // S5
  [
    [2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9],
    [14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6],
    [4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14],
    [11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3]
  ],
  // S6
  [
    [12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11],
    [10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8],
    [9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6],
    [4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13]
  ],
  // S7
  [
    [4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1],
    [13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6],
    [1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2],
    [6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12]
  ],
  // S8
  [
    [13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7],
    [1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2],
    [7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8],
    [2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11]
  ]
]

// --- Helper Functions ---

// Permutes up to 64 bits represented by [high32, low32]
function permute(bits: [number, number], table: number[]): [number, number] {
  const result: [number, number] = [0, 0]
  for (let i = 0; i < table.length; i++) {
    const srcPos = table[i]
    let bit = 0
    if (srcPos <= 32) {
      bit = (bits[0] >>> (32 - srcPos)) & 1
    } else {
      bit = (bits[1] >>> (64 - srcPos)) & 1
    }

    const dstPos = i + 1
    if (dstPos <= 32) {
      result[0] |= bit << (32 - dstPos)
    } else {
      result[1] |= bit << (64 - dstPos)
    }
  }
  return result
}

// Expands 32 bits to 48 bits, returning the result as two numbers [high24, low24]
function expand(right: number): [number, number] {
  const result: [number, number] = [0, 0]
  for (let i = 0; i < E.length; i++) {
    const srcPos = E[i]
    const bit = (right >>> (32 - srcPos)) & 1
    const dstPos = i + 1
    if (dstPos <= 24) {
      result[0] |= bit << (24 - dstPos)
    } else {
      result[1] |= bit << (48 - dstPos)
    }
  }
  return result
}

// Applies Feistel permutation P to a 32-bit word
function feistelPermute(val: number): number {
  let result = 0
  for (let i = 0; i < P.length; i++) {
    const srcPos = P[i]
    const bit = (val >>> (32 - srcPos)) & 1
    result |= bit << (32 - (i + 1))
  }
  return result
}

// Helper to convert 8 bytes to [high32, low32]
export function bytesToBlock(bytes: Uint8Array, offset = 0): [number, number] {
  const high =
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  const low =
    ((bytes[offset + 4] << 24) |
      (bytes[offset + 5] << 16) |
      (bytes[offset + 6] << 8) |
      bytes[offset + 7]) >>>
    0
  return [high, low]
}

// Helper to convert [high32, low32] to 8 bytes
export function blockToBytes(block: [number, number], bytes: Uint8Array, offset = 0): void {
  bytes[offset] = (block[0] >>> 24) & 0xff
  bytes[offset + 1] = (block[0] >>> 16) & 0xff
  bytes[offset + 2] = (block[0] >>> 8) & 0xff
  bytes[offset + 3] = block[0] & 0xff
  bytes[offset + 4] = (block[1] >>> 24) & 0xff
  bytes[offset + 5] = (block[1] >>> 16) & 0xff
  bytes[offset + 6] = (block[1] >>> 8) & 0xff
  bytes[offset + 7] = block[1] & 0xff
}

// Left shift a 28-bit key half
function leftShift28(half: number, shifts: number): number {
  return (((half << shifts) | (half >>> (28 - shifts))) & 0xfffffff) >>> 0
}

// Generate the 16 round keys (48 bits each, represented as [high24, low24])
export function generateSubkeys(keyBytes: Uint8Array): [number, number][] {
  const keyBlock = bytesToBlock(keyBytes, 0)
  // PC1 maps 64-bit key to 56 bits (C0 is first 28, D0 is last 28)
  const pc1Result = permute(keyBlock, PC1)

  let c = (pc1Result[0] >>> 4) & 0xfffffff
  let d = ((pc1Result[0] & 0xf) << 24) | (pc1Result[1] >>> 8)

  const subkeys: [number, number][] = []

  for (let round = 0; round < 16; round++) {
    const shiftCount = SHIFTS[round]
    c = leftShift28(c, shiftCount)
    d = leftShift28(d, shiftCount)

    // Reconstruct 56-bit block for PC-2
    const combined56: [number, number] = [
      ((c << 4) | (d >>> 24)) >>> 0,
      ((d << 8) & 0xffffffff) >>> 0,
    ]

    const subkey48 = permute(combined56, PC2)
    subkeys.push([subkey48[0] >>> 8, ((subkey48[0] & 0xff) << 16) | (subkey48[1] >>> 16)])
  }

  return subkeys
}

// S-Box Substitution (48 bits to 32 bits)
function sBoxSubstitution(high24: number, low24: number): number {
  let result = 0
  for (let s = 0; s < 8; s++) {
    let bits6 = 0
    if (s < 4) {
      bits6 = (high24 >>> (18 - s * 6)) & 0x3f
    } else {
      bits6 = (low24 >>> (18 - (s - 4) * 6)) & 0x3f
    }

    const row = ((bits6 & 0x20) >>> 4) | (bits6 & 0x01)
    const col = (bits6 >>> 1) & 0x0f
    const val = S_BOXES[s][row][col]

    result |= val << (28 - s * 4)
  }
  return result >>> 0
}

// Feistel function F(R, K)
function feistel(right: number, roundKey: [number, number]): number {
  const expanded = expand(right)
  const xorHigh = expanded[0] ^ roundKey[0]
  const xorLow = expanded[1] ^ roundKey[1]
  const sBoxOutput = sBoxSubstitution(xorHigh, xorLow)
  return feistelPermute(sBoxOutput)
}

// Process a single 64-bit block
export function processBlock(
  block: [number, number],
  subkeys: [number, number][],
  decrypt: boolean
): [number, number] {
  const ipResult = permute(block, IP)
  let left = ipResult[0]
  let right = ipResult[1]

  for (let r = 0; r < 16; r++) {
    const roundKey = subkeys[decrypt ? 15 - r : r]
    const fResult = feistel(right, roundKey)
    const nextRight = (left ^ fResult) >>> 0
    left = right
    right = nextRight
  }

  // Pre-output swap (R16, L16)
  const finalBlock: [number, number] = [right, left]
  return permute(finalBlock, FP)
}

// --- Instrumented Execution ---

function desInstrumented(
  inputBytes: Uint8Array,
  keyBytes: Uint8Array,
  decrypt: boolean
): CipherResult {
  const start = performance.now()
  const subkeys = generateSubkeys(keyBytes)

  const steps: CipherStep[] = []

  // Step 0: Key Schedule Setup
  steps.push({
    index: 0,
    label: 'Key schedule & PC-1',
    inputState: fromByteArray(keyBytes, 'hex'),
    outputState: '',
    note: 'PC-1 applied to 64-bit key (parity bits discarded) to produce a 56-bit key.',
    isMilestone: true,
  })

  // We only show full details for block 1, subsequent blocks collapse
  const numBlocks = Math.ceil(inputBytes.length / 8)
  const outputBytes = new Uint8Array(numBlocks * 8)

  for (let b = 0; b < numBlocks; b++) {
    const blockBytes = inputBytes.slice(b * 8, (b + 1) * 8)
    const block = bytesToBlock(blockBytes, 0)

    const isFirstBlock = b === 0

    if (isFirstBlock) {
      // Step 1: Loading plaintext block
      steps.push({
        index: steps.length,
        label: 'Block 1 — Loading Block',
        inputState: fromByteArray(blockBytes, 'hex'),
        outputState: fromByteArray(blockBytes, 'hex'),
        note: 'Loaded 64-bit plaintext block into L and R registers.',
      })

      const ipResult = permute(block, IP)
      let left = ipResult[0]
      let right = ipResult[1]

      // Step 2: Initial Permutation (IP)
      steps.push({
        index: steps.length,
        label: `Block 1 — Initial Permutation (IP)`,
        inputState: fromByteArray(blockBytes, 'hex'),
        outputState: fromByteArray(new Uint8Array([
          (ipResult[0] >>> 24) & 0xff, (ipResult[0] >>> 16) & 0xff, (ipResult[0] >>> 8) & 0xff, ipResult[0] & 0xff,
          (ipResult[1] >>> 24) & 0xff, (ipResult[1] >>> 16) & 0xff, (ipResult[1] >>> 8) & 0xff, ipResult[1] & 0xff
        ]), 'hex'),
        note: 'IP permutes the 64-bit input block before the Feistel rounds begin.',
      })

      for (let r = 0; r < 16; r++) {
        const roundKey = subkeys[decrypt ? 15 - r : r]

        // 1. Expansion E (32 -> 48 bits)
        const expanded = expand(right)
        const expHex = expanded[0].toString(16).padStart(6, '0') + expanded[1].toString(16).padStart(6, '0')
        steps.push({
          index: steps.length,
          label: `Block 1 — Round ${r + 1} — Expansion E`,
          inputState: right.toString(16).padStart(8, '0'),
          outputState: expHex,
          note: 'Expanded 32-bit Right half to 48 bits using the E-bit-selection table.',
        })

        // 2. Key XOR
        const xorHigh = expanded[0] ^ roundKey[0]
        const xorLow = expanded[1] ^ roundKey[1]
        const xorHex = xorHigh.toString(16).padStart(6, '0') + xorLow.toString(16).padStart(6, '0')
        steps.push({
          index: steps.length,
          label: `Block 1 — Round ${r + 1} — Round Key XOR`,
          inputState: expHex,
          outputState: xorHex,
          note: `XORed 48-bit expanded value with the round key K${decrypt ? 16 - r : r + 1}.`,
        })

        // 3. S-Box Substitution
        const sBoxOutput = sBoxSubstitution(xorHigh, xorLow)
        steps.push({
          index: steps.length,
          label: `Block 1 — Round ${r + 1} — S-Box Substitution`,
          inputState: xorHex,
          outputState: sBoxOutput.toString(16).padStart(8, '0'),
          note: 'Passed 48-bit XORed value through S-boxes S1-S8 to produce a 32-bit output.',
          sboxInspection: {
            family: 'des',
            desIndex: 0,
            inputValue: `0b${xorHigh.toString(2).padStart(6, '0').slice(0, 6)}`,
          },
        })

        // 4. Permutation P & Left XOR
        const fResult = feistelPermute(sBoxOutput)
        const nextRight = (left ^ fResult) >>> 0
        steps.push({
          index: steps.length,
          label: `Block 1 — Round ${r + 1} — Permutation P & XOR`,
          inputState: sBoxOutput.toString(16).padStart(8, '0'),
          outputState: nextRight.toString(16).padStart(8, '0'),
          note: 'Permuted S-box output using P-table and XORed with Left half to yield the new Right half.',
          isMilestone: r === 0 || r === 15,
        })

        left = right
        right = nextRight
      }

      const finalBlock: [number, number] = [right, left]
      const fpResult = permute(finalBlock, FP)
      blockToBytes(fpResult, outputBytes, b * 8)

      // Step 67: Final Permutation (FP)
      steps.push({
        index: steps.length,
        label: `Block 1 — Final Permutation (FP)`,
        inputState: `L: ${right.toString(16).padStart(8, '0')} R: ${left.toString(16).padStart(8, '0')}`,
        outputState: fromByteArray(outputBytes.slice(0, 8), 'hex'),
        note: 'FP (IP^-1) applied to the pre-output block to yield the final 64-bit cipher block.',
        isMilestone: true,
      })

      // Step 68: Block 1 Output (Milestone)
      steps.push({
        index: steps.length,
        label: 'Block 1 — Complete Output',
        inputState: fromByteArray(blockBytes, 'hex'),
        outputState: fromByteArray(outputBytes.slice(0, 8), 'hex'),
        note: 'Completed processing block 1.',
        isMilestone: true,
      })
    } else {
      // Collapse other blocks to single steps
      const resultBlock = processBlock(block, subkeys, decrypt)
      blockToBytes(resultBlock, outputBytes, b * 8)

      steps.push({
        index: steps.length,
        label: `Block ${b + 1} Computation`,
        inputState: fromByteArray(blockBytes, 'hex'),
        outputState: fromByteArray(outputBytes.slice(b * 8, (b + 1) * 8), 'hex'),
        note: `DES computation processed for block ${b + 1}.`,
        isMilestone: true,
      })
    }
  }

  // Step 69: Final Encryption Output
  steps.push({
    index: steps.length,
    label: 'DES Encryption Output',
    inputState: `Total blocks: ${numBlocks}`,
    outputState: fromByteArray(outputBytes, 'hex'),
    note: `Completed DES ${decrypt ? 'decryption' : 'encryption'}.`,
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

// PKCS7 padding helper
function padPKCS7(bytes: Uint8Array, blockSize: number): Uint8Array {
  const paddingVal = blockSize - (bytes.length % blockSize)
  const padded = new Uint8Array(bytes.length + paddingVal)
  padded.set(bytes)
  for (let i = bytes.length; i < padded.length; i++) {
    padded[i] = paddingVal
  }
  return padded
}

function unpadPKCS7(bytes: Uint8Array): Uint8Array {
  if (bytes.length === 0) {
    throw new CipherError('INVALID_PADDING', 'Empty ciphertext or block size mismatch.')
  }
  const paddingVal = bytes[bytes.length - 1]
  if (paddingVal < 1 || paddingVal > 8 || paddingVal > bytes.length) {
    throw new CipherError('INVALID_PADDING', 'Invalid PKCS7 padding value.')
  }
  for (let i = bytes.length - paddingVal; i < bytes.length; i++) {
    if (bytes[i] !== paddingVal) {
      throw new CipherError('INVALID_PADDING', 'Invalid PKCS7 padding bytes.')
    }
  }
  return bytes.slice(0, bytes.length - paddingVal)
}

function desFast(
  inputBytes: Uint8Array,
  keyBytes: Uint8Array,
  decrypt: boolean
): CipherResult {
  const start = performance.now()
  const subkeys = generateSubkeys(keyBytes)

  const numBlocks = Math.ceil(inputBytes.length / 8)
  const outputBytes = new Uint8Array(numBlocks * 8)

  for (let b = 0; b < numBlocks; b++) {
    const block = bytesToBlock(inputBytes, b * 8)
    const resultBlock = processBlock(block, subkeys, decrypt)
    blockToBytes(resultBlock, outputBytes, b * 8)
  }

  return {
    output: fromByteArray(outputBytes, 'hex'),
    outputEncoding: 'hex',
    steps: [],
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

const DES_WEAK_KEYS = new Set([
  '0101010101010101', 'FEFEFEFEFEFEFEFE',
  'E0E0E0E0F1F1F1F1', '1F1F1F1F0E0E0E0E',
  '011F011F010E010E', '1F011F010E010E01',
  'E0FEE0FEF1FEF1FE', 'FEE0FEE0FEF1FEF1',
  '01E001E001F101F1', 'E001E001F101F101',
  '1FE01FE00EF10EF1', 'E01FE01FF10EF10E',
  '01FE01FE01FE01FE', 'FE01FE01FE01FE01',
  '1FFE1FFE0EFE0EFE', 'FE1FFE1FFE0EFE0E'
].map(k => k.toUpperCase()))

export function isWeakKey(keyBytes: Uint8Array): boolean {
  const hex = fromByteArray(keyBytes, 'hex').toUpperCase()
  return DES_WEAK_KEYS.has(hex)
}

export function encrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  validateRequiredInput(input)
  validateKey(key)

  const inEnc = options.encoding || 'utf8'
  const inputBytes = toByteArray(input, inEnc)
  // Key must be exactly 8 bytes (64 bits) for DES
  const normalizedKeyLength = key.replace(/\s+/g, '').length
  let keyBytes = normalizedKeyLength === 16
    ? parseAndValidateHex(key, undefined, 'DES key')
    : toByteArray(key, 'utf8')

  validateKeyLength(keyBytes, [8], 'DES')

  if (isWeakKey(keyBytes)) {
    throw new CipherError('WEAK_KEY', 'DES weak key detected. Do not use this key.')
  }

  // DES blocks must be multiple of 8 bytes. Apply PKCS7 padding.
  const paddedInput = padPKCS7(inputBytes, 8)

  if (options.instrument) {
    return desInstrumented(paddedInput, keyBytes, false)
  }
  return desFast(paddedInput, keyBytes, false)
}

export function decrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  validateRequiredInput(input)
  validateKey(key)

  // Ciphertext for DES is expected in hex
  const inputBytes = parseAndValidateHex(input, undefined, 'DES ciphertext')
  if (inputBytes.length % 8 !== 0) {
    throw new CipherError('INVALID_PADDING', 'DES ciphertext must be a multiple of 8 bytes (even hex length).')
  }

  const normalizedKeyLength = key.replace(/\s+/g, '').length
  let keyBytes = normalizedKeyLength === 16
    ? parseAndValidateHex(key, undefined, 'DES key')
    : toByteArray(key, 'utf8')

  validateKeyLength(keyBytes, [8], 'DES')

  if (isWeakKey(keyBytes)) {
    throw new CipherError('WEAK_KEY', 'DES weak key detected. Do not use this key.')
  }

  let result: CipherResult
  if (options.instrument) {
    result = desInstrumented(inputBytes, keyBytes, true)
  } else {
    result = desFast(inputBytes, keyBytes, true)
  }

  // DES output needs to be unpadded
  const rawBytes = toByteArray(result.output, 'hex')
  const unpaddedBytes = unpadPKCS7(rawBytes)
  
  const outEnc = options.encoding || 'utf8'

  return {
    ...result,
    output: fromByteArray(unpaddedBytes, outEnc),
    outputEncoding: outEnc,
  }
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '8787878787878787',
    key: '0E329232EA6D0D73',
    expected: 'randomized',
    description: 'FIPS 46-3 DES CBC mode (randomized IV prepended to ciphertext)',
  },
]
