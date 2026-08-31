/**
 * BLAKE3 — Merkle-tree-structured hash function (O'Connor, Aumasson, Neves,
 * Winnerlein, 2020), successor to BLAKE2.
 * @see CIPHER_ENGINE.md section "BLAKE3"
 *
 * Unlike BLAKE2b's purely sequential compression, BLAKE3 splits input into
 * 1024-byte chunks and combines them via a binary Merkle tree, which is what
 * enables parallel hashing of large inputs — a structurally different design
 * from every hash currently in the registry (all of which are sequential:
 * Merkle-Damgard for SHA-256/512/MD5/SHA-1, sponge for SHA-3, sequential
 * compression for BLAKE2b/RIPEMD-160).
 *
 * Fast mode delegates to the audited @noble/hashes implementation (same
 * pattern as sha3.ts / blake2b.ts). No hand-rolled tree/compression math.
 */

import { blake3 } from '@noble/hashes/blake3.js'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'BLAKE3',
  blockSize: 64, // 64-byte compression blocks, 1024-byte (16-block) chunks form Merkle leaves
  securityStatus: 'secure',
  yearDesigned: 2020,
  standardBody: 'blake3-team reference specification',
}

/**
 * TEST VECTORS cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: '',
    key: '',
    expected: 'af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262',
    description: 'Official BLAKE3 test vector for empty input',
  },

]

function blake3Core(input: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const inputBytes = toByteArray(input, 'utf8')

  const steps: CipherStep[] = []
  if (instrument) {
    const numChunks = Math.max(1, Math.ceil(inputBytes.length / 1024))
    steps.push({
      index: 0,
      label: 'Chunking',
      inputState: input,
      outputState: `${numChunks} chunk(s)`,
      note: `Input split into ${numChunks} chunk(s) of up to 1024 bytes each (16 blocks of 64 bytes per chunk). Chunks become leaves of a binary Merkle tree.`,
      isMilestone: true,
    })
  }

  const digest = blake3(inputBytes)
  const outputHex = fromByteArray(digest, 'hex')

  if (instrument) {
    steps.push({
      index: steps.length,
      label: 'Tree compression',
      inputState: `${inputBytes.length} byte(s)`,
      outputState: outputHex,
      note: 'Chunks compressed pairwise up the Merkle tree to a single root chaining value, output as the 256-bit digest.',
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

/**
 * Encrypt cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Encrypt operation.
 * @param _key Input required by the Encrypt operation.
 * @param options Input required by the Encrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(input: string, _key: string, options: CipherOptions = {}): CipherResult {
  return blake3Core(input, !!options.instrument)
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
  throw new CipherError('ALGORITHM_UNSUPPORTED', 'BLAKE3 is a one-way hash function — it has no decrypt operation.')
}
