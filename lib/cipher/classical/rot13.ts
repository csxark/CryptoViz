/**
 * ROT13 — Caesar cipher with k=13 (self-inverse).
 * @see CIPHER_ENGINE.md section 1.2
 *
 * ROT13 has no separate decrypt — it is its own inverse.
 * The UI shows a single "Transform" button.
 */

import type { CipherResult, CipherOptions, TestVector } from '../types'
import { validateInput } from '../../utils/errors'
import * as caesar from './caesar'

/**
 * Encrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function encrypt(
  input: string,
  _key: string = '13',
  options: CipherOptions = {}
): CipherResult {
  validateInput(input)
  const result = caesar.encrypt(input, '13', options)
  return {
    ...result,
    metadata: {
      ...result.metadata,
      name: 'ROT13',
      securityStatus: 'broken',
      breakingComplexity: 'Trivially reversible — self-inverse',
    },
  }
}

/** ROT13 is self-inverse: ROT13(ROT13(x)) = x */
export function decrypt(
  input: string,
  key: string = '13',
  options: CipherOptions = {}
): CipherResult {
  return encrypt(input, key, options)
}

/**
 * TEST VECTORS cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export const TEST_VECTORS: TestVector[] = [
  { input: 'HELLO', key: '13', expected: 'URYYB' },
  { input: 'URYYB', key: '13', expected: 'HELLO' },
  { input: 'ATTACK AT DAWN', key: '13', expected: 'NGGNPX NG QNJA' },
  { input: 'abc', key: '13', expected: 'nop' },
]
