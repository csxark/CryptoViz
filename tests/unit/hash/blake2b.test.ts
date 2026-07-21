import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/hash/blake2b'
import { CipherError } from '@/lib/utils/errors'

describe('BLAKE2b-256', () => {
  it('matches known test vectors', () => {
    for (const v of TEST_VECTORS) {
      expect(encrypt(v.input, v.key).output).toBe(v.expected)
    }
  })

  it('produces a different digest when a MAC key is supplied', () => {
    const plain = encrypt('abc', '').output
    const keyed = encrypt('abc', 'secret').output
    expect(keyed).not.toBe(plain)
  })

  it('decrypt() always throws ALGORITHM_UNSUPPORTED', () => {
    try {
      decrypt()
      expect.unreachable()
    } catch (e) {
      expect((e as CipherError).code).toBe('ALGORITHM_UNSUPPORTED')
    }
  })

  it('throws INPUT_REQUIRED on empty input', () => {
    try {
      encrypt('')
      expect.unreachable()
    } catch (e) {
      expect((e as CipherError).code).toBe('INPUT_REQUIRED')
    }
  })

  it('throws INVALID_KEY_LENGTH for an oversized MAC key', () => {
    try {
      encrypt('abc', 'x'.repeat(65))
      expect.unreachable()
    } catch (e) {
      expect((e as CipherError).code).toBe('INVALID_KEY_LENGTH')
    }
  })

  it('produces instrumented steps when requested', () => {
    const result = encrypt('abc', '', { instrument: true })
    expect(result.steps.length).toBeGreaterThan(0)
  })
})
