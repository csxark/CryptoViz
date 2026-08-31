/**
 * One-Time Pad (OTP) Cipher.
 * @see CIPHER_ENGINE.md section 2.2
 *
 * OTP is theoretically unbreakable if the key is:
 * 1. Truly random
 * 2. At least as long as the plaintext
 * 3. Never reused
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput, validateKey, toByteArray, fromByteArray } from '../../utils'

const METADATA = {
  name: 'One-Time Pad',
  securityStatus: 'secure' as const,
  breakingComplexity: 'Mathematically unbreakable (information-theoretic security)',
  yearDesigned: 1882,
  reuseWarning: 'Key must never be reused (reusing an OTP key completely voids perfect secrecy)',
}

const usedKeyHashes = new Set<string>()

/**
 * Clear Otp Key History cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function clearOtpKeyHistory(): void {
  usedKeyHashes.clear()
}

function toBinary8(n: number): string {
  return n.toString(2).padStart(8, '0')
}

function hex(n: number): string {
  return n.toString(16).padStart(2, '0').toUpperCase()
}

function calculateEntropy(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0
  const counts = new Array(256).fill(0)
  for (const b of bytes) counts[b]++
  let entropy = 0
  for (const c of counts) {
    if (c > 0) {
      const p = c / bytes.length
      entropy -= p * Math.log2(p)
    }
  }
  return entropy
}

function otpInstrumented(
  inputBytes: Uint8Array,
  keyBytes: Uint8Array,
  _isDecrypt: boolean,
  isReused: boolean = false
): CipherStep[] {
  const steps: CipherStep[] = []
  const entropy = calculateEntropy(keyBytes)
  const maxEntropy = Math.log2(Math.min(keyBytes.length, 256)) || 8
  const randomnessRating = entropy > 0.9 * maxEntropy ? 'Excellent (High Entropy)' : 'Poor (Low Entropy/Non-random)'

  // Step 0: Entropy & Randomness & Key Reuse analysis
  steps.push({
    index: 0,
    label: 'Key Randomness & Uniqueness Analysis',
    inputState: `KEY LENGTH: ${keyBytes.length} bytes`,
    outputState: `ENTROPY: ${entropy.toFixed(4)} / ${maxEntropy.toFixed(4)} bits`,
    table: [
      { key: 'Key Entropy', value: `${entropy.toFixed(4)} / ${maxEntropy.toFixed(4)} bits` },
      { key: 'Randomness Rating', value: randomnessRating },
      { key: 'Key Reuse Check', value: isReused ? '⚠️ WARNING: Key reused!' : '✓ Unique key (first use in session)' },
      { key: 'Reuse Constraint', value: 'A one-time pad key must NEVER be reused across multiple messages.' },
    ],
    note: `One-Time Pad requires a truly random key used exactly once. Calculated Shannon entropy is ${entropy.toFixed(4)} bits per byte. Rating: ${randomnessRating}.${isReused ? ' ⚠️ WARNING: KEY REUSE DETECTED! Reusing an OTP key (two-time pad) allows C1 ⊕ C2 = P1 ⊕ P2, exposing plaintext patterns and completely destroying perfect secrecy (e.g. VENONA project).' : ' Warning: If this key is reused or generated using a predictable PRNG, security guarantees are void.'}`,
    isMilestone: true,
  })

  // Per-byte XOR steps
  for (let i = 0; i < inputBytes.length; i++) {
    const p = inputBytes[i]
    const k = keyBytes[i]
    const x = p ^ k

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

  // Final milestone explaining security properties
  steps.push({
    index: steps.length,
    label: 'Perfect Secrecy',
    inputState: '',
    outputState: '',
    note: 'Because the key is as long as the message and completely random, the ciphertext contains absolutely zero information about the plaintext. Given any ciphertext, all plaintexts of that length are equally likely. This is called perfect secrecy. MANDATORY SECURITY CONDITION: This guarantee holds ONLY if the key is used EXACTLY ONCE. Reusing a key completely destroys perfect secrecy.',
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
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
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
  const outEnc = 'hex'

  const inputBytes = toByteArray(input, inEnc)
  // OTP key can be provided as hex or plain text. Let's try parsing as hex first if it is a valid hex key of matching length.
  let keyBytes: Uint8Array
  try {
    keyBytes = toByteArray(key, 'hex')
  } catch {
    keyBytes = toByteArray(key, 'utf8')
  }

  if (keyBytes.length < inputBytes.length) {
    throw new CipherError(
      'INVALID_KEY_LENGTH',
      `One-time pad key must be at least as long as the plaintext (key size: ${keyBytes.length} bytes, input size: ${inputBytes.length} bytes).`
    )
  }

  const keyHex = fromByteArray(keyBytes, 'hex')
  const isReused = usedKeyHashes.has(keyHex)
  usedKeyHashes.add(keyHex)

  const outputBytes = new Uint8Array(inputBytes.length)
  for (let i = 0; i < inputBytes.length; i++) {
    outputBytes[i] = inputBytes[i] ^ keyBytes[i]
  }

  const steps = options.instrument
    ? otpInstrumented(inputBytes, keyBytes, false, isReused)
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
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  validateInput(input)
  validateKey(key)

  const start = performance.now()
  const inEnc = 'hex'
  const outEnc = options.encoding || 'utf8'

  const inputBytes = toByteArray(input, inEnc)
  let keyBytes: Uint8Array
  try {
    keyBytes = toByteArray(key, 'hex')
  } catch {
    keyBytes = toByteArray(key, 'utf8')
  }

  if (keyBytes.length < inputBytes.length) {
    throw new CipherError(
      'INVALID_KEY_LENGTH',
      `One-time pad key must be at least as long as the ciphertext (key size: ${keyBytes.length} bytes, input size: ${inputBytes.length} bytes).`
    )
  }

  const keyHex = fromByteArray(keyBytes, 'hex')
  const isReused = usedKeyHashes.has(keyHex)

  const outputBytes = new Uint8Array(inputBytes.length)
  for (let i = 0; i < inputBytes.length; i++) {
    outputBytes[i] = inputBytes[i] ^ keyBytes[i]
  }

  const steps = options.instrument
    ? otpInstrumented(inputBytes, keyBytes, true, isReused)
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
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
  { input: 'hello', key: '030015070a', expected: '6b65796b65' },
]

