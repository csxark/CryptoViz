import { p256 } from '@noble/curves/nist.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'ECC (ECDSA P-256)',
  securityStatus: 'secure',
  yearDesigned: 1985,
  standardBody: 'FIPS 186-4 / SECG',
}

// Pre-generated static keys/signatures for test vectors
// Private key: 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20
// Message: "hello"
// Hash: 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
// DER Signature: 3045022100b055a37f415fec62e7f8d1d40a170058fbee049ccc85b2b2733abdff16728b4502207c4400f22db5f07a63b2005f627d9db50795818131d1d789823f14940d389770
export const TEST_VECTORS: TestVector[] = [
  {
    input: 'hello',
    key: '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20',
    expected: '3045022100b055a37f415fec62e7f8d1d40a170058fbee049ccc85b2b2733abdff16728b4502207c4400f22db5f07a63b2005f627d9db50795818131d1d789823f14940d389770',
    description: 'ECDSA signature of "hello" (deterministic DER signature)',
  },
]

function parseSignatureToCompact(sigHex: string): Uint8Array {
  const cleanHex = sigHex.trim()
  if (cleanHex.length === 128) {
    return toByteArray(cleanHex, 'hex')
  }

  try {
    const sig = p256.Signature.fromHex(cleanHex, 'der')
    return sig.toBytes() // Returns 64-byte compact Uint8Array
  } catch (err) {
    try {
      const sig = p256.Signature.fromHex(cleanHex)
      return sig.toBytes()
    } catch {
      return toByteArray(cleanHex, 'hex')
    }
  }
}

export function encrypt(
  input: string,
  key: string = '',
  options: CipherOptions = {}
): CipherResult {
  if (input === undefined || input === null) {
    throw new CipherError('INPUT_REQUIRED', 'Message input is required.')
  }

  const start = performance.now()

  // Parse or generate private key
  let privKey: Uint8Array
  if (key) {
    try {
      privKey = toByteArray(key.trim(), 'hex')
    } catch {
      throw new CipherError('INVALID_KEY', 'Private key must be a valid hex string.')
    }
  } else {
    privKey = p256.utils.randomSecretKey()
  }

  if (privKey.length !== 32) {
    throw new CipherError('INVALID_KEY', 'ECDSA P-256 private key must be 32 bytes (64 hex characters).')
  }

  const pubKey = p256.getPublicKey(privKey)
  const pubKeyHex = fromByteArray(pubKey, 'hex')
  const privKeyHex = fromByteArray(privKey, 'hex')

  const msgBytes = toByteArray(input, options.encoding || 'utf8')
  const hashBytes = sha256(msgBytes)
  const hashHex = fromByteArray(hashBytes, 'hex')

  // Generate signature (deterministic signature so it matches test vector)
  const signatureBytes = p256.sign(hashBytes, privKey)
  const sigObj = p256.Signature.fromBytes(signatureBytes)
  const sigHex = sigObj.toHex('der')

  const steps: CipherStep[] = []

  if (options.instrument) {
    steps.push({
      index: 0,
      label: 'Curve Definition (NIST P-256)',
      inputState: '',
      outputState: '',
      note: 'Equation: y^2 = x^3 - 3x + b over GF(p), where p is a 256-bit prime.',
      isMilestone: true,
    })

    steps.push({
      index: 1,
      label: 'Base Generator Point G',
      inputState: '',
      outputState: '',
      note: `Gx = 6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296\nGy = 4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5`,
    })

    steps.push({
      index: 2,
      label: 'Public Key Derivation (Q = d * G)',
      inputState: privKeyHex,
      outputState: pubKeyHex,
      note: `Derived public key by multiplying generator point G by private key scalar d: ${privKeyHex.slice(0, 8)}...`,
      isMilestone: true,
    })

    steps.push({
      index: 3,
      label: 'Message Hashing',
      inputState: fromByteArray(msgBytes, 'hex'),
      outputState: hashHex,
      note: `Hashed input message using SHA-256: ${hashHex}`,
    })

    steps.push({
      index: 4,
      label: 'Signature Generation (r, s)',
      inputState: hashHex,
      outputState: sigHex,
      table: [
        { key: 'Signature r', value: sigObj.r.toString(16) },
        { key: 'Signature s', value: sigObj.s.toString(16) },
      ],
      note: `Generated signature (r, s) using deterministic ECDSA (RFC 6979) to avoid nonce reuse vulnerability.`,
      isMilestone: true,
    })
  }

  // We return the signature DER hex
  return {
    output: sigHex,
    outputEncoding: 'hex',
    steps,
    metadata: {
      ...METADATA,
      keySize: 256,
    },
    durationMs: performance.now() - start,
  }
}

