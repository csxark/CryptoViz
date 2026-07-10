import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, processBlock, expandKey } from '../../../lib/cipher/symmetric/aes'
import { CipherError } from '../../../lib/utils/errors'
import { toByteArray, fromByteArray } from '../../../lib/utils/encoding'
import fc from 'fast-check'

describe('AES Unit Tests', () => {
  describe('AES Core Block cipher', () => {
    it('passes FIPS 197 standard block vector (AES-128)', () => {
      const keyBytes = toByteArray('000102030405060708090a0b0c0d0e0f', 'hex')
      const plainBytes = toByteArray('00112233445566778899aabbccddeeff', 'hex')

      const roundKeys = expandKey(keyBytes)
      const cipherBlock = processBlock(plainBytes, roundKeys, false)

      expect(fromByteArray(cipherBlock, 'hex').toLowerCase()).toBe('69c4e0d86a7b0430d8cdb78070b4c55a')

      const decryptedBlock = processBlock(cipherBlock, roundKeys, true)
      expect(fromByteArray(decryptedBlock, 'hex').toLowerCase()).toBe('00112233445566778899aabbccddeeff')
    })
  })

  describe('AES API and Padding', () => {
    it('encrypts and decrypts with PKCS7 padding', () => {
      const input = 'AES 128 padding text'
      const key = '1234567890123456' // 16 bytes

      const enc = encrypt(input, key)
      const dec = decrypt(enc.output, key)
      expect(dec.output).toBe(input)
    })

    it('generates correct step count in instrumented mode (AES-128)', () => {
      const input = 'HELLO' // 5 bytes -> padded to 16 bytes (1 block)
      const key = '000102030405060708090a0b0c0d0e0f' // 16 bytes
      const result = encrypt(input, key, { instrument: true })
      // AES-128 instrumented steps = 44
      expect(result.steps.length).toBe(44)
    })

    it('generates correct step count in instrumented mode (AES-256)', () => {
      const input = 'HELLO'
      const key = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f' // 32 bytes (AES-256)
      const result = encrypt(input, key, { instrument: true })
      // AES-256 instrumented steps = 60
      expect(result.steps.length).toBe(60)
    })

    it('throws errors for invalid key sizes', () => {
      expect(() => encrypt('test', '12345678')).toThrowError(CipherError)
      expect(() => encrypt('test', '12345678')).toThrow(/must be exactly 16, 24, or 32 bytes/)
    })
  })

  describe('AES Property-based Fuzzing', () => {
    it('AES: encrypt then decrypt returns original input', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 16, maxLength: 16 }).map(s => {
            let res = ''
            for (let i = 0; i < 16; i++) {
              res += String.fromCharCode(32 + (s.charCodeAt(i) % 95))
            }
            return res
          }),
          (input, keyStr) => {
            const enc = encrypt(input, keyStr)
            const dec = decrypt(enc.output, keyStr)
            expect(dec.output).toBe(input)
          }
        ),
        { numRuns: 500 }
      )
    })
  })
})
it('produces different ciphertext blocks for identical plaintext blocks under CBC', () => {
  const plaintext = 'AAAAAAAAAAAAAAAA' + 'BBBBBBBBBBBBBBBB' + 'AAAAAAAAAAAAAAAA'
  const key = '0123456789abcdef0123456789abcdef' // adjust to a valid 32-hex-char key format used elsewhere in the file
  const result = encrypt(plaintext, key)
  const ciphertext = result.output.slice(32) // strip IV prefix
  const block1 = ciphertext.slice(0, 32)
  const block3 = ciphertext.slice(64, 96)
  expect(block1).not.toBe(block3)
})

it('round-trips encrypt/decrypt correctly under CBC', () => {
  const plaintext = 'Hello, CryptoViz!'
  const key = '0123456789abcdef0123456789abcdef'
  const encrypted = encrypt(plaintext, key)
  const decrypted = decrypt(encrypted.output, key)
  expect(decrypted.output).toBe(plaintext)
})