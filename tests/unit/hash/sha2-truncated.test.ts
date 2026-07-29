import { describe, it, expect } from 'vitest'
import { encryptSha224, encryptSha384, decrypt, TEST_VECTORS } from '@/lib/cipher/hash/sha2-truncated'

describe('SHA-224 / SHA-384', () => {
  it('matches the FIPS 180-4 SHA-224 vector', () => {
    expect(encryptSha224(TEST_VECTORS[0].input, '').output).toBe(TEST_VECTORS[0].expected)
  })

  it('matches the FIPS 180-4 SHA-384 vector', () => {
    expect(encryptSha384(TEST_VECTORS[1].input, '').output).toBe(TEST_VECTORS[1].expected)
  })

  it('SHA-224 is NOT simply SHA-256 truncated', async () => {
    const { encrypt: sha256Encrypt } = await import('@/lib/cipher/hash/sha256')
    const sha224Result = encryptSha224('abc', '').output
    const sha256Result = sha256Encrypt('abc', '').output
    expect(sha256Result.slice(0, sha224Result.length)).not.toBe(sha224Result)
  })

  it('produces correctly sized digests', () => {
    expect(encryptSha224('x', '').output).toHaveLength(56) // 28 bytes
    expect(encryptSha384('x', '').output).toHaveLength(96) // 48 bytes
  })

  it('decrypt throws ALGORITHM_UNSUPPORTED', () => {
    expect(() => decrypt('x', '')).toThrow(/ALGORITHM_UNSUPPORTED|one-way/)
  })
})
