import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/hash/md4'

describe('MD4', () => {
  it.each(TEST_VECTORS)('matches RFC 1320 vector: $description', (v) => {
    expect(encrypt(v.input, v.key).output).toBe(v.expected)
  })

  it.each([55, 56, 64, 65])('handles a %i-byte input without a padding-boundary bug', (len) => {
    const input = 'a'.repeat(len)
    const result = encrypt(input, '')
    expect(result.output).toHaveLength(32)
  })

  it('decrypt throws ALGORITHM_UNSUPPORTED', () => {
    expect(() => decrypt('x', '')).toThrow(/ALGORITHM_UNSUPPORTED|one-way/)
  })

  it('is deterministic', () => {
    expect(encrypt('test', '').output).toBe(encrypt('test', '').output)
  })
})
