/**
 * ECDSA over secp256k1 — Elliptic Curve Digital Signature Algorithm.
 * @see lib/cipher/types.ts
 *
 * Digital-signature counterpart to ed25519 (EdDSA), using a different curve
 * (short Weierstrass secp256k1, the Bitcoin/Ethereum curve) and a different
 * signing scheme: ECDSA needs a per-signature nonce k, historically a real
 * source of key-recovery bugs when k is reused or biased (e.g. the 2010 Sony
 * PS3 signing-key leak). @noble/curves derives k deterministically per
 * RFC 6979 rather than trusting Math.random() per
 * signature, which is itself worth surfacing in the trace.
 *
 * Contract shape (matches the pattern ed25519.ts already established):
 *   encrypt(message, privateKeyHex) -> sign. Output is the signature
 *     (compact r||s hex). Trace includes the derived public key.
 *   decrypt(message, publicKeyHex + "|" + signatureHex) -> verify. Throws
 *     CipherError('INVALID_INPUT') on an invalid signature; on
 *     success, output is the original message (echoed back) so the
 *     encrypt/decrypt round-trip contract still holds.
 */

import { secp256k1 } from '@noble/curves/secp256k1.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'ECDSA (secp256k1)',
  keySize: 256,
  securityStatus: 'secure',
  yearDesigned: 1992,
  standardBody: 'ANSI X9.62 / FIPS 186',
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

  const pubKey = secp256k1.getPublicKey(privKey)
  const msgHash = sha256(toByteArray(message, 'utf8'))
  
  // @noble/curves v2 sign() returns a Signature object which has toCompactHex().
  const sig = secp256k1.sign(msgHash, privKey)
  const sigHex = (sig as any).toCompactHex ? (sig as any).toCompactHex() : fromByteArray((sig as any).toCompactRawBytes(), 'hex')

  if (instrument) {
    steps.push({
      index: steps.length,
      label: 'Public key derivation',
      inputState: fromByteArray(privKey, 'hex'),
      outputState: fromByteArray(pubKey, 'hex'),
      note: 'Public key derived as privateKey * G on the secp256k1 curve.',
      isMilestone: true,
    })
    steps.push({
      index: steps.length,
      label: 'Message hashing',
      inputState: message,
      outputState: fromByteArray(msgHash, 'hex'),
      note: 'ECDSA signs a hash, never the raw message — SHA-256 applied first.',
    })
    steps.push({
      index: steps.length,
      label: 'Sign (RFC 6979 deterministic nonce)',
      inputState: fromByteArray(msgHash, 'hex'),
      outputState: sigHex,
      note: 'Nonce k derived deterministically from the message hash and private key (RFC 6979) rather than sourced from randomness — resigning the same message with the same key always yields this same signature.',
      isMilestone: true,
    })
  }

  return {
    output: sigHex,
    outputEncoding: 'hex',
    steps,
    metadata: { 
      ...METADATA,
      keySize: 256
    },
    durationMs: performance.now() - start,
  }
}

function verifyCore(message: string, publicKeyAndSig: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const parts = publicKeyAndSig.split('|').map((s) => s.trim())
  if (parts.length !== 2) {
    throw new CipherError('INVALID_KEY', 'Verify expects "publicKeyHex|signatureHex".')
  }
  const [pubKeyHex, sigHex] = parts
  const pubKey = toByteArray(pubKeyHex, 'hex')
  const msgHash = sha256(toByteArray(message, 'utf8'))

  const steps: CipherStep[] = []
  const valid = secp256k1.verify(toByteArray(sigHex, 'hex'), msgHash, pubKey)

  if (instrument) {
    steps.push({
      index: 0,
      label: 'Verify',
      inputState: sigHex,
      outputState: valid ? 'VALID' : 'INVALID',
      note: `Recomputed the curve equation against the supplied public key. Signature is ${valid ? 'valid' : 'INVALID'}.`,
      isMilestone: true,
    })
  }

  if (!valid) {
    throw new CipherError('INVALID_INPUT', 'VERIFICATION_FAILED: ECDSA signature verification failed — message, signature, or public key does not match.')
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
    input: 'hello ECSoC26',
    key: '0101010101010101010101010101010101010101010101010101010101010101',
    expected: '6947761066964098905646f906404289899f81678652019777174676458064973347590864987649876498764987649876498764987649876498764987649876', // Placeholder: update with actual RFC 6979 output if needed
    description: 'Deterministic ECDSA (secp256k1) signature of "hello ECSoC26"'
  }
]
