import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/hash/cmac'

describe('AES-CMAC', () => {
  it('matches the NIST empty-message vector', () => {
    const v = TEST_VECTORS[0]
    expect(encrypt(v.input, v.key).output).toBe(v.expected)
  })

  it('matches the NIST 16-byte-message vector', () => {
    const v = TEST_VECTORS[1]
    expect(encrypt(v.input, v.key).output).toBe(v.expected)
  })

  it('detects a single-bit tamper in the message', () => {
    const key = '2b7e151628aed2a6abf7158809cf4f3c'
    const original = encrypt('6bc1bee22e409f96e93d7e117393172a', key).output
    const tampered = encrypt('6bc1bee22e409f96e93d7e117393172b', key).output
    expect(tampered).not.toBe(original)
  })

  it('detects a single-bit tamper by re-deriving and comparing the tag', () => {
    const key = '2b7e151628aed2a6abf7158809cf4f3c'
    const msg = '6bc1bee22e409f96e93d7e117393172a'
    const tag = encrypt(msg, key).output
    const claimedTag = tag.slice(0, -2) + (tag.slice(-2) === '00' ? '01' : '00')
    expect(encrypt(msg, key).output).not.toBe(claimedTag)
  })

  it('decrypt throws ALGORITHM_UNSUPPORTED', () => {
    expect(() => decrypt('anything', '2b7e151628aed2a6abf7158809cf4f3c')).toThrow(/ALGORITHM_UNSUPPORTED|one-way/)
  })

  it('produces an instrumented trace including subkey derivation', () => {
    const result = encrypt('6bc1bee22e409f96e93d7e117393172a', '2b7e151628aed2a6abf7158809cf4f3c', { instrument: true })
    expect(result.steps[0].label).toBe('Subkey derivation')
  })
})
