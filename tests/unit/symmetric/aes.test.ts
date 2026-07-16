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
      const result = encrypt(input, key, { instrument: true, mode: 'ECB' })
      // AES-128 instrumented steps = 44
      expect(result.steps.length).toBe(44)
    })

    it('generates correct step count in instrumented mode (AES-256)', () => {
      const input = 'HELLO'
      const key = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f' // 32 bytes (AES-256)
      const result = encrypt(input, key, { instrument: true, mode: 'ECB' })
      // AES-256 instrumented steps = 60
      expect(result.steps.length).toBe(60)
    })

    it('throws errors for invalid key sizes', () => {
      expect(() => encrypt('test', '12345678')).toThrowError(CipherError)
      expect(() => encrypt('test', '12345678')).toThrow(/must be exactly 16, 24, or 32 bytes/)
    })

    it('produces different ciphertext blocks for identical plaintext blocks under CBC', () => {
      const plaintext = 'AAAAAAAAAAAAAAAA' + 'BBBBBBBBBBBBBBBB' + 'AAAAAAAAAAAAAAAA'
      const key = '0123456789abcdef0123456789abcdef'
      const result = encrypt(plaintext, key, { mode: 'CBC' })
      const ciphertext = result.output.slice(32)
      const block1 = ciphertext.slice(0, 32)
      const block3 = ciphertext.slice(64, 96)
      expect(block1).not.toBe(block3)
    })

    it('round-trips encrypt/decrypt correctly under CBC', () => {
      const plaintext = 'Hello, CryptoViz!'
      const key = '0123456789abcdef0123456789abcdef'
      const encrypted = encrypt(plaintext, key, { mode: 'CBC' })
      const decrypted = decrypt(encrypted.output, key, { mode: 'CBC' })
      expect(decrypted.output).toBe(plaintext)
    })

    it('includes CBC chaining steps in instrumented encrypt mode', () => {
      const input = 'HELLO'
      const key = '000102030405060708090a0b0c0d0e0f'
      const iv = '00000000000000000000000000000000'
      const result = encrypt(input, key, { instrument: true, mode: 'CBC', iv })

      expect(result.steps.some(s => s.label === 'CBC Initialization Vector (IV)')).toBe(true)
      expect(result.steps.some(s => s.label.includes('CBC Mode XOR'))).toBe(true)
      expect(result.steps.length).toBe(45)
    })

    it('includes CBC chaining steps in instrumented decrypt mode', () => {
      const plaintext = 'HELLO'
      const key = '000102030405060708090a0b0c0d0e0f'
      const iv = '00000000000000000000000000000000'
      const encrypted = encrypt(plaintext, key, { mode: 'CBC', iv })
      const decrypted = decrypt(encrypted.output, key, { instrument: true, mode: 'CBC' })

      expect(decrypted.steps.some(s => s.label === 'CBC Initialization Vector (IV)')).toBe(true)
      expect(decrypted.steps.some(s => s.label.includes('CBC Mode XOR'))).toBe(true)
      expect(decrypted.output).toBe(plaintext)
    })

    it('round-trips multi-block instrumented CBC', () => {
      const plaintext = 'A'.repeat(17)
      const key = '000102030405060708090a0b0c0d0e0f'
      const iv = '00000000000000000000000000000000'

      const encrypted = encrypt(plaintext, key, { instrument: true, mode: 'CBC', iv })
      const decrypted = decrypt(encrypted.output, key, { instrument: true, mode: 'CBC' })

      expect(encrypted.steps.filter(s => s.label.includes('CBC Mode XOR'))).toHaveLength(2)
      expect(decrypted.steps.filter(s => s.label.includes('CBC Mode XOR'))).toHaveLength(2)
      expect(decrypted.output).toBe(plaintext)
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
          (input: string, keyStr: string) => {
            const enc = encrypt(input, keyStr)
            const dec = decrypt(enc.output, keyStr)
            expect(dec.output).toBe(input)
          }
        ),
        { numRuns: 500 }
      )
    })
  })

  describe('AES Instrumented CBC Mode', () => {
    it('round-trips encrypt/decrypt correctly in instrumented CBC mode', () => {
      const plaintext = 'Hello, CryptoViz!'
      const key = '0123456789abcdef0123456789abcdef' // 16 bytes (32 hex characters)
      const iv = '000102030405060708090a0b0c0d0e0f' // 16 bytes (32 hex characters)

      const encrypted = encrypt(plaintext, key, { instrument: true, mode: 'CBC', iv })
      // Verify that encryption works and has steps
      expect(encrypted.steps.length).toBe(47) // 2 blocks: full block 1 trace + IV + block 2 CBC XOR
      expect(encrypted.steps.some(s => s.label === 'CBC Initialization Vector (IV)')).toBe(true)
      expect(encrypted.steps.some(s => s.label === 'Block 1 — CBC Mode XOR')).toBe(true)

      const decrypted = decrypt(encrypted.output, key, { instrument: true, mode: 'CBC' })
      expect(decrypted.output).toBe(plaintext)
      expect(decrypted.steps.length).toBe(47)
      expect(decrypted.steps.some(s => s.label === 'CBC Initialization Vector (IV)')).toBe(true)
      expect(decrypted.steps.some(s => s.label === 'Block 1 — CBC Mode XOR')).toBe(true)
    })
  })
})
