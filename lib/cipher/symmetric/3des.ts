/**
 * Triple DES (3DES / TDES).
 * FIPS 46-3 / FIPS 81 compliant implementation.
 * @see CIPHER_ENGINE.md section 2.3
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput, validateKey, toByteArray, fromByteArray } from '../../utils'
import * as des from './des'

const METADATA = {
  name: '3DES (Triple Data Encryption Standard)',
  securityStatus: 'legacy' as const,
  breakingComplexity: '2^112 keys (meet-in-the-middle attack)',
  yearDesigned: 1998,
  standardBody: 'NIST / FIPS 46-3',
  blockSize: 8,
  keySize: 24, // Or 16
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

// Parse key bytes into 3 separate DES subkeys
function parseKeys(keyBytes: Uint8Array): {
  subkeys1: [number, number][]
  subkeys2: [number, number][]
  subkeys3: [number, number][]
} {
  let k1: Uint8Array
  let k2: Uint8Array
  let k3: Uint8Array

  if (keyBytes.length === 24) {
    // 3-key mode
    k1 = keyBytes.slice(0, 8)
    k2 = keyBytes.slice(8, 16)
    k3 = keyBytes.slice(16, 24)
  } else if (keyBytes.length === 16) {
    // 2-key mode (K3 = K1)
    k1 = keyBytes.slice(0, 8)
    k2 = keyBytes.slice(8, 16)
    k3 = k1
  } else if (keyBytes.length === 8) {
    // Single DES mode (K1 = K2 = K3)
    k1 = keyBytes
    k2 = keyBytes
    k3 = keyBytes
  } else {
    throw new CipherError('INVALID_KEY_LENGTH', `3DES key must be 16 or 24 bytes (got ${keyBytes.length} bytes).`)
  }

  return {
    subkeys1: des.generateSubkeys(k1),
    subkeys2: des.generateSubkeys(k2),
    subkeys3: des.generateSubkeys(k3),
  }
}

function tdesBlock(
  block: [number, number],
  subkeys1: [number, number][],
  subkeys2: [number, number][],
  subkeys3: [number, number][],
  decrypt: boolean
): [number, number] {
  if (!decrypt) {
    // Encrypt: E_k3( D_k2( E_k1( P ) ) )
    const step1 = des.processBlock(block, subkeys1, false)
    const step2 = des.processBlock(step1, subkeys2, true)
    return des.processBlock(step2, subkeys3, false)
  } else {
    // Decrypt: D_k1( E_k2( D_k3( C ) ) )
    const step1 = des.processBlock(block, subkeys3, true)
    const step2 = des.processBlock(step1, subkeys2, false)
    return des.processBlock(step2, subkeys1, true)
  }
}

function tdesInstrumented(
  inputBytes: Uint8Array,
  keyBytes: Uint8Array,
  decrypt: boolean
): CipherResult {
  const start = performance.now()
  const { subkeys1, subkeys2, subkeys3 } = parseKeys(keyBytes)

  const steps: CipherStep[] = []
  const numBlocks = Math.ceil(inputBytes.length / 8)
  const outputBytes = new Uint8Array(numBlocks * 8)

  steps.push({
    index: 0,
    label: 'Triple DES setup',
    inputState: `INPUT LENGTH: ${inputBytes.length} bytes`,
    outputState: `KEY LENGTH: ${keyBytes.length} bytes`,
    note: `Using ${keyBytes.length === 24 ? '3-key' : '2-key'} Triple DES mode (Encrypt-Decrypt-Encrypt).`,
    isMilestone: true,
  })

  for (let b = 0; b < numBlocks; b++) {
    const blockBytes = inputBytes.slice(b * 8, (b + 1) * 8)
    const block = des.bytesToBlock(blockBytes, 0)

    const isFirstBlock = b === 0

    if (isFirstBlock) {
      // Step-by-step 3DES flow for the first block
      const step1 = des.processBlock(block, decrypt ? subkeys3 : subkeys1, decrypt)
      steps.push({
        index: steps.length,
        label: `Block 1 — Stage 1 (${decrypt ? 'Decrypt K3' : 'Encrypt K1'})`,
        inputState: fromByteArray(blockBytes, 'hex'),
        outputState: fromByteArray(new Uint8Array([
          (step1[0] >>> 24) & 0xff, (step1[0] >>> 16) & 0xff, (step1[0] >>> 8) & 0xff, step1[0] & 0xff,
          (step1[1] >>> 24) & 0xff, (step1[1] >>> 16) & 0xff, (step1[1] >>> 8) & 0xff, step1[1] & 0xff
        ]), 'hex'),
        note: `First stage of Triple DES block 1 processing.`,
      })

      const step2 = des.processBlock(step1, subkeys2, !decrypt)
      steps.push({
        index: steps.length,
        label: `Block 1 — Stage 2 (${decrypt ? 'Encrypt K2' : 'Decrypt K2'})`,
        inputState: steps[steps.length - 1].outputState,
        outputState: fromByteArray(new Uint8Array([
          (step2[0] >>> 24) & 0xff, (step2[0] >>> 16) & 0xff, (step2[0] >>> 8) & 0xff, step2[0] & 0xff,
          (step2[1] >>> 24) & 0xff, (step2[1] >>> 16) & 0xff, (step2[1] >>> 8) & 0xff, step2[1] & 0xff
        ]), 'hex'),
        note: `Second stage (middle) of Triple DES block 1 processing.`,
      })

      const finalBlock = des.processBlock(step2, decrypt ? subkeys1 : subkeys3, decrypt)
      des.blockToBytes(finalBlock, outputBytes, 0)
      steps.push({
        index: steps.length,
        label: `Block 1 — Stage 3 (${decrypt ? 'Decrypt K1' : 'Encrypt K3'})`,
        inputState: steps[steps.length - 1].outputState,
        outputState: fromByteArray(outputBytes.slice(0, 8), 'hex'),
        note: `Third stage (final) of Triple DES block 1 processing.`,
        isMilestone: true,
      })
    } else {
      const finalBlock = tdesBlock(block, subkeys1, subkeys2, subkeys3, decrypt)
      des.blockToBytes(finalBlock, outputBytes, b * 8)
      steps.push({
        index: steps.length,
        label: `Block ${b + 1} Computation`,
        inputState: fromByteArray(blockBytes, 'hex'),
        outputState: fromByteArray(outputBytes.slice(b * 8, (b + 1) * 8), 'hex'),
        note: `Triple DES processed for block ${b + 1}.`,
        isMilestone: true,
      })
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

function tdesFast(
  inputBytes: Uint8Array,
  keyBytes: Uint8Array,
  decrypt: boolean
): CipherResult {
  const start = performance.now()
  const { subkeys1, subkeys2, subkeys3 } = parseKeys(keyBytes)

  const numBlocks = Math.ceil(inputBytes.length / 8)
  const outputBytes = new Uint8Array(numBlocks * 8)

  for (let b = 0; b < numBlocks; b++) {
    const block = des.bytesToBlock(inputBytes, b * 8)
    const resultBlock = tdesBlock(block, subkeys1, subkeys2, subkeys3, decrypt)
    des.blockToBytes(resultBlock, outputBytes, b * 8)
  }

  return {
    output: fromByteArray(outputBytes, 'hex'),
    outputEncoding: 'hex',
    steps: [],
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

  const inEnc = options.encoding || 'utf8'
  const inputBytes = toByteArray(input, inEnc)

  let keyBytes = toByteArray(key, 'utf8')
  const isHex16or24 = /^[0-9a-fA-F]{32}$/.test(key) || /^[0-9a-fA-F]{48}$/.test(key)
  if (keyBytes.length !== 16 && keyBytes.length !== 24 && isHex16or24) {
    keyBytes = toByteArray(key, 'hex')
  }

  if (keyBytes.length !== 16 && keyBytes.length !== 24) {
    throw new CipherError('INVALID_KEY_LENGTH', `3DES key must be exactly 16 or 24 bytes (got ${keyBytes.length} bytes).`)
  }

  const paddedInput = padPKCS7(inputBytes, 8)

  if (options.instrument) {
    return tdesInstrumented(paddedInput, keyBytes, false)
  }
  return tdesFast(paddedInput, keyBytes, false)
}

export function decrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  validateInput(input)
  validateKey(key)

  const inputBytes = toByteArray(input, 'hex')
  if (inputBytes.length % 8 !== 0) {
    throw new CipherError('INVALID_PADDING', '3DES ciphertext must be a multiple of 8 bytes.')
  }

  let keyBytes = toByteArray(key, 'utf8')
  const isHex16or24 = /^[0-9a-fA-F]{32}$/.test(key) || /^[0-9a-fA-F]{48}$/.test(key)
  if (keyBytes.length !== 16 && keyBytes.length !== 24 && isHex16or24) {
    keyBytes = toByteArray(key, 'hex')
  }

  if (keyBytes.length !== 16 && keyBytes.length !== 24) {
    throw new CipherError('INVALID_KEY_LENGTH', `3DES key must be exactly 16 or 24 bytes (got ${keyBytes.length} bytes).`)
  }

  let result: CipherResult
  if (options.instrument) {
    result = tdesInstrumented(inputBytes, keyBytes, true)
  } else {
    result = tdesFast(inputBytes, keyBytes, true)
  }

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
  // FIPS 81 vector can be verified in the test file.
]
