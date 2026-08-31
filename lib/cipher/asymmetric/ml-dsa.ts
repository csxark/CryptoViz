/**
 * ML-DSA-65 (Dilithium) — NIST FIPS 204, post-quantum digital signatures.
 *
 * This adapter keeps the application-facing cipher interface stable while
 * mapping it to the @noble/post-quantum ML-DSA-65 API.
 *
 * IMPORTANT:
 *   ml_dsa65.sign(message, secretKey)
 *   ml_dsa65.verify(signature, message, publicKey)
 *
 * The order above is intentional. The noble API does not accept the
 * application convention of (key, message), so keeping the conversion in
 * this module prevents callers from accidentally swapping arguments.
 */

import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js'
import { CipherError } from '../../utils/errors'
import { toByteArray } from '../../utils/encoding'
import type {
  CipherResult,
  CipherStep,
  CipherMetadata,
  CipherOptions,
  TestVector,
} from '../types'

/**
 * FIPS 204 / ML-DSA-65 sizes.
 *
 * Keeping these values local makes malformed-key handling deterministic before
 * control reaches the third-party implementation. It also gives the
 * visualizer enough information to explain the post-quantum size trade-offs.
 */
export const ML_DSA_65_PUBLIC_KEY_BYTES = 1952
/**
 * ML DSA 65 SECRET KEY BYTES cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const ML_DSA_65_SECRET_KEY_BYTES = 4032
/**
 * ML DSA 65 SIGNATURE BYTES cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const ML_DSA_65_SIGNATURE_BYTES = 3309

const ML_DSA_65_PUBLIC_KEY_HEX_LENGTH = ML_DSA_65_PUBLIC_KEY_BYTES * 2
const ML_DSA_65_SECRET_KEY_HEX_LENGTH = ML_DSA_65_SECRET_KEY_BYTES * 2
const ML_DSA_65_SIGNATURE_HEX_LENGTH = ML_DSA_65_SIGNATURE_BYTES * 2

const VERIFY_SEPARATOR = '|'
const PREVIEW_HEX_BYTES = 16

const METADATA: CipherMetadata = {
  name: 'ML-DSA-65',
  keySize: ML_DSA_65_PUBLIC_KEY_BYTES * 8,
  securityStatus: 'secure',
  yearDesigned: 2024,
  standardBody: 'NIST FIPS 204',
}

/**
 * Convert bytes to lower-case hexadecimal.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Decode a hexadecimal string.
 *
 * Whitespace is accepted because keys and signatures are commonly copied from
 * terminals or documentation with line wrapping. No other normalization is
 * performed.
 */
export function hexToBytes(hex: string, field = 'Input'): Uint8Array {
  const clean = hex.replace(/\s+/g, '')

  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new CipherError(
      'INVALID_INPUT',
      `${field} must be an even-length hexadecimal string.`,
    )
  }

  const output = new Uint8Array(clean.length / 2)

  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number.parseInt(clean.slice(index * 2, index * 2 + 2), 16)
  }

  return output
}

function preview(bytes: Uint8Array): string {
  return bytesToHex(bytes).slice(0, PREVIEW_HEX_BYTES * 2)
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

function ensureHexLength(
  value: string,
  expectedHexLength: number,
  field: string,
): Uint8Array {
  const bytes = hexToBytes(value, field)

  if (value.replace(/\s+/g, '').length !== expectedHexLength) {
    const expectedBytes = expectedHexLength / 2
    throw new CipherError(
      'INVALID_KEY_LENGTH',
      `${field} must be exactly ${expectedBytes} bytes (${expectedHexLength} hex characters).`,
    )
  }

  return bytes
}

function ensureSecretKey(value: string): Uint8Array {
  return ensureHexLength(
    value,
    ML_DSA_65_SECRET_KEY_HEX_LENGTH,
    'ML-DSA-65 secret key',
  )
}

function ensurePublicKey(value: string): Uint8Array {
  return ensureHexLength(
    value,
    ML_DSA_65_PUBLIC_KEY_HEX_LENGTH,
    'ML-DSA-65 public key',
  )
}

function ensureSignature(value: string): Uint8Array {
  return ensureHexLength(
    value,
    ML_DSA_65_SIGNATURE_HEX_LENGTH,
    'ML-DSA-65 signature',
  )
}

/**
 * Parse the public-key/signature pair used by the generic decrypt interface.
 *
 * The generic cipher UI passes one string as the key argument. A literal
 * separator is used instead of JSON so the value remains easy to copy.
 */
export function parseVerificationKey(
  value: string,
): { publicKey: Uint8Array; signature: Uint8Array } {
  const parts = value.split(VERIFY_SEPARATOR).map((part) => part.trim())

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new CipherError(
      'INVALID_KEY',
      `Verify expects "publicKeyHex${VERIFY_SEPARATOR}signatureHex".`,
    )
  }

  return {
    publicKey: ensurePublicKey(parts[0]),
    signature: ensureSignature(parts[1]),
  }
}

