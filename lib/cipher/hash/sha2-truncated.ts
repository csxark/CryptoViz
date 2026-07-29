/**
 * SHA-224 and SHA-384 — NIST FIPS 180-4, truncated-output SHA-2 members.
 * @see CIPHER_ENGINE.md section "SHA-224 / SHA-384"
 *
 * NOT simple truncations of SHA-256/SHA-512's output: each uses its own
 * distinct initial hash value (IV), specifically so that knowing one
 * digest doesn't leak anything about what the longer variant's digest
 * would have been for the same input. Delegates to @noble/hashes — no
 * hand-rolled hash math.
 */

import { sha224, sha384 } from '@noble/hashes/sha2.js'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA_224: CipherMetadata = {
  name: 'SHA-224',
  blockSize: 64,
  securityStatus: 'secure',
  yearDesigned: 2004,
  standardBody: 'NIST FIPS 180-4',
}
const METADATA_384: CipherMetadata = {
  name: 'SHA-384',
  blockSize: 128,
  securityStatus: 'secure',
  yearDesigned: 2001,
  standardBody: 'NIST FIPS 180-4',
}

function shaCore(input: string, variant: 224 | 384, instrument: boolean): CipherResult {
  const start = performance.now()
  const inputBytes = toByteArray(input, 'utf8')
  const fn = variant === 224 ? sha224 : sha384

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Distinct initial hash value',
      inputState: input,
      outputState: `SHA-${variant} IV (not derived by truncating SHA-${variant === 224 ? '256' : '512'}'s IV)`,
      note: `SHA-${variant} starts from its own FIPS 180-4-defined initial constants — this is what prevents deriving one digest from the other.`,
      isMilestone: true,
    })
  }

  const digest = fn(inputBytes)
  const outputHex = fromByteArray(digest, 'hex')

  if (instrument) {
    steps.push({
      index: steps.length,
      label: 'Output',
      inputState: `${inputBytes.length} byte(s)`,
      outputState: outputHex,
      note: `The final ${variant}-bit digest produced by the SHA-2 compression function.`,
      isMilestone: true,
    })
  }

  return {
    output: outputHex,
    outputEncoding: 'hex',
    steps,
    metadata: variant === 224 ? METADATA_224 : METADATA_384,
    durationMs: performance.now() - start,
  }
}

export function encryptSha224(input: string, _key: string, options: CipherOptions = {}): CipherResult {
  return shaCore(input, 224, !!options.instrument)
}
export function encryptSha384(input: string, _key: string, options: CipherOptions = {}): CipherResult {
  return shaCore(input, 384, !!options.instrument)
}
export function decrypt(_input: string, _key: string, _options: CipherOptions = {}): CipherResult {
  throw new CipherError('ALGORITHM_UNSUPPORTED', 'This is a one-way hash function — it has no decrypt operation.')
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: 'abc',
    key: '',
    expected: '23097d223405d8228642a477bda255b32aadbce4bda0b3f7e36c9da',
    description: 'FIPS 180-4 SHA-224 test vector, "abc"',
  },
  {
    input: 'abc',
    key: '',
    expected: 'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a',
    description: 'FIPS 180-4 SHA-384 test vector, "abc"',
  },
]
