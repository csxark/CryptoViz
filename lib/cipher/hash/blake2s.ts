/**
 * BLAKE2s — Aumasson, Neves, Wilcox-O'Hearn, Winnerlein, 2012.
 * 32-bit-word sibling of BLAKE2b, optimized for 8- to 32-bit platforms.
 * @see CIPHER_ENGINE.md section "BLAKE2s"
 *
 * Same overall design as blake2b.ts but: 32-bit words (not 64-bit), 64-byte
 * blocks (not 128), 10 rounds (not 12), 256-bit max output (not 512-bit).
 * Used internally by Argon2's compression function and in embedded/IoT
 * contexts where 64-bit arithmetic is expensive.
 *
 * Fast mode delegates to the audited @noble/hashes implementation — no
 * hand-rolled hash math, same pattern as blake2b.ts/sha3.ts.
 */

import { blake2s } from '@noble/hashes/blake2.js'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'BLAKE2s',
  blockSize: 64, // 64-byte compression blocks (vs BLAKE2b's 128-byte)
  securityStatus: 'secure',
  yearDesigned: 2012,
  standardBody: 'RFC 7693',
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '',
    key: '',
    expected: '69217a3079908094e11121d042354a7c1f55b6482ca1a51e1b250dfd1ed0eef9',
    description: 'RFC 7693 test vector, BLAKE2s of empty input',
  },
  {
    input: 'abc',
    key: '',
    expected: '508c3565d871110e1261da85c99f998c0dbecfba457485f267defadd3fa84c7f',
    description: 'RFC 7693 test vector, BLAKE2s of "abc"',
  },
]

function blake2sCore(input: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const inputBytes = toByteArray(input, 'utf8')

  const steps: CipherStep[] = []
  if (instrument) {
    const numBlocks = Math.max(1, Math.ceil(inputBytes.length / 64))
    steps.push({
      index: 0,
      label: 'Compression',
      inputState: input,
      outputState: `${numBlocks} block(s) of up to 64 bytes`,
      note: `Input processed as ${numBlocks} 64-byte block(s) through 10 rounds of the BLAKE2s mixing function (32-bit words — half the block size and rounds of BLAKE2b).`,
      isMilestone: true,
    })
  }

  const digest = blake2s(inputBytes)
  const outputHex = fromByteArray(digest, 'hex')

  if (instrument) {
    steps.push({
      index: steps.length,
      label: 'Output',
      inputState: `${inputBytes.length} byte(s)`,
      outputState: outputHex,
      note: '256-bit digest (BLAKE2s\'s max output — half of BLAKE2b\'s 512-bit max).',
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

export function encrypt(input: string, _key: string, options: CipherOptions = {}): CipherResult {
  return blake2sCore(input, !!options.instrument)
}
export function decrypt(_input: string, _key: string, _options: CipherOptions = {}): CipherResult {
  throw new CipherError('ALGORITHM_UNSUPPORTED', 'BLAKE2s is a one-way hash function — it has no decrypt operation.')
}