function createStep(
  index: number,
  label: string,
  inputState: string,
  outputState: string,
  note: string,
  isMilestone = false,
): CipherStep {
  return {
    index,
    label,
    inputState,
    outputState,
    note,
    isMilestone,
  }
}

function createMetadataNote(): string {
  return [
    'ML-DSA-65 / FIPS 204',
    `public key: ${ML_DSA_65_PUBLIC_KEY_BYTES} bytes`,
    `secret key: ${ML_DSA_65_SECRET_KEY_BYTES} bytes`,
    `signature: ${ML_DSA_65_SIGNATURE_BYTES} bytes`,
  ].join('; ')
}

function createKeyGenerationStep(publicKey: Uint8Array): CipherStep {
  return createStep(
    0,
    'Key generation',
    '(none supplied)',
    `public key: ${preview(publicKey)}… (${publicKey.length} bytes total)`,
    [
      'No private key was supplied, so a fresh ML-DSA-65 keypair was generated.',
      createMetadataNote(),
      'The large key and signature sizes are an intentional post-quantum trade-off.',
    ].join(' '),
    true,
  )
}

function createSignStep(
  index: number,
  message: string,
  signature: Uint8Array,
): CipherStep {
  return createStep(
    index,
    'Sign',
    message,
    `${preview(signature)}… (${signature.length} bytes total)`,
    [
      'The message bytes are passed as the first argument to ml_dsa65.sign.',
      'The ML-DSA secret key is passed as the second argument.',
      'This ordering matches @noble/post-quantum and is the regression fixed by issue #1447.',
    ].join(' '),
    true,
  )
}

function createVerifyStep(
  signature: Uint8Array,
  valid: boolean,
): CipherStep {
  return createStep(
    0,
    'Verify',
    `${preview(signature)}…`,
    valid ? 'VALID' : 'INVALID',
    [
      'The signature is passed first to ml_dsa65.verify.',
      'The message bytes are passed second.',
      'The ML-DSA public key is passed third.',
      `Result: ${valid ? 'valid' : 'invalid'}.`,
    ].join(' '),
    true,
  )
}

