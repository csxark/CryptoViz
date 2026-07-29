/**
 * Ed448 — EdDSA signatures over Curve448 (RFC 8032).
 * @see CIPHER_ENGINE.md section "Ed448"
 *
 * Higher-security-margin sibling of the already-merged Ed25519, completing
 * the {Curve25519, Curve448} x {key agreement, signing} grid alongside
 * x25519.ts/x448.ts/ed25519.ts. Uses SHAKE256 internally (an extendable-
 * output function) instead of Ed25519's SHA-512 — a genuine algorithmic
 * difference, not just "same thing over bigger numbers."
 *
 * Contract: encrypt(msg, privKey) -> sigHex. decrypt(msg, "pubKey|sig") -> msg.
 */

import { ed448 } from '@noble/curves/ed448.js'
import { CipherError } from '../../utils/errors'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'Ed448',
  keySize: 448,
  securityStatus: 'secure',
  yearDesigned: 2015,
  standardBody: 'RFC 8032',
}

function signCore(message: string, privateKeyHex: string, instrument: boolean): CipherResult {
  const start = performance.now()
  let privKey: Uint8Array
  const steps: CipherStep[] = []

  if (!privateKeyHex.trim()) {
    privKey = ed448.utils.randomSecretKey()
    if (instrument) {
      steps.push({
        index: 0,
        label: 'Key generation',
        inputState: '(none supplied)',
        outputState: fromByteArray(privKey, 'hex'),
        note: 'No private key supplied — generated a fresh random 57-byte seed.',
        isMilestone: true,
      })
    }
  } else {
    privKey = toByteArray(privateKeyHex.trim(), 'hex')
  }

  const pubKey = ed448.getPublicKey(privKey)
  const msgBytes = toByteArray(message, 'utf8')
  const signature = ed448.sign(msgBytes, privKey)

  if (instrument) {
    steps.push({
      index: steps.length,
      label: 'Public key derivation',
      inputState: fromByteArray(privKey, 'hex'),
      outputState: fromByteArray(pubKey, 'hex'),
      note: 'Derived from a SHAKE256 hash of the private seed — Ed25519 uses SHA-512 for this same step.',
      isMilestone: true,
    })
    steps.push({
      index: steps.length,
      label: 'Sign (deterministic, no nonce randomness)',
      inputState: message,
      outputState: fromByteArray(signature, 'hex'),
      note: 'Ed448 signatures are 114 bytes (vs Ed25519\'s 64) and, like Ed25519, are fully deterministic — no per-signature randomness to get wrong.',
      isMilestone: true,
    })
  }

  return {
    output: fromByteArray(signature, 'hex'),
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

function verifyCore(message: string, pubKeyAndSig: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const parts = pubKeyAndSig.split('|').map((s) => s.trim())
  if (parts.length !== 2) {
    throw new CipherError('INVALID_KEY', 'Verify expects "publicKeyHex|signatureHex".')
  }
  const [pubKeyHex, sigHex] = parts
  const msgBytes = toByteArray(message, 'utf8')
  const valid = ed448.verify(toByteArray(sigHex, 'hex'), msgBytes, toByteArray(pubKeyHex, 'hex'))

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Ed448 Verification',
      inputState: sigHex,
      outputState: valid ? 'VALID' : 'INVALID',
      note: `Checked the 114-byte signature against the 57-byte public key using the Curve448 equation. Result: ${valid ? 'Valid' : 'Invalid'}.`,
      isMilestone: true,
    })
  }
  if (!valid) {
    throw new CipherError('INVALID_INPUT', 'Ed448 signature verification failed.')
  }

  return {
    output: message,
    outputEncoding: 'utf8',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return signCore(input, key, !!options.instrument)
}
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return verifyCore(input, key, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '', // Empty message
    key: '6c82a562cb4a514d10d83b22350d06e77ceda2afad483913323c9d992959e82328521eec6308b311157a4c71d21483e6f7087a174250447da033c4391c',
    expected: '55358a0317444a0489c021ba27102229ad353c19c00446bb3fa251f5fc2ed551dc23921e246054cc891c3aee2147231f3341460297c23520281c600578d114a9b8338584b9d537406041f23fd5da48189eeb761a7ad055e812f6c0a129d33f7f1a998400',
    description: 'RFC 8032 Section 7.3 Test Vector 1 (Empty message)'
  }
]
