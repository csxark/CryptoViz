/**
 * Ed25519 (EdDSA) — Edwards-curve Digital Signature Algorithm over Curve25519.
 * @see CIPHER_ENGINE.md section "Ed25519"
 * @see RFC 8032
 *
 * Unlike ECDSA (the 'ecc' cipher in this registry, which needs a fresh external random
 * nonce per signature and breaks catastrophically on nonce reuse — see the 2010 Sony
 * PS3 signing-key leak), EdDSA derives its per-message nonce DETERMINISTICALLY from the
 * private key and the message via SHA-512. Signing the same message twice with the same
 * key always produces the identical signature — no external randomness required, and no
 * nonce-reuse failure mode exists at all.
 *
 * Follows the same encrypt-signs / decrypt-verifies contract this repo's ecc.ts already
 * established: encrypt(message, privateKeyHex) -> signature hex. decrypt(message,
 * "sigHex,pubKeyHex" or JSON) -> 'valid' | 'invalid'.
 *
 * Ed25519 signatures are always exactly 64 raw bytes (32-byte R + 32-byte s) — no DER
 * encoding step, unlike ECDSA.
 */

import { ed25519 } from '@noble/curves/ed25519.js'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'Ed25519 (EdDSA)',
  securityStatus: 'secure',
  yearDesigned: 2011,
  standardBody: 'RFC 8032',
}

// RFC 8032 section 7.1, test vector 2 — verified locally against the installed
// @noble/curves version before writing this file.
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
    input: 'r', // single byte 0x72, RFC 8032 test vector 2's message
    key: '4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb',
    expected:
      '92a009a9f0d4cab8720e820b5f642540a2b27b5416503f8fb3762223ebdb69da085ac1e43e15996e458f3613d0f11d8c387b2eaeb4302aeeb00d291612bb0c00',
    description: 'RFC 8032 section 7.1, test vector 2',
  },
  {
    input: 'hello',
    key: '0101010101010101010101010101010101010101010101010101010101010101'.slice(0, 64),
    expected:
      'e1430c6ebd0d53573b5c803452174f8991ef5955e0906a09e8fdc7310459e9c82a402526748c3431fe7f0e5faafbf7e703234789734063ee42be17af16438d08',
    description: 'Self-generated vector — fixed demo seed (all 0x01 bytes), message "hello"',
  },
]

