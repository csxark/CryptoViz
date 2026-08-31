/**
 * Advanced Encryption Standard (AES).
 * FIPS 197 compliant implementation.
 * Supports AES-128, AES-192, and AES-256.
 * @see CIPHER_ENGINE.md section 2.4
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateKey, toByteArray, fromByteArray } from '../../utils'
import { parseAndValidateHex, validateKeyLength, validateRequiredInput } from '../../utils/cipherValidation'

const METADATA = {
  name: 'AES (Advanced Encryption Standard)',
  securityStatus: 'secure' as const,
  breakingComplexity: '2^128, 2^192, 2^256 (algebraic/quantum attacks)',
  yearDesigned: 2001,
  standardBody: 'NIST / FIPS 197',
  blockSize: 16,
}

// --- Modes of operation ---
// ECB/CBC are block modes (require PKCS7 padding); CTR/CFB/OFB turn AES into a
// stream cipher (keystream XORed with the data, no padding, ciphertext length
// equals plaintext length). See NIST SP 800-38A.
/**
 * Aes Mode symmetric cipher export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export type AesMode = 'ECB' | 'CBC' | 'CTR' | 'CFB' | 'OFB'

const STREAM_MODES: readonly AesMode[] = ['CTR', 'CFB', 'OFB']
const IV_MODES: readonly AesMode[] = ['CBC', 'CTR', 'CFB', 'OFB']

const isStreamMode = (mode: AesMode): boolean => STREAM_MODES.includes(mode)
const needsIv = (mode: AesMode): boolean => IV_MODES.includes(mode)

function parseMode(mode?: string): AesMode {
  const up = (mode ?? 'ECB').toUpperCase()
  const known: readonly AesMode[] = ['ECB', 'CBC', 'CTR', 'CFB', 'OFB']
  return known.includes(up as AesMode) ? (up as AesMode) : 'ECB'
}

// --- AES Tables ---

const S_BOX = new Uint8Array([
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
])

const INV_S_BOX = new Uint8Array([
  0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb,
  0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb,
  0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e,
  0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25,
  0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92,
  0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84,
  0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06,
  0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b,
  0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73,
  0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e,
  0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b,
  0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4,
  0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f,
  0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef,
  0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61,
  0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d
])

const RCON = new Uint8Array([
  0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36
])

// --- GF(2^8) Arithmetic Helpers ---

const mul2 = (x: number) => ((x << 1) ^ (x & 0x80 ? 0x1b : 0)) & 0xff
const mul3 = (x: number) => mul2(x) ^ x
const mul9 = (x: number) => mul2(mul2(mul2(x))) ^ x
const mul11 = (x: number) => mul2(mul2(mul2(x)) ^ x) ^ x
const mul13 = (x: number) => mul2(mul2(mul2(x) ^ x)) ^ x
const mul14 = (x: number) => mul2(mul2(mul2(x) ^ x) ^ x)

// --- Key Schedule Expansion ---

/**
 * Expand Key symmetric cipher export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param keyBytes Input required by the Expand Key operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function expandKey(keyBytes: Uint8Array): Uint8Array[] {
  const nWords = keyBytes.length / 4
  const nRounds = nWords + 6
  const totalWords = 4 * (nRounds + 1)

  const w = new Uint8Array(totalWords * 4)

  // Copy initial key
  w.set(keyBytes)

  const temp = new Uint8Array(4)

  for (let i = nWords; i < totalWords; i++) {
    const prevWordOffset = (i - 1) * 4
    temp[0] = w[prevWordOffset]
    temp[1] = w[prevWordOffset + 1]
    temp[2] = w[prevWordOffset + 2]
    temp[3] = w[prevWordOffset + 3]

    if (i % nWords === 0) {
      // RotWord
      const t = temp[0]
      temp[0] = temp[1]
      temp[1] = temp[2]
      temp[2] = temp[3]
      temp[3] = t

      // SubWord
      temp[0] = S_BOX[temp[0]]
      temp[1] = S_BOX[temp[1]]
      temp[2] = S_BOX[temp[2]]
      temp[3] = S_BOX[temp[3]]

      // XOR Rcon
      temp[0] ^= RCON[i / nWords]
    } else if (nWords > 6 && i % nWords === 4) {
      // SubWord only (for AES-256)
      temp[0] = S_BOX[temp[0]]
      temp[1] = S_BOX[temp[1]]
      temp[2] = S_BOX[temp[2]]
      temp[3] = S_BOX[temp[3]]
    }

    const targetOffset = i * 4
    const matchOffset = (i - nWords) * 4
    w[targetOffset] = w[matchOffset] ^ temp[0]
    w[targetOffset + 1] = w[matchOffset + 1] ^ temp[1]
    w[targetOffset + 2] = w[matchOffset + 2] ^ temp[2]
    w[targetOffset + 3] = w[matchOffset + 3] ^ temp[3]
  }

  // Split into 16-byte round keys
  const roundKeys: Uint8Array[] = []
  for (let r = 0; r <= nRounds; r++) {
    roundKeys.push(w.slice(r * 16, (r + 1) * 16))
  }

  return roundKeys
}

// --- Block Cipher Operations ---

// State is represented as a 16-element Uint8Array (column-major format)
// Row 0: s[0], s[4], s[8], s[12]
// Row 1: s[1], s[5], s[9], s[13]
// Row 2: s[2], s[6], s[10], s[14]
// Row 3: s[3], s[7], s[11], s[15]

function addRoundKey(state: Uint8Array, roundKey: Uint8Array): void {
  for (let i = 0; i < 16; i++) {
    state[i] ^= roundKey[i]
  }
}

function subBytes(state: Uint8Array): void {
  for (let i = 0; i < 16; i++) {
    state[i] = S_BOX[state[i]]
  }
}

function invSubBytes(state: Uint8Array): void {
  for (let i = 0; i < 16; i++) {
    state[i] = INV_S_BOX[state[i]]
  }
}

function shiftRows(state: Uint8Array): void {
  const temp = new Uint8Array(state)
  // Row 0: no shift
  // Row 1: shift left by 1
  state[1] = temp[5]
  state[5] = temp[9]
  state[9] = temp[13]
  state[13] = temp[1]
  // Row 2: shift left by 2
  state[2] = temp[10]
  state[6] = temp[14]
  state[10] = temp[2]
  state[14] = temp[6]
  // Row 3: shift left by 3
  state[3] = temp[15]
  state[7] = temp[3]
  state[11] = temp[7]
  state[15] = temp[11]
}

function invShiftRows(state: Uint8Array): void {
  const temp = new Uint8Array(state)
  // Row 0: no shift
  // Row 1: shift right by 1
  state[1] = temp[13]
  state[5] = temp[1]
  state[9] = temp[5]
  state[13] = temp[9]
  // Row 2: shift right by 2
  state[2] = temp[10]
  state[6] = temp[14]
  state[10] = temp[2]
  state[14] = temp[6]
  // Row 3: shift right by 3
  state[3] = temp[7]
  state[7] = temp[11]
  state[11] = temp[15]
  state[15] = temp[3]
}

function mixColumns(state: Uint8Array): void {
  const temp = new Uint8Array(state)
  for (let col = 0; col < 4; col++) {
    const o = col * 4
    const s0 = temp[o], s1 = temp[o + 1], s2 = temp[o + 2], s3 = temp[o + 3]
    state[o] = mul2(s0) ^ mul3(s1) ^ s2 ^ s3
    state[o + 1] = s0 ^ mul2(s1) ^ mul3(s2) ^ s3
    state[o + 2] = s0 ^ s1 ^ mul2(s2) ^ mul3(s3)
    state[o + 3] = mul3(s0) ^ s1 ^ s2 ^ mul2(s3)
  }
}

function invMixColumns(state: Uint8Array): void {
  const temp = new Uint8Array(state)
  for (let col = 0; col < 4; col++) {
    const o = col * 4
    const s0 = temp[o], s1 = temp[o + 1], s2 = temp[o + 2], s3 = temp[o + 3]
    state[o] = mul14(s0) ^ mul11(s1) ^ mul13(s2) ^ mul9(s3)
    state[o + 1] = mul9(s0) ^ mul14(s1) ^ mul11(s2) ^ mul13(s3)
    state[o + 2] = mul13(s0) ^ mul9(s1) ^ mul14(s2) ^ mul11(s3)
    state[o + 3] = mul11(s0) ^ mul13(s1) ^ mul9(s2) ^ mul14(s3)
  }
}

// Process a single 16-byte block
/**
 * Process Block symmetric cipher export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function processBlock(
  blockBytes: Uint8Array<ArrayBufferLike>,
  roundKeys: Uint8Array[],
  decrypt: boolean
): Uint8Array {
  const state = new Uint8Array(blockBytes)
  const nRounds = roundKeys.length - 1

  if (!decrypt) {
    // Initial round
    addRoundKey(state, roundKeys[0])

    // Main rounds
    for (let r = 1; r < nRounds; r++) {
      subBytes(state)
      shiftRows(state)
      mixColumns(state)
      addRoundKey(state, roundKeys[r])
    }

    // Final round (no mixColumns)
    subBytes(state)
    shiftRows(state)
    addRoundKey(state, roundKeys[nRounds])
  } else {
    // Initial round (reverse keys)
    addRoundKey(state, roundKeys[nRounds])
    invShiftRows(state)
    invSubBytes(state)

    // Main rounds
    for (let r = nRounds - 1; r >= 1; r--) {
      addRoundKey(state, roundKeys[r])
      invMixColumns(state)
      invShiftRows(state)
      invSubBytes(state)
    }

    // Final round
    addRoundKey(state, roundKeys[0])
  }

  return state
}

// --- Instrumented Execution ---

function aesInstrumented(
  inputBytes: Uint8Array,
  keyBytes: Uint8Array,
  decrypt: boolean,
  mode: AesMode = 'ECB',
  iv: Uint8Array | null = null,
  ivProvided = false
): CipherResult {
  if (isStreamMode(mode)) {
    return aesStreamInstrumented(inputBytes, keyBytes, decrypt, mode, iv!, ivProvided)
  }

  const start = performance.now()
  const roundKeys = expandKey(keyBytes)
  const nRounds = roundKeys.length - 1

  const steps: CipherStep[] = []
  const numBlocks = Math.ceil(inputBytes.length / 16)
  const MAX_TRACED_BLOCKS = 200
  const outputBytes = new Uint8Array(numBlocks * 16)
  const useCbc = mode === 'CBC'
  let prevBlock = useCbc ? iv : null

  // Step 0: Key schedule expansion (Milestone)
  steps.push({
    index: 0,
    label: 'AES Key Schedule Expansion',
    inputState: fromByteArray(keyBytes, 'hex'),
    outputState: `Generated ${roundKeys.length} round keys.`,
    note: `Key of size ${keyBytes.length} bytes expanded into ${roundKeys.length} round keys using Rijndael key schedule.`,
    isMilestone: true,
  })

  if (useCbc && iv) {
    steps.push({
      index: steps.length,
      label: 'CBC Initialization Vector (IV)',
      inputState: decrypt
        ? 'Extracted from ciphertext prefix'
        : ivProvided
          ? 'Caller-provided 16-byte IV'
          : 'Random 16-byte IV',
      outputState: fromByteArray(iv, 'hex'),
      note: 'The IV is XORed with the first block during encryption, and with the decrypted first block during decryption.',
      isMilestone: true,
    })
  }

  for (let b = 0; b < numBlocks; b++) {
    const blockBytes = inputBytes.slice(b * 16, (b + 1) * 16)
    const blockNum = b + 1
    const isFirstBlock = b === 0
    const chainLabel = b === 0 ? 'IV' : 'previous ciphertext block'

    if (isFirstBlock) {
      const cbcInputBlock = useCbc && !decrypt
        ? xorBlocks(blockBytes, prevBlock ?? new Uint8Array(16))
        : blockBytes
      const state = new Uint8Array(cbcInputBlock)

      if (useCbc && !decrypt) {
        steps.push({
          index: steps.length,
          label: 'Block 1 — CBC Mode XOR',
          inputState: fromByteArray(blockBytes, 'hex'),
          outputState: fromByteArray(state, 'hex'),
          note: 'XORed the plaintext block with the previous ciphertext block (or IV) before AES encryption.',
        })
      }

      // Step 1: Loading plaintext
      if (!useCbc) {
        steps.push({
          index: steps.length,
          label: 'Block 1 — Plaintext Loading',
          inputState: fromByteArray(blockBytes, 'hex'),
          outputState: fromByteArray(state, 'hex'),
          note: 'Loaded 16-byte input block into 4x4 state matrix.',
        })
      }

      if (!decrypt) {
        // Step 2: Initial round AddRoundKey
        const stateBeforeARK = new Uint8Array(state)
        addRoundKey(state, roundKeys[0])
        steps.push({
          index: steps.length,
          label: 'Block 1 — Initial Round (AddRoundKey)',
          inputState: fromByteArray(stateBeforeARK, 'hex'),
          outputState: fromByteArray(state, 'hex'),
          note: 'XORed state with initial round key K0.',
        })

        for (let r = 1; r < nRounds; r++) {
          // SubBytes
          const stateBeforeSub = new Uint8Array(state)
          subBytes(state)
          steps.push({
            index: steps.length,
            label: `Block 1 — Round ${r} — SubBytes`,
            inputState: fromByteArray(stateBeforeSub, 'hex'),
            outputState: fromByteArray(state, 'hex'),
            note: 'Substituted state bytes using Rijndael S-box.',
            sboxInspection: {
              family: 'aes',
              inputValue: `0x${stateBeforeSub[0].toString(16).padStart(2, '0')}`,
            },
          })

          // ShiftRows
          const stateBeforeShift = new Uint8Array(state)
          shiftRows(state)
          steps.push({
            index: steps.length,
            label: `Block 1 — Round ${r} — ShiftRows`,
            inputState: fromByteArray(stateBeforeShift, 'hex'),
            outputState: fromByteArray(state, 'hex'),
            note: 'Cyclically shifted state rows by offsets 0, 1, 2, and 3.',
          })

          // MixColumns
          const stateBeforeMix = new Uint8Array(state)
          mixColumns(state)
          steps.push({
            index: steps.length,
            label: `Block 1 — Round ${r} — MixColumns`,
            inputState: fromByteArray(stateBeforeMix, 'hex'),
            outputState: fromByteArray(state, 'hex'),
           note: 'Treated each state column as a degree-3 polynomial over GF(2^8) and multiplied it by c(x) = {03}x³ + {01}x² + {01}x + {02}, reduced modulo x⁴ + 1. All coefficient arithmetic is performed in GF(2^8).',
          })

          // AddRoundKey
          const stateBeforeARKRound = new Uint8Array(state)
          addRoundKey(state, roundKeys[r])
          steps.push({
            index: steps.length,
            label: `Block 1 — Round ${r} — AddRoundKey`,
            inputState: fromByteArray(stateBeforeARKRound, 'hex'),
            outputState: fromByteArray(state, 'hex'),
            note: `XORed state with round key K${r}.`,
            isMilestone: r === 1 || r === nRounds - 1,
          })
        }

        // Final round
        const stateBeforeSubFinal = new Uint8Array(state)
        subBytes(state)
        steps.push({
          index: steps.length,
          label: `Block 1 — Round ${nRounds} — SubBytes`,
          inputState: fromByteArray(stateBeforeSubFinal, 'hex'),
          outputState: fromByteArray(state, 'hex'),
          note: 'Substituted final state bytes using Rijndael S-box.',
          sboxInspection: {
            family: 'aes',
            inputValue: `0x${stateBeforeSubFinal[0].toString(16).padStart(2, '0')}`,
          },
        })

        const stateBeforeShiftFinal = new Uint8Array(state)
        shiftRows(state)
        steps.push({
          index: steps.length,
          label: `Block 1 — Round ${nRounds} — ShiftRows`,
          inputState: fromByteArray(stateBeforeShiftFinal, 'hex'),
          outputState: fromByteArray(state, 'hex'),
          note: 'Cyclically shifted final state rows.',
        })

        const stateBeforeARKFinal = new Uint8Array(state)
        addRoundKey(state, roundKeys[nRounds])
        steps.push({
          index: steps.length,
          label: `Block 1 — Round ${nRounds} — AddRoundKey`,
          inputState: fromByteArray(stateBeforeARKFinal, 'hex'),
          outputState: fromByteArray(state, 'hex'),
          note: `XORed final state with round key K${nRounds}.`,
        })

        outputBytes.set(state, 0)
        prevBlock = new Uint8Array(state)
      } else {
        const stateBeforeARKDec = new Uint8Array(state)
        addRoundKey(state, roundKeys[nRounds])
        steps.push({
          index: steps.length,
          label: 'Block 1 — Initial Decryption (AddRoundKey)',
          inputState: fromByteArray(stateBeforeARKDec, 'hex'),
          outputState: fromByteArray(state, 'hex'),
          note: `XORed state with final round key K${nRounds}.`,
        })

        const stateBeforeShiftDec = new Uint8Array(state)
        invShiftRows(state)
        steps.push({
          index: steps.length,
          label: 'Block 1 — Initial Decryption (InvShiftRows)',
          inputState: fromByteArray(stateBeforeShiftDec, 'hex'),
          outputState: fromByteArray(state, 'hex'),
          note: 'Performed inverse row shifting.',
        })

        const stateBeforeSubDec = new Uint8Array(state)
        invSubBytes(state)
        steps.push({
          index: steps.length,
          label: 'Block 1 — Initial Decryption (InvSubBytes)',
          inputState: fromByteArray(stateBeforeSubDec, 'hex'),
          outputState: fromByteArray(state, 'hex'),
          note: 'Substituted state bytes using Rijndael Inverse S-box.',
          sboxInspection: {
            family: 'aes-inv',
            inputValue: `0x${stateBeforeSubDec[0].toString(16).padStart(2, '0')}`,
          },
        })

        for (let r = nRounds - 1; r >= 1; r--) {
          const roundNum = nRounds - r
          const stateBeforeARKDecRound = new Uint8Array(state)
          addRoundKey(state, roundKeys[r])
          steps.push({
            index: steps.length,
            label: `Block 1 — Decryption Round ${roundNum} — AddRoundKey`,
            inputState: fromByteArray(stateBeforeARKDecRound, 'hex'),
            outputState: fromByteArray(state, 'hex'),
            note: `XORed state with round key K${r}.`,
          })

          const stateBeforeMixDecRound = new Uint8Array(state)
          invMixColumns(state)
          steps.push({
            index: steps.length,
            label: `Block 1 — Decryption Round ${roundNum} — InvMixColumns`,
            inputState: fromByteArray(stateBeforeMixDecRound, 'hex'),
            outputState: fromByteArray(state, 'hex'),
            note: 'Treated each state column as a degree-3 polynomial over GF(2^8) and multiplied it by c(x) = {03}x³ + {01}x² + {01}x + {02}, reduced modulo x⁴ + 1. All coefficient arithmetic is performed in GF(2^8).',
          })

          const stateBeforeShiftDecRound = new Uint8Array(state)
          invShiftRows(state)
          steps.push({
            index: steps.length,
            label: `Block 1 — Decryption Round ${roundNum} — InvShiftRows`,
            inputState: fromByteArray(stateBeforeShiftDecRound, 'hex'),
            outputState: fromByteArray(state, 'hex'),
            note: 'Performed inverse row shifting.',
          })

          const stateBeforeSubDecRound = new Uint8Array(state)
          invSubBytes(state)
          steps.push({
            index: steps.length,
            label: `Block 1 — Decryption Round ${roundNum} — InvSubBytes`,
            inputState: fromByteArray(stateBeforeSubDecRound, 'hex'),
            outputState: fromByteArray(state, 'hex'),
            note: 'Substituted state bytes using Rijndael Inverse S-box.',
            isMilestone: r === nRounds - 1 || r === 1,
            sboxInspection: {
              family: 'aes-inv',
              inputValue: `0x${stateBeforeSubDecRound[0].toString(16).padStart(2, '0')}`,
            },
          })
        }

        const stateBeforeARKDecFinal = new Uint8Array(state)
        addRoundKey(state, roundKeys[0])
        steps.push({
          index: steps.length,
          label: 'Block 1 — Decryption Round Final — AddRoundKey',
          inputState: fromByteArray(stateBeforeARKDecFinal, 'hex'),
          outputState: fromByteArray(state, 'hex'),
          note: 'XORed state with initial round key K0.',
        })

        const plaintextBlock = useCbc
          ? xorBlocks(state, prevBlock ?? new Uint8Array(16))
          : state

        if (useCbc) {
          steps.push({
            index: steps.length,
            label: 'Block 1 — CBC Mode XOR',
            inputState: fromByteArray(state, 'hex'),
            outputState: fromByteArray(plaintextBlock, 'hex'),
            note: 'XORed the decrypted block with the previous ciphertext block (or IV) to recover the plaintext block.',
          })
        }

        outputBytes.set(plaintextBlock, b * 16)
        prevBlock = new Uint8Array(blockBytes)
      }

      steps.push({
        index: steps.length,
        label: 'Block 1 — Complete Output',
        inputState: fromByteArray(blockBytes, 'hex'),
        outputState: fromByteArray(outputBytes.slice(0, 16), 'hex'),
        note: 'Completed processing block 1.',
        isMilestone: true,
      })
    } else {
      let resultBlock: Uint8Array
      const traceThisBlock = blockNum <= MAX_TRACED_BLOCKS

      if (useCbc && !decrypt) {
        const xored = xorBlocks(blockBytes, prevBlock ?? new Uint8Array(16))
        if (traceThisBlock) {
          steps.push({
            index: steps.length,
            label: `Block ${blockNum} — CBC Mode XOR (with ${chainLabel})`,
            inputState: fromByteArray(blockBytes, 'hex'),
            outputState: fromByteArray(xored, 'hex'),
            note: `XORed plaintext block with ${chainLabel} before AES encryption.`,
          })
        }
        resultBlock = processBlock(xored, roundKeys, false)
        prevBlock = new Uint8Array(resultBlock)
      } else if (useCbc && decrypt) {
        const decrypted = processBlock(blockBytes, roundKeys, true)
        resultBlock = xorBlocks(decrypted, prevBlock ?? new Uint8Array(16))
        if (traceThisBlock) {
          steps.push({
            index: steps.length,
            label: `Block ${blockNum} — CBC Mode XOR (with ${chainLabel})`,
            inputState: fromByteArray(decrypted, 'hex'),
            outputState: fromByteArray(resultBlock, 'hex'),
            note: `XORed decrypted block with ${chainLabel} to recover plaintext.`,
          })
        }
        prevBlock = new Uint8Array(blockBytes)
      } else {
        resultBlock = processBlock(blockBytes, roundKeys, decrypt)
      }

      outputBytes.set(resultBlock, b * 16)

      if (traceThisBlock) {
        steps.push({
          index: steps.length,
          label: `Block ${b + 1} Computation`,
          inputState: fromByteArray(blockBytes, 'hex'),
          outputState: fromByteArray(resultBlock, 'hex'),
          note: `AES block cipher processing complete for block ${b + 1}.`,
          isMilestone: true,
        })
      } else if (blockNum === MAX_TRACED_BLOCKS + 1) {
        steps.push({
          index: steps.length,
          label: `Remaining ${numBlocks - MAX_TRACED_BLOCKS} blocks (summarized)`,
          inputState: '',
          outputState: '',
          note: 'AES block processing continues identically for the rest of the ciphertext — omitted from the trace to stay within the step budget.',
          isMilestone: true,
        })
      }
    }

  }
  steps.push({
    index: steps.length,
    label: 'AES Encryption Output',
    inputState: `Total blocks: ${numBlocks}`,
    outputState: fromByteArray(outputBytes, 'hex'),
    note: `Completed AES ${decrypt ? 'decryption' : 'encryption'}.`,
    isMilestone: true,
  })

  return {
    output: fromByteArray(outputBytes, 'hex'),
    outputEncoding: 'hex',
    steps,
    metadata: { ...METADATA, modeOfOperation: mode },
    durationMs: performance.now() - start,
  }
}
function xorBlocks(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(16)
  for (let i = 0; i < 16; i++) {
    result[i] = a[i] ^ b[i]
  }
  return result
}

// --- Stream modes (CTR / CFB / OFB) ---

// Increment a 128-bit big-endian counter block in place (used by CTR mode).
function incrementCounter(counter: Uint8Array): void {
  for (let i = counter.length - 1; i >= 0; i--) {
    counter[i] = (counter[i] + 1) & 0xff
    if (counter[i] !== 0) break
  }
}

/**
 * Shared CTR/CFB/OFB engine. Each mode derives a 16-byte keystream block from
 * the block cipher and XORs it with the data; encryption and decryption are the
 * same operation except for the CFB feedback source. Handles a short final block
 * (only the needed bytes are XORed), so arbitrary-length input round-trips
 * without padding. When `steps` is provided, per-block instrumentation is pushed.
 */
