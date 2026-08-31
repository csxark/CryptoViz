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

/**
 * Encrypt Sha224 cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Encrypt Sha224 operation.
 * @param _key Input required by the Encrypt Sha224 operation.
 * @param options Input required by the Encrypt Sha224 operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encryptSha224(input: string, _key: string, options: CipherOptions = {}): CipherResult {
  return shaCore(input, 224, !!options.instrument)
}
/**
 * Encrypt Sha384 cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Encrypt Sha384 operation.
 * @param _key Input required by the Encrypt Sha384 operation.
 * @param options Input required by the Encrypt Sha384 operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encryptSha384(input: string, _key: string, options: CipherOptions = {}): CipherResult {
  return shaCore(input, 384, !!options.instrument)
}
/**
 * Decrypt cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param _input Input required by the Decrypt operation.
 * @param _key Input required by the Decrypt operation.
 * @param __options Input required by the Decrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decrypt(_input: string, _key: string, __options: CipherOptions = {}): CipherResult {
  throw new CipherError('ALGORITHM_UNSUPPORTED', 'This is a one-way hash function — it has no decrypt operation.')
}

/**
 * TEST VECTORS 224 cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS_224: TestVector[] = [
  {
    input: '',
    key: '',
    expected: 'd14a028c2a3a2bc9476102bb288234c415a2b01f828ea62ac5b3e42f',
    description: 'NIST SHA-224 test vector (empty input)',
  },
]
/**
 * TEST VECTORS 384 cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS_384: TestVector[] = [
  {
    input: '',
    key: '',
    expected: '38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b',
    description: 'NIST SHA-384 test vector (empty input)',
  },
]
/**
 * TEST VECTORS cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
  ...TEST_VECTORS_224,
  ...TEST_VECTORS_384,
  {
    input: 'abc',
    key: '',
    expected: '23097d223405d8228642a477bda255b32aadbce4bda0b3f7e36c9da7',
    description: 'FIPS 180-4 SHA-224 test vector, "abc"',
  },
  {
    input: 'abc',
    key: '',
    expected: 'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7',
    description: 'FIPS 180-4 SHA-384 test vector, "abc"',
  },
]
