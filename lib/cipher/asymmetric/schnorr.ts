/**
 * Schnorr signatures per BIP340, over secp256k1.
 * @see CIPHER_ENGINE.md section "Schnorr"
 *
 * Compare against ecdsa.ts (same curve, different signing equation:
 * s = k + e·d here, vs s = k⁻¹(H(m) + r·d) for ECDSA) and ed25519.ts
 * (different curve, same "Schnorr-family" signature shape).
 *
 * x-only public keys (32 bytes, not the 33-byte compressed point ECDSA
 * uses) — do not mix key formats between schnorr.ts and ecdsa.ts.
 */

import { secp256k1 } from '@noble/curves/secp256k1.js'
import { schnorr } from '@noble/curves/secp256k1.js'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'Schnorr (BIP340)',
  keySize: 256,
  securityStatus: 'secure',
  yearDesigned: 2020,
  standardBody: 'BIP340',
}

function signCore(message: string, privateKeyHex: string, instrument: boolean): CipherResult {
  const start = performance.now()
  let privKey: Uint8Array
  const steps: CipherStep[] = []

  if (!privateKeyHex.trim()) {
    privKey = secp256k1.utils.randomSecretKey()
    if (instrument) {
      steps.push({
        index: 0,
        label: 'Key generation',
        inputState: '(none supplied)',
        outputState: fromByteArray(privKey, 'hex'),
        note: 'No private key supplied — generated a fresh random one.',
        isMilestone: true,
      })
    }
  } else {
    privKey = toByteArray(privateKeyHex.trim(), 'hex')
  }

  const pubKeyXOnly = schnorr.getPublicKey(privKey) // 32 bytes, x-only
  const msgBytes = toByteArray(message, 'utf8')
  // Use a deterministic auxRand derived from the private key so the signature
  // is fully reproducible (required for test-vector checks).
  const auxRand = privKey.slice().map((b, i) => b ^ (i & 0xff)) as unknown as Uint8Array
  const sig = schnorr.sign(msgBytes, privKey, auxRand) // 64 bytes: R.x || s

  if (instrument) {
    steps.push({
      index: steps.length,
      label: 'x-only public key derivation',
      inputState: fromByteArray(privKey, 'hex'),
      outputState: fromByteArray(pubKeyXOnly, 'hex'),
      note: 'BIP340 uses x-only public keys (32 bytes) with an implicit even-y convention — half the size of a standard compressed EC point.',
      isMilestone: true,
    })
    steps.push({
      index: steps.length,
      label: 'Sign (deterministic nonce, tagged hash challenge)',
      inputState: message,
      outputState: fromByteArray(sig, 'hex'),
      note: 'Nonce derived via a BIP340 tagged hash of the private key + message (not RFC 6979). Signature is R.x (32 bytes) || s (32 bytes), 64 bytes total, no DER wrapping.',
      isMilestone: true,
    })
  }

  return {
    output: fromByteArray(sig, 'hex'),
    outputEncoding: 'hex',
    steps,
    metadata: { ...METADATA },
    durationMs: performance.now() - start,
  }
}

function verifyCore(message: string, pubKeyAndSig: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const parts = pubKeyAndSig.split('|').map((s) => s.trim())
  if (parts.length !== 2) {
    throw new CipherError('INVALID_KEY', 'Verify expects "xOnlyPublicKeyHex|signatureHex".')
  }
  const [pubKeyHex, sigHex] = parts
  const msgBytes = toByteArray(message, 'utf8')
  const valid = schnorr.verify(toByteArray(sigHex, 'hex'), msgBytes, toByteArray(pubKeyHex, 'hex'))

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Verify',
      inputState: sigHex,
      outputState: valid ? 'VALID' : 'INVALID',
      note: `Checked s·G == R + e·P against the x-only public key. Signature is ${valid ? 'valid' : 'INVALID'}.`,
      isMilestone: true,
    })
  }

  if (!valid) {
    throw new CipherError('INVALID_INPUT', 'VERIFICATION_FAILED: Schnorr signature verification failed.')
  }

  return {
    output: message,
    outputEncoding: 'utf8',
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
  return signCore(input, key, !!options.instrument)
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
  return verifyCore(input, key, !!options.instrument)
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
    input: 'ECSoC26 schnorr test',
    key: '0303030303030303030303030303030303030303030303030303030303030303',
    expected: 'cfe134d17efccb4efa1cf4f5155a4940b02a2621ccf0627b925f21950e3595f61017bf974143adc9350a83fa9708f48aed72d716cde08d13d2f8f378c1d6716e',
    description: 'BIP340 Schnorr signature of "ECSoC26 schnorr test" (deterministic auxRand)',
  },
]
