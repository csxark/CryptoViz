/**
 * XOR Cipher — basic symmetric byte-level XOR.
 * @see CIPHER_ENGINE.md section 2.1
 *
 * Encrypt: C(i) = P(i) XOR K(i mod |key|)
 * Decrypt: P(i) = C(i) XOR K(i mod |key|)
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput, validateKey, toByteArray, fromByteArray } from '../../utils'

const METADATA = {
  name: 'XOR Cipher',
  securityStatus: 'broken' as const,
  breakingComplexity: 'Repeating key XOR is broken via frequency analysis / key length estimation',
  yearDesigned: 1917,
}

function toBinary8(n: number): string {
  return n.toString(2).padStart(8, '0')
}

function hex(n: number): string {
  return n.toString(16).padStart(2, '0').toUpperCase()
}

function xorInstrumented(
  inputBytes: Uint8Array,
  keyBytes: Uint8Array,
  _isDecrypt: boolean
): CipherStep[] {
  const steps: CipherStep[] = []

  // Step 0: key setup
  steps.push({
    index: 0,
    label: 'Key setup',
    inputState: `KEY LENGTH: ${keyBytes.length} bytes`,
    outputState: `INPUT LENGTH: ${inputBytes.length} bytes`,
    note: `Key will repeat every ${keyBytes.length} bytes.`,
    isMilestone: true,
  })

  // Per-byte XOR steps
  const outBytes = new Uint8Array(inputBytes.length)
  for (let i = 0; i < inputBytes.length; i++) {
    const p = inputBytes[i]
    const k = keyBytes[i % keyBytes.length]
    const x = p ^ k
    outBytes[i] = x

    steps.push({
      index: i + 1,
      label: `Byte ${i} XOR`,
      inputState: toBinary8(p),
      outputState: toBinary8(x),
      highlight: [i],
      table: [
        { key: 'Plaintext byte', value: `${toBinary8(p)} (0x${hex(p)})` },
        { key: 'Key byte', value: `${toBinary8(k)} (0x${hex(k)})` },
        { key: 'XOR result', value: `${toBinary8(x)} (0x${hex(x)})` },
      ],
      note: `${hex(p)} XOR ${hex(k)} = ${hex(x)}`,
    })
  }

  // Final milestone explaining why it is broken
  steps.push({
    index: steps.length,
    label: 'Security Analysis',
    inputState: '',
    outputState: '',
    note: 'Repeating-key XOR is insecure. If the key is shorter than the plaintext, the key length can be found using the Index of Coincidence. Once key length L is known, the ciphertext can be split into L independent Caesar/substitution ciphers and solved using frequency analysis.',
    isMilestone: true,
  })

  return steps
}

/**
 * Encrypt cipher-engine utility export.
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
  validateInput(input)
  validateKey(key)

  const start = performance.now()
  const inEnc = options.encoding || 'utf8'
  const outEnc = 'hex' // XOR ciphertext is binary, output to hex by default

  const inputBytes = toByteArray(input, inEnc)
  const keyBytes = toByteArray(key, 'utf8')

  if (keyBytes.length === 0) {
    throw new CipherError('INVALID_KEY', 'XOR key cannot be empty.')
  }

  const outputBytes = new Uint8Array(inputBytes.length)
  for (let i = 0; i < inputBytes.length; i++) {
    outputBytes[i] = inputBytes[i] ^ keyBytes[i % keyBytes.length]
  }

  const steps = options.instrument
    ? xorInstrumented(inputBytes, keyBytes, false)
    : []

  return {
    output: fromByteArray(outputBytes, outEnc),
    outputEncoding: outEnc,
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

/**
 * Decrypt cipher-engine utility export.
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
  validateInput(input)
  validateKey(key)

  const start = performance.now()
  const inEnc = 'hex' // Decrypting XOR assumes input was hex encoded
  const outEnc = options.encoding || 'utf8'

  const inputBytes = toByteArray(input, inEnc)
  const keyBytes = toByteArray(key, 'utf8')

  if (keyBytes.length === 0) {
    throw new CipherError('INVALID_KEY', 'XOR key cannot be empty.')
  }

  const outputBytes = new Uint8Array(inputBytes.length)
  for (let i = 0; i < inputBytes.length; i++) {
    outputBytes[i] = inputBytes[i] ^ keyBytes[i % keyBytes.length]
  }

  const steps = options.instrument
    ? xorInstrumented(inputBytes, keyBytes, true)
    : []

  return {
    output: fromByteArray(outputBytes, outEnc),
    outputEncoding: outEnc,
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
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export const TEST_VECTORS: TestVector[] = [
  { input: 'hello', key: 'key', expected: '030015070a' },
]
