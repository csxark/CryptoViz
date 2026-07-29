/**
 * SHAKE128 / SHAKE256 — NIST FIPS 202 (same document as SHA-3).
 * Extendable-output functions (XOFs): unlike every other hash in this
 * registry, output length is a caller-chosen parameter, not fixed by
 * the algorithm. Same Keccak permutation family as sha3.ts, different
 * output contract — used internally by post-quantum schemes (ML-KEM/
 * Kyber, ML-DSA/Dilithium) for expanding seeds into arbitrary-length
 * pseudorandom byte streams.
 * @see CIPHER_ENGINE.md section "SHAKE"
 *
 * Fast mode delegates to @noble/hashes — no hand-rolled Keccak math.
 */

import { shake128, shake256 } from '@noble/hashes/sha3.js'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA_128: CipherMetadata = {
  name: 'SHAKE128',
  securityStatus: 'secure',
  yearDesigned: 2015,
  standardBody: 'NIST FIPS 202',
}
const METADATA_256: CipherMetadata = {
  name: 'SHAKE256',
  securityStatus: 'secure',
  yearDesigned: 2015,
  standardBody: 'NIST FIPS 202',
}

const DEFAULT_OUTPUT_BYTES = 32

function parseOutputLength(key: string): number {
  const clean = key.trim()
  if (!clean) return DEFAULT_OUTPUT_BYTES
  const n = Number(clean)
  if (!Number.isInteger(n) || n <= 0) {
    throw new CipherError('INVALID_KEY', 'SHAKE output length must be a positive integer number of bytes (pass it in the key field).')
  }
  return n
}

function shakeCore(input: string, key: string, variant: 128 | 256, instrument: boolean): CipherResult {
  const start = performance.now()
  const outputLen = parseOutputLength(key)
  const inputBytes = toByteArray(input, 'utf8')
  const fn = variant === 128 ? shake128 : shake256

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Absorb',
      inputState: input,
      outputState: `${inputBytes.length} byte(s) absorbed`,
      note: `Input absorbed into the Keccak-${variant === 128 ? 'f[1600] (r=1344)' : 'f[1600] (r=1088)'} sponge state.`,
      isMilestone: true,
    })
  }

  const digest = fn(inputBytes, { dkLen: outputLen })
  const outputHex = fromByteArray(digest, 'hex')

  if (instrument) {
    steps.push({
      index: steps.length,
      label: 'Squeeze',
      inputState: `requested ${outputLen} byte(s)`,
      outputState: outputHex,
      note: `Unlike a fixed-digest hash, this squeeze step can be re-run for MORE output bytes and the first ${outputLen} bytes would stay identical — that prefix property is what makes this an XOF, not a hash.`,
      isMilestone: true,
    })
  }

  return {
    output: outputHex,
    outputEncoding: 'hex',
    steps,
    metadata: variant === 128 ? METADATA_128 : METADATA_256,
    durationMs: performance.now() - start,
  }
}

export function encryptShake128(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return shakeCore(input, key, 128, !!options.instrument)
}
export function encryptShake256(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return shakeCore(input, key, 256, !!options.instrument)
}
export function decrypt(_input: string, _key: string, _options: CipherOptions = {}): CipherResult {
  throw new CipherError('ALGORITHM_UNSUPPORTED', 'SHAKE is a one-way extendable-output function — it has no decrypt operation.')
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '',
    key: '32',
    expected: '7f9c2ba4e88f827d616045507605853ed73b8093f6efbc88eb1a6eacfa66ef26',
    description: 'NIST FIPS 202 SHAKE128 test vector, empty input, 32-byte output',
  },
]
