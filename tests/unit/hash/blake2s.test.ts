import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/hash/blake2s'

describe('BLAKE2s', () => {
  it('matches the RFC 7693 empty-input vector', () => {
    const v = TEST_VECTORS[0]
    expect(encrypt(v.input, v.key).output).toBe(v.expected)
  })

  it('produces a 32-byte (64 hex char) digest', () => {
    expect(encrypt('hello', '').output).toHaveLength(64)
  })

  it('is deterministic', () => {
    expect(encrypt('abc', '').output).toBe(encrypt('abc', '').output)
  })

  it('differs from a BLAKE2b digest of the same input', async () => {
    const { encrypt: blake2bEncrypt } = await import('@/lib/cipher/hash/blake2b')
    expect(encrypt('abc', '').output).not.toBe(blake2bEncrypt('abc', '').output)
  })

  it('decrypt throws ALGORITHM_UNSUPPORTED', () => {
    expect(() => decrypt('x', '')).toThrow(/ALGORITHM_UNSUPPORTED|one-way/)
  })
})