export function decrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  if (input === undefined || input === null) {
    throw new CipherError('INPUT_REQUIRED', 'Message input is required.')
  }
  if (!key) {
    throw new CipherError('INVALID_KEY', 'Verification key (signature and public key) is required.')
  }

  const start = performance.now()

  // Parse signature and public key from key parameter
  // Format can be JSON or comma-separated: "signatureHex,pubKeyHex"
  let sigHex = ''
  let pubKeyHex = ''

  try {
    const parsed = JSON.parse(key)
    if (parsed.signature && parsed.publicKey) {
      sigHex = parsed.signature.trim()
      pubKeyHex = parsed.publicKey.trim()
    }
  } catch {
    const parts = key.split(/[\s,]+/).map(p => p.trim()).filter(Boolean)
    if (parts.length >= 2) {
      sigHex = parts[0]
      pubKeyHex = parts[1]
    }
  }

  if (!sigHex || !pubKeyHex) {
    throw new CipherError(
      'INVALID_KEY',
      'Verification key must specify signature and public key: "signatureHex,publicKeyHex"'
    )
  }

  let pubKeyBytes: Uint8Array
  try {
    pubKeyBytes = toByteArray(pubKeyHex, 'hex')
  } catch {
    throw new CipherError('INVALID_KEY', 'Public key must be a valid hex string.')
  }

  const msgBytes = toByteArray(input, options.encoding || 'utf8')
  const hashBytes = sha256(msgBytes)
  const hashHex = fromByteArray(hashBytes, 'hex')

  let isValid = false
  let sigObj: { r: bigint; s: bigint } | null = null
  try {
    const sigCompactBytes = parseSignatureToCompact(sigHex)
    isValid = p256.verify(sigCompactBytes, hashBytes, pubKeyBytes)
    sigObj = p256.Signature.fromBytes(sigCompactBytes)
  } catch {
    // Treat invalid signature formatting/points as invalid signature rather than crashing
    isValid = false
  }

  const steps: CipherStep[] = []

  if (options.instrument) {
    steps.push({
      index: 0,
      label: 'ECDSA Verification Setup',
      inputState: '',
      outputState: '',
      table: [
        { key: 'Message hash', value: hashHex },
        { key: 'Public key', value: pubKeyHex.slice(0, 32) + '...' },
        { key: 'Signature', value: sigHex.slice(0, 32) + '...' },
      ],
      note: 'Extracted public key, signature (r, s), and message hash.',
      isMilestone: true,
    })

    steps.push({
      index: 1,
      label: 'ECDSA Verification Math',
      inputState: '',
      outputState: '',
      table: sigObj ? [
        { key: 'r', value: sigObj.r.toString(16) },
        { key: 's', value: sigObj.s.toString(16) },
      ] : undefined,
      note: 'Verify: w = s^-1 mod n. Compute u1 = hash * w, u2 = r * w mod n. Verify point R = u1*G + u2*Q and check if R.x mod n == r.',
    })

    steps.push({
      index: 2,
      label: 'Signature Verification result',
      inputState: '',
      outputState: isValid ? 'VALID' : 'INVALID',
      note: isValid 
        ? 'Signature matches message and public key. Verification SUCCESS.'
        : 'Signature mismatch or invalid. Verification FAILED.',
      isMilestone: true,
    })
  }

  return {
    output: isValid ? 'valid' : 'invalid',
    outputEncoding: 'utf8',
    steps,
    metadata: {
      ...METADATA,
      keySize: 256,
    },
    durationMs: performance.now() - start,
  }
}
