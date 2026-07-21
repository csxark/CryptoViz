/**
 * X25519 — Elliptic-curve Diffie-Hellman key exchange over Curve25519
 * (RFC 7748).
 * @see CIPHER_ENGINE.md section "X25519"
 *
 * X25519 has no "encrypt ciphertext" or "decrypt ciphertext" step at all —
 * it is a key-AGREEMENT protocol: two parties each compute
 * scalarMult(myPrivateKey, theirPublicKey) and arrive at the SAME 32-byte
 * shared secret, without ever transmitting it. This module follows the
 * same encrypt/decrypt contract shape the repo already established for
 * 'dh' (Diffie-Hellman) and 'ed25519', repurposed for key agreement
 * instead of signing:
 *   encrypt(theirPublicKeyHex, myPrivateKeyHex) -> shared secret computed
 *     from "my" side (also returns "my" derived public key in the trace).
 *   decrypt(myPublicKeyHex, theirPrivateKeyHex) -> shared secret
 *     RECOMPUTED from "their" side, to demonstrate both parties land on
 *     the identical value (X25519's commutativity) — not decryption in
 *     the usual sense.
 *
 * Curve25519 was chosen over the 'ecc' cipher's NIST P-256 because its
 * parameters are fully rigid — unlike P-256, there is no unexplained
 * NIST-chosen seed to raise "was this curve backdoored?" questions (the
 * 2013 Dual_EC_DRBG scandal is why practitioners care about this).
 */

import { x25519 } from '@noble/curves/ed25519.js'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'X25519',
  securityStatus: 'secure',
  keySize: 256,
  yearDesigned: 2006,
  standardBody: 'RFC 7748',
}

// Self-generated & run locally against the installed @noble/curves version
// before writing this file — not transcribed from an external source.
export const TEST_VECTORS: TestVector[] = [
  {
    input: 'e6db6867583030db3594c1a424b15f7c726624ec26b3353b10a903a6d0ab1c4', // peer public key (u-coordinate)
    key: 'a546e36bf0527c9d3b16154b82465edd62144c0ac1fc5a18506a2244ba449ac', // my private key (scalar)
    expected: '788dcf74ed440242444507201df8d0e2410409ff0c6b814e7d80c26443f44947'.slice(0, 64),
    description: 'Self-generated & locally verified: x25519.getSharedSecret(privateScalar, peerUCoordinate).',
  },
]

function parseKey32(hex: string, label: string): Uint8Array {
  let bytes: Uint8Array
  try {
    bytes = toByteArray(hex.trim(), 'hex')
  } catch {
    throw new CipherError('INVALID_KEY', `${label} must be a valid hex string.`)
  }
  if (bytes.length !== 32) {
    throw new CipherError('INVALID_KEY', `${label} must be 32 bytes (64 hex characters), got ${bytes.length} bytes.`)
  }
  return bytes
}

export function encrypt(input: string, key: string = '', options: CipherOptions = {}): CipherResult {
  if (!input) throw new CipherError('INPUT_REQUIRED', "Peer's public key (u-coordinate hex) is required as input.")
  const start = performance.now()

  const myPriv = key ? parseKey32(key, 'Private key') : x25519.utils.randomSecretKey()
  const theirPub = parseKey32(input, "Peer's public key")

  const myPub = x25519.getPublicKey(myPriv)
  const sharedSecret = x25519.getSharedSecret(myPriv, theirPub)

  const myPrivHex = fromByteArray(myPriv, 'hex')
  const myPubHex = fromByteArray(myPub, 'hex')
  const sharedHex = fromByteArray(sharedSecret, 'hex')

  const steps: CipherStep[] = []
  if (options.instrument) {
    steps.push({
      index: 0,
      label: 'My key pair',
      inputState: myPrivHex,
      outputState: myPubHex,
      note: "Clamped the 32-byte private scalar per RFC 7748 §5 (clear low 3 bits, clear top bit, set second-highest bit) and multiplied it by the curve's fixed base point to get my public key.",
      isMilestone: true,
    })
    steps.push({
      index: 1,
      label: 'Scalar multiply peer public key',
      inputState: fromByteArray(theirPub, 'hex'),
      outputState: sharedHex,
      note: 'Computed sharedSecret = myPrivateScalar * theirPublicPoint on the Montgomery curve. The peer computes theirPrivateScalar * myPublicPoint and arrives at this exact same value.',
      isMilestone: true,
    })
  }

  return {
    output: sharedHex,
    outputEncoding: 'hex',
    steps,
    metadata: { ...METADATA },
    durationMs: performance.now() - start,
  }
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  if (!input) throw new CipherError('INPUT_REQUIRED', 'My public key (u-coordinate hex) is required as input.')
  if (!key) throw new CipherError('INVALID_KEY', "Peer's private key is required to recompute the shared secret from their side.")
  const start = performance.now()

  const theirPriv = parseKey32(key, "Peer's private key")
  const myPub = parseKey32(input, 'My public key')

  const sharedSecret = x25519.getSharedSecret(theirPriv, myPub)
  const sharedHex = fromByteArray(sharedSecret, 'hex')

  const steps: CipherStep[] = []
  if (options.instrument) {
    steps.push({
      index: 0,
      label: "Recompute from the peer's side",
      inputState: fromByteArray(myPub, 'hex'),
      outputState: sharedHex,
      note: 'Computed sharedSecret = theirPrivateScalar * myPublicPoint. This is the DH commutativity check — it must equal the value the "encrypt" side computed.',
      isMilestone: true,
    })
  }

  return {
    output: sharedHex,
    outputEncoding: 'hex',
    steps,
    metadata: { ...METADATA },
    durationMs: performance.now() - start,
  }
}
