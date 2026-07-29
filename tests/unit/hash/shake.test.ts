import { describe, it, expect } from 'vitest'
import { encryptShake128, encryptShake256, decrypt, TEST_VECTORS } from '@/lib/cipher/hash/shake'

describe('SHAKE128 / SHAKE256', () => {
  it('matches the official SHAKE128 empty-input vector', () => {
    const v = TEST_VECTORS[0]
    expect(encryptShake128(v.input, v.key).output).toBe(v.expected)
  })

  it('honors a custom requested output length', () => {
    const result = encryptShake256('abc', '64')
    expect(result.output).toHaveLength(128) // 64 bytes = 128 hex chars
  })

  it('defaults to 32 bytes when no length is given', () => {
    const result = encryptShake128('abc', '')
    expect(result.output).toHaveLength(64)
  })

  it('shorter output is a prefix of longer output for the same input (defining XOF property)', () => {
    const short = encryptShake256('test input', '16').output
    const long = encryptShake256('test input', '64').output
    expect(long.startsWith(short)).toBe(true)
  })

  it('rejects a non-positive output length', () => {
    expect(() => encryptShake128('abc', '0')).toThrow(/positive integer/)
    expect(() => encryptShake128('abc', '-5')).toThrow(/positive integer/)
  })

  it('decrypt throws ALGORITHM_UNSUPPORTED', () => {
    expect(() => decrypt('x', '')).toThrow(/ALGORITHM_UNSUPPORTED|one-way/)
  })
})