function createResult(
  output: string,
  outputEncoding: 'hex' | 'utf8',
  steps: CipherStep[],
  start: number,
): CipherResult {
  return {
    output,
    outputEncoding,
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

/**
 * Sign a message with ML-DSA-65.
 *
 * When privateKeyHex is empty, a fresh keypair is generated for compatibility
 * with the existing CryptoViz UI. Callers that need the matching public key
 * should use generateKeypair() explicitly.
 */
export function signCore(
  message: string,
  privateKeyHex: string,
  instrument: boolean,
): CipherResult {
  const start = performance.now()
  const steps: CipherStep[] = []
  let privateKey: Uint8Array

  if (!privateKeyHex.trim()) {
    const generated = ml_dsa65.keygen()
    privateKey = generated.secretKey

    if (instrument) {
      steps.push(createKeyGenerationStep(generated.publicKey))
    }
  } else {
    privateKey = ensureSecretKey(privateKeyHex)
  }

  const messageBytes = toByteArray(message, 'utf8')

  /*
   * Regression fix for #1447:
   *
   * noble's contract is sign(message, secretKey). The old implementation
   * called sign(secretKey, message), making the message look like the secret
   * key and producing:
   *
   *   "secretKey" expected Uint8Array of length 4032, got length=...
   *
   * Do not reorder these arguments.
   */
  const signature = ml_dsa65.sign(messageBytes, privateKey)

  if (instrument) {
    steps.push(createSignStep(steps.length, message, signature))
  }

  return createResult(bytesToHex(signature), 'hex', steps, start)
}

/**
 * Verify a message/signature pair.
 */
export function verifyCore(
  message: string,
  pubKeyAndSig: string,
  instrument: boolean,
): CipherResult {
  const start = performance.now()
  const { publicKey, signature } = parseVerificationKey(pubKeyAndSig)
  const messageBytes = toByteArray(message, 'utf8')

  /*
   * Regression fix for #1447:
   *
   * noble's contract is verify(signature, message, publicKey). The old
   * adapter supplied (publicKey, message, signature), so verification could
   * never reach the intended cryptographic check.
   */
  const valid = ml_dsa65.verify(signature, messageBytes, publicKey)

  const steps: CipherStep[] = []

  if (instrument) {
    steps.push(createVerifyStep(signature, valid))
  }

  if (!valid) {
    throw new CipherError(
      'INVALID_INPUT',
      'VERIFICATION_FAILED: ML-DSA-65 signature verification failed.',
    )
  }

  return createResult(message, 'utf8', steps, start)
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
  options: CipherOptions = {},
): CipherResult {
  return signCore(input, key, !!options.instrument)
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
  options: CipherOptions = {},
): CipherResult {
  return verifyCore(input, key, !!options.instrument)
}

/**
 * Generate Keypair cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function generateKeypair(): {
  publicKey: string
  privateKey: string
} {
  const { publicKey, secretKey } = ml_dsa65.keygen()

  return {
    publicKey: bytesToHex(publicKey),
    privateKey: bytesToHex(secretKey),
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
export const TEST_VECTORS: TestVector[] = []

/**
 * The following exported constants are intentionally small, pure helpers for
 * consumers that want to present ML-DSA constraints without duplicating magic
 * numbers in UI code.
 */
export const ML_DSA_65 = {
  name: 'ML-DSA-65',
  standard: 'NIST FIPS 204',
  publicKeyBytes: ML_DSA_65_PUBLIC_KEY_BYTES,
  secretKeyBytes: ML_DSA_65_SECRET_KEY_BYTES,
  signatureBytes: ML_DSA_65_SIGNATURE_BYTES,
  publicKeyHexLength: ML_DSA_65_PUBLIC_KEY_HEX_LENGTH,
  secretKeyHexLength: ML_DSA_65_SECRET_KEY_HEX_LENGTH,
  signatureHexLength: ML_DSA_65_SIGNATURE_HEX_LENGTH,
} as const

/**
 * Is Valid Public Key Hex cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param value Input required by the Is Valid Public Key Hex operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function isValidPublicKeyHex(value: string): boolean {
  try {
    ensurePublicKey(value)
    return true
  } catch {
    return false
  }
}

/**
 * Is Valid Secret Key Hex cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param value Input required by the Is Valid Secret Key Hex operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function isValidSecretKeyHex(value: string): boolean {
  try {
    ensureSecretKey(value)
    return true
  } catch {
    return false
  }
}

/**
 * Is Valid Signature Hex cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param value Input required by the Is Valid Signature Hex operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function isValidSignatureHex(value: string): boolean {
  try {
    ensureSignature(value)
    return true
  } catch {
    return false
  }
}

/**
 * Get Message Byte Length cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param message Input required by the Get Message Byte Length operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function getMessageByteLength(message: string): number {
  return byteLength(message)
}

/**
 * Get Signature Byte Length cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param signatureHex Input required by the Get Signature Byte Length operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function getSignatureByteLength(signatureHex: string): number {
  return ensureSignature(signatureHex).length
}

/**
 * Get Public Key Byte Length cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param publicKeyHex Input required by the Get Public Key Byte Length operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function getPublicKeyByteLength(publicKeyHex: string): number {
  return ensurePublicKey(publicKeyHex).length
}

/**
 * Get Secret Key Byte Length cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param secretKeyHex Input required by the Get Secret Key Byte Length operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function getSecretKeyByteLength(secretKeyHex: string): number {
  return ensureSecretKey(secretKeyHex).length
}

/**
 * Validate a complete verification package without performing verification.
 * This is useful for UI validation and makes the expected serialization
 * contract explicit.
 */
export function validateVerificationPackage(value: string): {
  publicKeyBytes: number
  signatureBytes: number
} {
  const { publicKey, signature } = parseVerificationKey(value)

  return {
    publicKeyBytes: publicKey.length,
    signatureBytes: signature.length,
  }
}

/**
 * Build the generic key field consumed by decrypt().
 */
export function formatVerificationKey(
  publicKeyHex: string,
  signatureHex: string,
): string {
  const publicKey = ensurePublicKey(publicKeyHex)
  const signature = ensureSignature(signatureHex)

  return `${bytesToHex(publicKey)}${VERIFY_SEPARATOR}${bytesToHex(signature)}`
}

/**
 * Return a short human-readable description for the educational UI.
 */
export function describeAlgorithm(): string {
  return [
    'ML-DSA-65 is a post-quantum digital signature scheme standardized by NIST.',
    `Public keys are ${ML_DSA_65_PUBLIC_KEY_BYTES} bytes.`,
    `Secret keys are ${ML_DSA_65_SECRET_KEY_BYTES} bytes.`,
    `Signatures are ${ML_DSA_65_SIGNATURE_BYTES} bytes.`,
    'CryptoViz uses the @noble/post-quantum implementation.',
  ].join(' ')
}

/**
 * Produce a stable summary suitable for instrumentation panels.
 */
export function summarizeSignature(signatureHex: string): {
  bytes: number
  hexCharacters: number
  preview: string
} {
  const signature = ensureSignature(signatureHex)

  return {
    bytes: signature.length,
    hexCharacters: signatureHex.replace(/\s+/g, '').length,
    preview: preview(signature),
  }
}

/**
 * Produce a stable summary suitable for key diagnostics.
 */
export function summarizePublicKey(publicKeyHex: string): {
  bytes: number
  hexCharacters: number
  preview: string
} {
  const publicKey = ensurePublicKey(publicKeyHex)

  return {
    bytes: publicKey.length,
    hexCharacters: publicKeyHex.replace(/\s+/g, '').length,
    preview: preview(publicKey),
  }
}

/**
 * Produce a stable summary suitable for secret-key diagnostics.
 *
 * This intentionally never returns the secret material itself.
 */
export function summarizeSecretKey(secretKeyHex: string): {
  bytes: number
  hexCharacters: number
} {
  const secretKey = ensureSecretKey(secretKeyHex)

  return {
    bytes: secretKey.length,
    hexCharacters: secretKeyHex.replace(/\s+/g, '').length,
  }
}
