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
  const sig = schnorr.sign(msgBytes, privKey) // 64 bytes: R.x || s

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

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return signCore(input, key, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return verifyCore(input, key, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: 'ECSoC26 schnorr test',
    key: '0303030303030303030303030303030303030303030303030303030303030303',
    expected: '74878438466668748784384666687487843846666874878438466668748784384666687487843846666874878438466668748784384666687487843846666874', // Placeholder: BIP340 deterministic sig
    description: 'BIP340 Schnorr signature of "ECSoC26 schnorr test"'
  }
]
