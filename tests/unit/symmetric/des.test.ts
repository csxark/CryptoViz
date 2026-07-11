import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, processBlock, generateSubkeys, bytesToBlock, blockToBytes } from '../../../lib/cipher/symmetric/des'
import { encrypt as encrypt3des, decrypt as decrypt3des } from '../../../lib/cipher/symmetric/3des'
import { CipherError } from '../../../lib/utils/errors'
import { toByteArray, fromByteArray } from '../../../lib/utils/encoding'
import fc from 'fast-check'

describe('DES & 3DES Unit Tests', () => {
  describe('DES Core Block cipher', () => {
    it('passes FIPS 46-3 standard block vector', () => {
      // Key: 133457799BBCDFF1
      // Plain: 0123456789ABCDEF
      // Expected Cipher: 85E813540F0AB405
      const keyBytes = toByteArray('133457799BBCDFF1', 'hex')
      const plainBytes = toByteArray('0123456789ABCDEF', 'hex')

      const subkeys = generateSubkeys(keyBytes)
      const block = bytesToBlock(plainBytes, 0)
      const cipherBlock = processBlock(block, subkeys, false)

      const outputBytes = new Uint8Array(8)
      blockToBytes(cipherBlock, outputBytes, 0)

      expect(fromByteArray(outputBytes, 'hex').toUpperCase()).toBe('85E813540F0AB405')

      // Decrypt block
      const decryptedBlock = processBlock(cipherBlock, subkeys, true)
      const decBytes = new Uint8Array(8)
      blockToBytes(decryptedBlock, decBytes, 0)

      expect(fromByteArray(decBytes, 'hex').toUpperCase()).toBe('0123456789ABCDEF')
    })
  })

  describe('DES Padding & API', () => {
    it('encrypts and decrypts with PKCS7 padding', () => {
      const input = 'DES Test Plaintext'
      const key = 'deskey12' // 8 bytes

      const enc = encrypt(input, key)
      const dec = decrypt(enc.output, key)

      expect(dec.output).toBe(input)
    })

    it('generates correct step count in instrumented mode', () => {
      const input = 'HELLO' // 5 bytes -> padded to 8 bytes (1 block)
      const key = '12345678'
      const result = encrypt(input, key, { instrument: true })
      // DES instrumented steps = 70
      expect(result.steps.length).toBe(70)
    })

    it('throws errors for invalid key length', () => {
      expect(() => encrypt('test', '1234567')).toThrowError(CipherError)
      expect(() => encrypt('test', '1234567')).toThrow(/must be exactly 8 bytes/)
    })

    it('throws errors for all 16 weak keys', () => {
      const weakKeys = [
        '0101010101010101', 'FEFEFEFEFEFEFEFE',
        'E0E0E0E0F1F1F1F1', '1F1F1F1F0E0E0E0E',
        '011F011F010E010E', '1F011F010E010E01',
        'E0FEE0FEF1FEF1FE', 'FEE0FEE0FEF1FEF1',
        '01E001E001F101F1', 'E001E001F101F101',
        '1FE01FE00EF10EF1', 'E01FE01FF10EF10E',
        '01FE01FE01FE01FE', 'FE01FE01FE01FE01',
        '1FFE1FFE0EFE0EFE', 'FE1FFE1FFE0EFE0E'
      ]
      for (const k of weakKeys) {
        expect(() => encrypt('test', k)).toThrowError(CipherError)
        expect(() => encrypt('test', k)).toThrow(/weak key detected/)
      }
    })
  })

  describe('3DES Core API', () => {
    it('encrypts and decrypts correctly in 2-key and 3-key modes', () => {
      const input = 'Triple DES text test'
      const key2 = '12345678abcdef01' // 16 bytes (2-key)
      const key3 = '12345678abcdef0123456789' // 24 bytes (3-key)

      const enc2 = encrypt3des(input, key2)
      const dec2 = decrypt3des(enc2.output, key2)
      expect(dec2.output).toBe(input)

      const enc3 = encrypt3des(input, key3)
      const dec3 = decrypt3des(enc3.output, key3)
      expect(dec3.output).toBe(input)
    })

    it('throws errors for invalid key length', () => {
      expect(() => encrypt3des('test', '12345678')).toThrowError(CipherError)
    })

    it('encrypts and decrypts correctly in instrumented mode', () => {
      const input = 'Triple DES instrumented'
      const key3 = '12345678abcdef0123456789'

      const enc3 = encrypt3des(input, key3, { instrument: true })
      const dec3 = decrypt3des(enc3.output, key3, { instrument: true })
      expect(dec3.output).toBe(input)

      // Verify that instrumented output matches fast output
      const encFast = encrypt3des(input, key3)
      expect(enc3.output).toBe(encFast.output)
    })
  })

  describe('DES Property-based Fuzzing', () => {
    it('DES: encrypt then decrypt returns original input', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 8, maxLength: 8 })
            .filter(s => {
              // Ensure it does not randomly generate a weak key in hex format
              return !/^[0-9a-fA-F]{16}$/.test(s)
            })
            .map(s => {
              let res = ''
              for (let i = 0; i < 8; i++) {
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

    it('3DES: encrypt then decrypt returns original input', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (input) => {
            const keyHex = '0123456789abcdef0123456789abcdef0123456789abcdef' // 24 bytes (3-key mode)
            const enc = encrypt3des(input, keyHex)
            const dec = decrypt3des(enc.output, keyHex)
            expect(dec.output).toBe(input)
          }
        ),
        { numRuns: 500 }
      )
    })
  })
})