function runStreamMode(
  inputBytes: Uint8Array,
  roundKeys: Uint8Array[],
  mode: AesMode,
  iv: Uint8Array,
  decrypt: boolean,
  steps?: CipherStep[]
): Uint8Array {
  const output = new Uint8Array(inputBytes.length)
  const numBlocks = Math.ceil(inputBytes.length / 16)

  // CTR keeps a running counter; CFB/OFB keep a running feedback block.
  const counter = new Uint8Array(iv)
  let feedback = new Uint8Array(iv)

  for (let b = 0; b < numBlocks; b++) {
    const offset = b * 16
    const blockLen = Math.min(16, inputBytes.length - offset)
    const inBlock = inputBytes.subarray(offset, offset + blockLen)

    // Derive the keystream block E(cipherInput) for this position.
    let cipherInput: Uint8Array
    if (mode === 'CTR') {
      cipherInput = new Uint8Array(counter)
    } else {
      cipherInput = new Uint8Array(feedback)
    }
    const keystream = processBlock(cipherInput, roundKeys, false)

    // XOR keystream with the (possibly short) data block.
    const outBlock = new Uint8Array(blockLen)
    for (let i = 0; i < blockLen; i++) {
      outBlock[i] = inBlock[i] ^ keystream[i]
    }
    output.set(outBlock, offset)

    // Advance the mode state for the next block.
    if (mode === 'CTR') {
      incrementCounter(counter)
    } else if (mode === 'OFB') {
      feedback = new Uint8Array(keystream)
    } else {
      // CFB: feedback is the ciphertext block (out on encrypt, in on decrypt).
      const cipherBlock = decrypt ? inBlock : outBlock
      const next = new Uint8Array(16)
      next.set(cipherBlock)
      feedback = next
    }

    if (steps) {
      const blockNum = b + 1
      const sourceLabel =
        mode === 'CTR'
          ? 'counter block'
          : mode === 'OFB'
            ? b === 0
              ? 'IV'
              : 'previous keystream output'
            : b === 0
              ? 'IV'
              : 'previous ciphertext block'
      steps.push({
        index: steps.length,
        label: `Block ${blockNum} — ${mode} Keystream`,
        inputState: fromByteArray(cipherInput, 'hex'),
        outputState: fromByteArray(keystream, 'hex'),
        note: `Encrypted the ${sourceLabel} with the AES block cipher to produce this block's 16-byte keystream.`,
        isMilestone: b === 0,
      })
      steps.push({
        index: steps.length,
        label: `Block ${blockNum} — ${mode} XOR`,
        inputState: fromByteArray(inBlock, 'hex'),
        outputState: fromByteArray(outBlock, 'hex'),
        note: `XORed the ${decrypt ? 'ciphertext' : 'plaintext'} block with the keystream to recover the ${decrypt ? 'plaintext' : 'ciphertext'}.`,
      })
    }
  }

  return output
}

