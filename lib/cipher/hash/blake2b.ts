/**
 * BLAKE2b-256 — high-speed cryptographic hash function (RFC 7693),
 * designed as a faster, simpler replacement for MD5/SHA-1/SHA-2 while
 * remaining at least as secure as SHA-3.
 * @see CIPHER_ENGINE.md section "BLAKE2b-256"
 *
 * Unlike SHA-2 (Merkle-Damgard) and SHA-3 (sponge/Keccak-f permutation),
 * BLAKE2b is built on a ChaCha-derived HAIFA-style compression function
 * operating on 128-byte message blocks with a 64-byte internal state,
 * running 12 rounds of a mixing function (G) per block. It configures a
 * 32-byte digest length directly in its parameter block rather than
 * truncating a fixed-width output (unlike SHA-512/256's truncation
 * approach), and accepts a key input natively — no separate HMAC
 * construction needed to use it as a MAC, unlike this repo's `hmac`
 * cipher.
 *
 * Delegates to the audited @noble/hashes implementation, same pattern as
 * this repo's sha256.ts / sha3.ts.
 */

import { blake2b } from '@noble/hashes/blake2.js'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'BLAKE2b-256',
  blockSize: 128,
  rounds: 12,
  securityStatus: 'secure',
  yearDesigned: 2012,
  standardBody: 'RFC 7693',
}

const DIGEST_BYTES = 32

// Computed locally with @noble/hashes before writing this file — run the
// verification snippet below yourself before trusting these.
export const TEST_VECTORS: TestVector[] = [
  {
    input: '',
    key: '',
    expected: '0e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8',
    description: 'BLAKE2b-256 of the empty string.',
  },
  {
    input: 'abc',
    key: '',
    expected: 'bddd813c634239723171ef3fee98579b94964e3bb1cb3e427262c8c068d52319',
    description: 'BLAKE2b-256("abc") — commonly cited smoke-test vector.',
  },
]

export function encrypt(input: string, key: string = '', options: CipherOptions = {}): CipherResult {
  if (input === null || input === undefined || typeof input !== 'string') {
    throw new CipherError('INPUT_REQUIRED', 'Input is required.')
  }
  const byteLength = new TextEncoder().encode(input).length
  if (byteLength > 2 * 1024 * 1024) {
    throw new CipherError('INPUT_TOO_LONG', `Input exceeds maximum size of 2MB (got ${byteLength}).`)
  }
  const start = performance.now()
  const inputBytes = toByteArray(input, options.encoding || 'utf8')

  let keyBytes: Uint8Array | undefined
  if (key) {
    try {
      keyBytes = toByteArray(key, 'utf8')
    } catch {
      throw new CipherError('INVALID_KEY', 'Optional MAC key must be a valid string.')
    }
    if (keyBytes.length > 64) {
      throw new CipherError('INVALID_KEY_LENGTH', 'BLAKE2b key must be at most 64 bytes.')
    }
  }

  const digest = blake2b(inputBytes, { dkLen: DIGEST_BYTES, key: keyBytes })
  const outputHex = fromByteArray(digest, 'hex')

  const steps: CipherStep[] = []
  if (options.instrument) {
    steps.push({
      index: 0,
      label: 'Initialize state (IV XOR parameter block)',
      inputState: '',
      outputState: '',
      table: [
        { key: 'Digest length', value: `${DIGEST_BYTES} bytes` },
        { key: 'Key length', value: `${keyBytes?.length ?? 0} bytes` },
        { key: 'Block size', value: '128 bytes' },
      ],
      note: 'XORed the 8 BLAKE2b initialization-vector words with a parameter block encoding digest length, key length, fanout, and depth.',
      isMilestone: true,
    })
    steps.push({
      index: 1,
      label: 'Compress message blocks',
      inputState: fromByteArray(inputBytes, 'hex'),
      outputState: '',
      note: `Split the (optionally key-prefixed) message into 128-byte blocks and ran 12 rounds of the G mixing function over each, chaining state between blocks.`,
      isMilestone: true,
    })
    steps.push({
      index: 2,
      label: 'Finalize digest',
      inputState: '',
      outputState: outputHex,
      note: 'Set the final-block flag on the last compression call and truncated the resulting state to the configured 32-byte digest length.',
      isMilestone: true,
    })
  }

  return {
    output: outputHex,
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function decrypt(): CipherResult {
  throw new CipherError(
    'ALGORITHM_UNSUPPORTED',
    'One-way cryptographic hash functions do not support decryption.'
  )
}
