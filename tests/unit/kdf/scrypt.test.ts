import { describe, it, expect } from 'vitest'
import {
  deriveScryptKey,
  calculateScryptMemory,
  validateScryptParams,
  isPowerOfTwo
} from '../../../lib/kdf/scrypt'

describe('Scrypt KDF Utility Tests', () => {
  it('isPowerOfTwo checks cost parameters correctly', () => {
    expect(isPowerOfTwo(1)).toBe(true)
    expect(isPowerOfTwo(2)).toBe(true)
    expect(isPowerOfTwo(1024)).toBe(true)
    expect(isPowerOfTwo(16384)).toBe(true)
    expect(isPowerOfTwo(0)).toBe(false)
    expect(isPowerOfTwo(-4)).toBe(false)
    expect(isPowerOfTwo(1023)).toBe(false)
  })

  it('calculateScryptMemory calculates correct memory usage in MB', () => {
    // 128 * r * N * p bytes
    // N=1024, r=8, p=1 -> 128 * 8 * 1024 * 1 = 1048576 bytes = 1 MB
    expect(calculateScryptMemory(1024, 8, 1)).toBe(1)
    // N=16384, r=8, p=1 -> 16 MB
    expect(calculateScryptMemory(16384, 8, 1)).toBe(16)
    // N=32768, r=8, p=2 -> 64 MB
    expect(calculateScryptMemory(32768, 8, 2)).toBe(64)
  })

  it('validateScryptParams throws on invalid parameters', () => {
    // Invalid N (not power of 2)
    expect(() =>
      validateScryptParams({ N: 1023, r: 8, p: 1, dkLen: 32 })
    ).toThrow('Cost parameter N must be a power of two')

    // N too low
    expect(() =>
      validateScryptParams({ N: 512, r: 8, p: 1, dkLen: 32 })
    ).toThrow('Cost parameter N must be between')

    // r out of bounds
    expect(() =>
      validateScryptParams({ N: 1024, r: 0, p: 1, dkLen: 32 })
    ).toThrow('Block size r must be between')

    // p out of bounds
    expect(() =>
      validateScryptParams({ N: 1024, r: 8, p: 9, dkLen: 32 })
    ).toThrow('Parallelization parameter p must be between')

    // dkLen invalid
    expect(() =>
      validateScryptParams({ N: 1024, r: 8, p: 1, dkLen: 64 })
    ).toThrow('Derived key length must be 16, 24, or 32')

    // salt invalid
    expect(() =>
      validateScryptParams({ N: 1024, r: 8, p: 1, dkLen: 32, salt: 'not-hex' })
    ).toThrow('Salt must be a valid hexadecimal string')
  })

  it('deriveScryptKey correctly derives key with standard inputs', async () => {
    const password = 'my-secure-password'
    // Hex of 'salt-value-bytes'
    const saltHex = '73616c742d76616c75652d6279746573'

    const result = await deriveScryptKey(password, {
      N: 1024,
      r: 8,
      p: 1,
      dkLen: 32,
      salt: saltHex
    })

    expect(result.derivedKeyHex).toHaveLength(64) // 32 bytes = 64 hex chars
    expect(result.saltHex).toBe(saltHex)

    // Verify determinism
    const secondResult = await deriveScryptKey(password, {
      N: 1024,
      r: 8,
      p: 1,
      dkLen: 32,
      salt: saltHex
    })
    expect(secondResult.derivedKeyHex).toBe(result.derivedKeyHex)
  })

  it('generates random salt when not provided', async () => {
    const password = 'my-secure-password'
    const result = await deriveScryptKey(password, {
      N: 1024,
      r: 8,
      p: 1,
      dkLen: 32
    })
    expect(result.saltHex).toHaveLength(32) // 16 bytes random salt = 32 hex chars
    expect(result.derivedKeyHex).toHaveLength(64)
  })
})
