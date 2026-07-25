/**
 * X448 — Diffie-Hellman key exchange over Curve448 (RFC 7748).
 * @see CIPHER_ENGINE.md section "X448"
 *
 * Higher-security sibling of x25519.ts: Curve448 ("Goldilocks curve")
 * targets ~224-bit security vs Curve25519's ~128-bit, at the cost of
 * 56-byte keys instead of 32-byte keys and slower scalar multiplication.
 * Used in TLS 1.3's higher-security-level cipher suites.
 */

import { x448 } from '@noble/curves/ed448.js'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'X448',
  keySize: 448,
  securityStatus: 'secure',
  yearDesigned: 2017,
  standardBody: 'RFC 7748',
}

const KEY_BYTES = 56

/**
 * "encrypt" derives a public key from a private key (generating a private
 * key if none is supplied) — matches x25519.ts's contract for the
 * "derive my public key" step of a DH exchange.
 */
function deriveCore(privateKeyHex: string, instrument: boolean): CipherResult {
  const start = performance.now()
  let privKey: Uint8Array
  const steps: CipherStep[] = []

  if (!privateKeyHex.trim()) {
    privKey = x448.utils.randomSecretKey()
    if (instrument) {
      steps.push({
        index: 0,
        label: 'Key generation',
        inputState: '(none supplied)',
        outputState: fromByteArray(privKey, 'hex'),
        note: `No private key supplied — generated a fresh random ${KEY_BYTES}-byte scalar.`,
        isMilestone: true,
      })
    }
  } else {
    try {
      privKey = toByteArray(privateKeyHex.trim(), 'hex')
    } catch {
      throw new CipherError('INVALID_KEY', 'Private key must be a valid hex string.')
    }
    if (privKey.length !== KEY_BYTES) {
      throw new CipherError('INVALID_KEY_LENGTH', `X448 private key must be ${KEY_BYTES} bytes (${KEY_BYTES * 2} hex chars) — got ${privKey.length} bytes. Did you paste an X25519 (32-byte) key by mistake?`)
    }
  }

  const pubKey = x448.getPublicKey(privKey)
  if (instrument) {
    steps.push({
      index: steps.length,
      label: 'Public key derivation',
      inputState: fromByteArray(privKey, 'hex'),
      outputState: fromByteArray(pubKey, 'hex'),
      note: 'Public key = privateKey · basePoint on Curve448.',
      isMilestone: true,
    })
  }

  return {
    output: fromByteArray(pubKey, 'hex'),
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

/**
 * "decrypt" computes the shared secret given "myPrivateKey|theirPublicKey".
 */
function sharedSecretCore(input: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const parts = input.split('|').map((s) => s.trim())
  if (parts.length !== 2) {
    throw new CipherError('INVALID_INPUT', 'Expected "myPrivateKeyHex|theirPublicKeyHex".')
  }
  
  let myPriv: Uint8Array
  let theirPub: Uint8Array
  try {
    myPriv = toByteArray(parts[0], 'hex')
    theirPub = toByteArray(parts[1], 'hex')
  } catch {
    throw new CipherError('INVALID_INPUT', 'Keys must be valid hex strings.')
  }

  if (myPriv.length !== KEY_BYTES || theirPub.length !== KEY_BYTES) {
    throw new CipherError('INVALID_KEY_LENGTH', `X448 keys must be ${KEY_BYTES} bytes.`)
  }

  const shared = x448.getSharedSecret(myPriv, theirPub)
  const sharedHex = fromByteArray(shared, 'hex')
  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Shared secret computation',
      inputState: input,
      outputState: sharedHex,
      note: 'sharedSecret = myPrivateKey · theirPublicKey — both parties computing this independently arrive at the same value.',
      isMilestone: true,
    })
  }

  return {
    output: sharedHex,
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function encrypt(_input: string, key: string, options: CipherOptions = {}): CipherResult {
  return deriveCore(key, !!options.instrument)
}

export function decrypt(input: string, _key: string, options: CipherOptions = {}): CipherResult {
  return sharedSecretCore(input, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '5f83556694b065d112c96342f756887d8467553c9a3f07f2904ad8a94628e10404ebc301119e31c18688496284b043924414c759dec50326', // peer public key
    key: '9a8f4925d1519f5775cf46b04b5800d4ee9ee80e6841796d3c224d5955ae2a2976051a0d9799c97a7c5828a7db2cb1a74818541ac7783562', // my private key
    expected: '440a211f319583031e0c6043ff8458a6d4de46633022d82945d23d2ee3cb7182ac29c9a333177859a46e237cae40db220391e8dfad2b9f6c',
    description: 'RFC 7748 Section 5.2 Test Vector (Alice/Bob exchange)',
  },
]