function aesStreamInstrumented(
  inputBytes: Uint8Array,
  keyBytes: Uint8Array,
  decrypt: boolean,
  mode: AesMode,
  iv: Uint8Array,
  ivProvided: boolean
): CipherResult {
  const start = performance.now()
  const roundKeys = expandKey(keyBytes)
  const steps: CipherStep[] = []

  steps.push({
    index: 0,
    label: 'AES Key Schedule Expansion',
    inputState: fromByteArray(keyBytes, 'hex'),
    outputState: `Generated ${roundKeys.length} round keys.`,
    note: `Key of size ${keyBytes.length} bytes expanded into ${roundKeys.length} round keys using Rijndael key schedule.`,
    isMilestone: true,
  })

  const ivLabel = mode === 'CTR' ? 'CTR Initial Counter Block' : `${mode} Initialization Vector (IV)`
  const ivNote =
    mode === 'CTR'
      ? 'The counter block starts here and is incremented (big-endian) for every subsequent block; each E(counter) forms the keystream.'
      : mode === 'OFB'
        ? 'The IV seeds the keystream feedback loop; each keystream block is fed back through AES to produce the next one, independent of the data.'
        : 'The IV seeds the feedback register; each ciphertext block is fed back through AES to mask the next plaintext block.'
  steps.push({
    index: steps.length,
    label: ivLabel,
    inputState: decrypt
      ? 'Extracted from ciphertext prefix'
      : ivProvided
        ? 'Caller-provided 16-byte IV'
        : 'Random 16-byte IV',
    outputState: fromByteArray(iv, 'hex'),
    note: ivNote,
    isMilestone: true,
  })

  const outputBytes = runStreamMode(inputBytes, roundKeys, mode, iv, decrypt, steps)

  steps.push({
    index: steps.length,
    label: `AES ${mode} ${decrypt ? 'Decryption' : 'Encryption'} Output`,
    inputState: `Total blocks: ${Math.ceil(inputBytes.length / 16)}`,
    outputState: fromByteArray(outputBytes, 'hex'),
    note: `Completed AES ${mode} ${decrypt ? 'decryption' : 'encryption'}.`,
    isMilestone: true,
  })

  return {
    output: fromByteArray(outputBytes, 'hex'),
    outputEncoding: 'hex',
    steps,
    metadata: { ...METADATA, modeOfOperation: mode },
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
  if (paddingVal < 1 || paddingVal > 16 || paddingVal > bytes.length) {
    throw new CipherError('INVALID_PADDING', 'Invalid PKCS7 padding value.')
  }
  for (let i = bytes.length - paddingVal; i < bytes.length; i++) {
    if (bytes[i] !== paddingVal) {
      throw new CipherError('INVALID_PADDING', 'Invalid PKCS7 padding bytes.')
    }
  }
  return bytes.slice(0, bytes.length - paddingVal)
}

function aesFast(
  inputBytes: Uint8Array,
  keyBytes: Uint8Array,
  decrypt: boolean,
  mode: AesMode,
  iv: Uint8Array | null
): CipherResult {
  const start = performance.now()
  const roundKeys = expandKey(keyBytes)

  if (isStreamMode(mode)) {
    const outputBytes = runStreamMode(inputBytes, roundKeys, mode, iv!, decrypt)
    return {
      output: fromByteArray(outputBytes, 'hex'),
      outputEncoding: 'hex',
      steps: [],
      metadata: { ...METADATA, modeOfOperation: mode },
      durationMs: performance.now() - start,
    }
  }

  const numBlocks = Math.ceil(inputBytes.length / 16)
  const outputBytes = new Uint8Array(numBlocks * 16)

  let prevBlock = mode === 'CBC' ? iv! : null

  for (let b = 0; b < numBlocks; b++) {
    const block = inputBytes.slice(b * 16, (b + 1) * 16)

    if (mode === 'ECB') {
      const resultBlock = processBlock(block, roundKeys, decrypt)
      outputBytes.set(resultBlock, b * 16)
    } else if (!decrypt) {
      // CBC encrypt: XOR plaintext with previous ciphertext (or IV), THEN encrypt
      const xored = xorBlocks(block, prevBlock!)
      const resultBlock = processBlock(xored, roundKeys, false)
      outputBytes.set(resultBlock, b * 16)
      prevBlock = resultBlock
    } else {
      // CBC decrypt: decrypt ciphertext, THEN XOR with previous ciphertext (or IV)
      const decrypted = processBlock(block, roundKeys, true)
      const resultBlock = xorBlocks(decrypted, prevBlock!)
      outputBytes.set(resultBlock, b * 16)
      prevBlock = block // previous *ciphertext* block, not the decrypted one
    }
  }

  return {
    output: fromByteArray(outputBytes, 'hex'),
    outputEncoding: 'hex',
    steps: [],
    metadata: { ...METADATA, modeOfOperation: mode },
    durationMs: performance.now() - start,
  }
}
function getKeyBytes(key: string): Uint8Array {
  let keyBytes: Uint8Array

  const normalizedLength = key.replace(/\s+/g, '').length
  if ([32, 48, 64].includes(normalizedLength)) {
    keyBytes = parseAndValidateHex(key, undefined, 'AES key')
  } else {
    keyBytes = toByteArray(key, 'utf8')
  }

  validateKeyLength(keyBytes, [16, 24, 32], 'AES')
  return keyBytes
}

/**
 * Encrypt symmetric cipher export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function encrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  validateRequiredInput(input)
  validateKey(key)

  const inEnc = options.encoding || 'utf8'
  const inputBytes = toByteArray(input, inEnc)

  const keyBytes = getKeyBytes(key)


  const mode = parseMode(options.mode)

  // Stream modes (CTR/CFB/OFB) are unpadded; block modes (ECB/CBC) use PKCS7.
  const processedInput = isStreamMode(mode) ? inputBytes : padPKCS7(inputBytes, 16)

  let iv: Uint8Array | null = null
  if (needsIv(mode)) {
    if (options.iv) {
      if (!/^[0-9a-fA-F]{32}$/.test(options.iv)) {
        throw new CipherError('INVALID_IV', 'AES IV must be exactly 32 hex characters (16 bytes).')
      }
      iv = toByteArray(options.iv, 'hex')
    } else {
      iv = new Uint8Array(16)
      crypto.getRandomValues(iv)
    }
  }

  let result: CipherResult
  if (options.instrument) {
    result = aesInstrumented(processedInput, keyBytes, false, mode, iv, !!options.iv)
  } else {
    result = aesFast(processedInput, keyBytes, false, mode, iv)
  }

  if (needsIv(mode)) {
    // Prepend IV (as hex) to the ciphertext so decrypt() can recover it
    const ivHex = fromByteArray(iv!, 'hex')
    return { ...result, output: ivHex + result.output }
  }

  return result
}

/**
 * Decrypt symmetric cipher export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function decrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  validateRequiredInput(input)
  validateKey(key)

  const mode = parseMode(options.mode)

  let iv: Uint8Array | null = null
  let cipherHex = input

  if (needsIv(mode)) {
    if (input.length < 32) {
      throw new CipherError('INVALID_INPUT', `${mode} ciphertext must include a 32-character hex IV prefix.`)
    }
    iv = parseAndValidateHex(input.slice(0, 32), 16, 'AES IV')
    cipherHex = input.slice(32)
  }

  const inputBytes = parseAndValidateHex(cipherHex, undefined, 'AES ciphertext')
  // Block modes need whole 16-byte blocks; stream modes accept any length.
  if (!isStreamMode(mode) && inputBytes.length % 16 !== 0) {
    throw new CipherError('INVALID_PADDING', 'AES ciphertext must be a multiple of 16 bytes.')
  }

  const keyBytes = getKeyBytes(key)
  let result: CipherResult
  if (options.instrument) {
    result = aesInstrumented(inputBytes, keyBytes, true, mode, iv)
  } else {
    result = aesFast(inputBytes, keyBytes, true, mode, iv)
  }
  const rawBytes = toByteArray(result.output, 'hex')
  // Stream modes are unpadded; only strip PKCS7 for block modes.
  const finalBytes = isStreamMode(mode) ? rawBytes : unpadPKCS7(rawBytes)

  const outEnc = options.encoding || 'utf8'

  return {
    ...result,
    output: fromByteArray(finalBytes, outEnc),
    outputEncoding: outEnc,
  }
}

/**
 * TEST VECTORS symmetric cipher export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: '6bc1bee22e409f96e93d7e117393172a',
    key: '2b7e151628aed2a6abf7158809cf4f3c',
    expected: 'randomized',
    description: 'AES-128 CBC mode (randomized IV prepended to ciphertext)',
  },
]
