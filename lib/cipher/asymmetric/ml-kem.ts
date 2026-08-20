/**
 * ML-KEM-768 (Kyber) — NIST FIPS 203, post-quantum key encapsulation.
 * @see CIPHER_ENGINE.md section "ML-KEM"
 *
 * Security based on Module Learning With Errors (M-LWE), a lattice
 * problem believed hard even for a large-scale quantum computer —
 * unlike every other asymmetric module here (RSA/DH/ElGamal/ECC/
 * Ed25519/X25519/ECDSA/Schnorr/Paillier/Rabin/X448), all of which Shor's
 * algorithm breaks.
 *
 * This is a KEM, not textbook encrypt/decrypt: encapsulate() produces
 * BOTH a ciphertext (sent over the wire) and a shared secret (kept,
 * never transmitted); decapsulate() recovers the same shared secret
 * from the ciphertext + private key. The shared secret is surfaced via
 * the instrumented trace since it's the real "output," not `output`
 * itself (which carries the ciphertext, to keep the encrypt/decrypt
 * contract shape consistent with the rest of this registry).
 *
 * Key sizes for ML-KEM-768:
 * - Public Key: 1184 bytes (2368 hex chars)
 * - Private Key: 2400 bytes (4800 hex chars)
 * - Ciphertext: 1088 bytes (2176 hex chars)
 * - Shared Secret: 32 bytes (64 hex chars)
 */

import { ml_kem768 } from '@noble/post-quantum/ml-kem.js'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'ML-KEM-768',
  keySize: 768, // module rank k=3 (3*25
  securityStatus: 'secure',
  yearDesigned: 2024,
  standardBody: 'NIST FIPS 203',
}

function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '')
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new CipherError('INVALID_INPUT', 'Expected a hex string with an even number of digits.')
  }
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return out
}

/**
 * Encapsulates a shared secret for the given public key.
 * Maps to the 'encrypt' operation in the registry.
 */
function encapsulateCore(recipientPubKeyHex: string, instrument: boolean): CipherResult {
  const start = performance.now()
  if (!recipientPubKeyHex.trim()) {
    throw new CipherError('INVALID_KEY', 'ML-KEM encapsulate requires the recipient\'s public key.')
  }
  const pubKey = hexToBytes(recipientPubKeyHex)
  
  // NIST FIPS 203: Encaps(pk) -> (c, K)
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(pubKey)

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Encapsulate',
      inputState: recipientPubKeyHex,
      outputState: bytesToHex(cipherText),
      note: `Shared secret (kept by the sender, NEVER transmitted): ${bytesToHex(sharedSecret)}. Only the ciphertext above is sent to the recipient.`,
      isMilestone: true,
    })
  }

  return {
    output: bytesToHex(cipherText),
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

/**
 * Decapsulates the shared secret from the ciphertext using the private key.
 * Maps to the 'decrypt' operation in the registry.
 */
function decapsulateCore(cipherTextHex: string, privateKeyHex: string, instrument: boolean): CipherResult {
  const start = performance.now()
  if (!privateKeyHex.trim()) {
    throw new CipherError('INVALID_KEY', 'ML-KEM decapsulate requires the recipient\'s private key.')
  }
  const cipherText = hexToBytes(cipherTextHex)
  const privKey = hexToBytes(privateKeyHex)
  
  // NIST FIPS 203: Decaps(c, sk) -> K
  const sharedSecret = ml_kem768.decapsulate(cipherText, privKey)

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Decapsulate',
      inputState: cipherTextHex,
      outputState: bytesToHex(sharedSecret),
      note: 'Recovered the identical shared secret the sender derived during encapsulation, using only the ciphertext and the private key.',
      isMilestone: true,
    })
  }

  return {
    output: bytesToHex(sharedSecret),
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function encrypt(_input: string, key: string, options: CipherOptions = {}): CipherResult {
  return encapsulateCore(key, !!options.instrument)
}
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return decapsulateCore(input, key, !!options.instrument)
}

/** Not part of the standard contract — exposed for the test file and a
 * potential dedicated "generate keypair" UI action. */
export function generateKeypair(): { publicKey: string; privateKey: string } {
  const { publicKey, secretKey } = ml_kem768.keygen()
  return { publicKey: bytesToHex(publicKey), privateKey: bytesToHex(secretKey) }
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '',
    key: '',
    expected: 'randomized',
    skipEncrypt: true,
    description: 'ML-KEM-768 key encapsulation (randomized per encapsulation run)',
  },
]
