import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '../../../lib/cipher/symmetric/camellia'
import { toByteArray } from '../../../lib/utils'
import { CipherError } from '../../../lib/utils/errors'

describe('Camellia Cipher', () => {
  // Test vectors from RFC 3713 Appendix A (with padding disabled)
  it('encrypts 128-bit key test vector correctly', () => {
    const key = toByteArray('0123456789abcdeffedcba9876543210', 'hex')
    const plaintext = toByteArray('0123456789abcdeffedcba9876543210', 'hex')
    const expectedCiphertext = '67673138549669730857065648eabe43'

    const res = encrypt(plaintext, key, { mode: 'ECB', padding: false })
    expect(res.output).toBe(expectedCiphertext)
  })

  it('decrypts 128-bit key test vector correctly', () => {
    const key = toByteArray('0123456789abcdeffedcba9876543210', 'hex')
    const ciphertext = toByteArray('67673138549669730857065648eabe43', 'hex')
    const expectedPlaintext = '0123456789abcdeffedcba9876543210'

    const res = decrypt(ciphertext, key, { mode: 'ECB', padding: false })
    expect(res.output).toBe(expectedPlaintext)
  })

  it('encrypts 192-bit key test vector correctly', () => {
    const key = toByteArray('0123456789abcdeffedcba98765432100011223344556677', 'hex')
    const plaintext = toByteArray('0123456789abcdeffedcba9876543210', 'hex')
    const expectedCiphertext = 'b4993401b3e996f84ee5cee7d79b09b9'

    const res = encrypt(plaintext, key, { mode: 'ECB', padding: false })
    expect(res.output).toBe(expectedCiphertext)
  })

  it('encrypts 256-bit key test vector correctly', () => {
    const key = toByteArray('0123456789abcdeffedcba987654321000112233445566778899aabbccddeeff', 'hex')
    const plaintext = toByteArray('0123456789abcdeffedcba9876543210', 'hex')
    const expectedCiphertext = '9acc237dff16d76c20ef7c919e3a7509'

    const res = encrypt(plaintext, key, { mode: 'ECB', padding: false })
    expect(res.output).toBe(expectedCiphertext)
  })

  it('decrypts 256-bit key test vector correctly', () => {
    const key = toByteArray('0123456789abcdeffedcba987654321000112233445566778899aabbccddeeff', 'hex')
    const ciphertext = toByteArray('9acc237dff16d76c20ef7c919e3a7509', 'hex')
    const expectedPlaintext = '0123456789abcdeffedcba9876543210'

    const res = decrypt(ciphertext, key, { mode: 'ECB', padding: false })
    expect(res.output).toBe(expectedPlaintext)
  })

  it('supports round-trip CBC mode encryption/decryption with padding: false', () => {
    const key = toByteArray('0123456789abcdeffedcba9876543210', 'hex')
    const plaintext = toByteArray('0123456789abcdeffedcba98765432100123456789abcdeffedcba9876543210', 'hex')

    const encRes = encrypt(plaintext, key, { mode: 'CBC', padding: false })
    const decRes = decrypt(toByteArray(encRes.output, 'hex'), key, { mode: 'CBC', padding: false })

    expect(decRes.output).toBe('0123456789abcdeffedcba98765432100123456789abcdeffedcba9876543210')
  })

  describe('Padding & API validation', () => {
    it('encrypts and decrypts string input with PKCS7 padding', () => {
      const plaintext = 'Camellia Padding Test String'
      const key = 'camelliakey12345' // 16 bytes (128-bit)

      const encRes = encrypt(plaintext, key, { mode: 'CBC' })
      const decRes = decrypt(encRes.output, key, { mode: 'CBC' })

      expect(decRes.output).toBe(plaintext)
    })

    it('throws error on decrypt with invalid padding or unaligned input', () => {
      const key = 'camelliakey12345'
      // 15 bytes unaligned hex ciphertext string
      const invalidCiphertext = '123456789012345678901234567890'
      expect(() => decrypt(invalidCiphertext, key, { mode: 'ECB' })).toThrowError(CipherError)
    })

    it('validates key presence and invalid key length', () => {
      expect(() => encrypt('test input', 'short')).toThrowError(CipherError)
      expect(() => encrypt('test input', 'short')).toThrow(/Camellia key must be exactly 16, 24, or 32 bytes/)
    })
  })
})