function parsePrivateKey(key: string): Uint8Array {
  if (!key) {
    return ed25519.utils.randomSecretKey()
  }
  let skBytes: Uint8Array
  try {
    skBytes = toByteArray(key.trim(), 'hex')
  } catch {
    throw new CipherError('INVALID_KEY', 'Private key must be a valid hex string.')
  }
  if (skBytes.length !== 32) {
    throw new CipherError('INVALID_KEY', `Ed25519 private key must be 32 bytes (64 hex characters), got ${skBytes.length} bytes.`)
  }
  return skBytes
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
export function encrypt(input: string, key: string = '', options: CipherOptions = {}): CipherResult {
  if (input === undefined || input === null || input === '') {
    throw new CipherError('INPUT_REQUIRED', 'Message input is required.')
  }
  const start = performance.now()

  const skBytes = parsePrivateKey(key)
  const pubBytes = ed25519.getPublicKey(skBytes)
  const skHex = fromByteArray(skBytes, 'hex')
  const pubHex = fromByteArray(pubBytes, 'hex')

  const msgBytes = toByteArray(input, options.encoding || 'utf8')
  const sigBytes = ed25519.sign(msgBytes, skBytes)
  const sigHex = fromByteArray(sigBytes, 'hex')

  const steps: CipherStep[] = []
  if (options.instrument) {
    steps.push({
      index: 0,
      label: 'Key setup',
      inputState: skHex,
      outputState: pubHex,
      note: 'Hashed the 32-byte private seed with SHA-512, clamped the low half into a valid curve scalar, and multiplied it by the base point G to get the public key.',
      isMilestone: true,
    })
    steps.push({
      index: 1,
      label: 'Deterministic nonce derivation',
      inputState: fromByteArray(msgBytes, 'hex'),
      outputState: '',
      note: 'Derived a per-message nonce r deterministically from SHA-512(nonce-half of key || message) — no external randomness, so this exact message+key pair always yields the same signature.',
    })
    steps.push({
      index: 2,
      label: 'Signature generation (R, s)',
      inputState: '',
      outputState: sigHex,
      table: [
        { key: 'R (first 32 bytes)', value: sigHex.slice(0, 64) },
        { key: 's (last 32 bytes)', value: sigHex.slice(64) },
      ],
      note: 'Computed R = r*G, then s = r + SHA-512(R || publicKey || message) * privateScalar (mod curve order). Signature = R || s, 64 bytes total.',
      isMilestone: true,
    })
  }

  return {
    output: sigHex,
    outputEncoding: 'hex',
    steps,
    metadata: { ...METADATA, keySize: 256 },
    durationMs: performance.now() - start,
  }
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
  if (input === undefined || input === null || input === '') {
    throw new CipherError('INPUT_REQUIRED', 'Message input is required.')
  }
  if (!key) {
    throw new CipherError('INVALID_KEY', 'Verification key ("signatureHex,publicKeyHex") is required.')
  }
  const start = performance.now()

  let sigHex = ''
  let pubKeyHex = ''
  try {
    const parsed = JSON.parse(key)
    if (parsed.signature && parsed.publicKey) {
      sigHex = parsed.signature.trim()
      pubKeyHex = parsed.publicKey.trim()
    }
  } catch {
    const parts = key.split(/[\s,]+/).map((p) => p.trim()).filter(Boolean)
    if (parts.length >= 2) {
      sigHex = parts[0]
      pubKeyHex = parts[1]
    }
  }
  if (!sigHex || !pubKeyHex) {
    throw new CipherError('INVALID_KEY', 'Verification key must specify signature and public key: "signatureHex,publicKeyHex"')
  }

  let sigBytes: Uint8Array
  let pubBytes: Uint8Array
  try {
    sigBytes = toByteArray(sigHex, 'hex')
    pubBytes = toByteArray(pubKeyHex, 'hex')
  } catch {
    throw new CipherError('INVALID_KEY', 'Signature and public key must be valid hex strings.')
  }
  if (sigBytes.length !== 64) {
    throw new CipherError('INVALID_KEY', `Ed25519 signature must be 64 bytes (128 hex characters), got ${sigBytes.length} bytes.`)
  }
  if (pubBytes.length !== 32) {
    throw new CipherError('INVALID_KEY', `Ed25519 public key must be 32 bytes (64 hex characters), got ${pubBytes.length} bytes.`)
  }

  const msgBytes = toByteArray(input, options.encoding || 'utf8')
  let isValid = false
  try {
    isValid = ed25519.verify(sigBytes, msgBytes, pubBytes)
  } catch {
    isValid = false
  }

  const steps: CipherStep[] = []
  if (options.instrument) {
    steps.push({
      index: 0,
      label: 'Verification setup',
      inputState: '',
      outputState: '',
      table: [
        { key: 'Public key', value: pubKeyHex.slice(0, 16) + '...' },
        { key: 'Signature R', value: sigHex.slice(0, 16) + '...' },
        { key: 'Signature s', value: sigHex.slice(64, 80) + '...' },
      ],
      note: 'Extracted the public key, signature (R, s), and message.',
      isMilestone: true,
    })
    steps.push({
      index: 1,
      label: 'Verification result',
      inputState: '',
      outputState: isValid ? 'VALID' : 'INVALID',
      note: isValid
        ? 'Checked s*G == R + SHA-512(R || publicKey || message)*publicKey. Signature is VALID.'
        : 'Checked s*G == R + SHA-512(R || publicKey || message)*publicKey. Signature is INVALID (mismatch or malformed).',
      isMilestone: true,
    })
  }

  return {
    output: isValid ? 'valid' : 'invalid',
    outputEncoding: 'utf8',
    steps,
    metadata: { ...METADATA, keySize: 256 },
    durationMs: performance.now() - start,
  }
}
