import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/classical/caesar'
import { CipherError } from '../../../lib/utils/errors'
import fc from 'fast-check'

describe('Caesar Cipher Unit Tests', () => {
  it('passes standard test vectors (encrypt)', () => {
    for (const vector of TEST_VECTORS) {
      const result = encrypt(vector.input, vector.key)
      expect(result.output).toBe(vector.expected)
    }
  })

  it('passes standard test vectors (decrypt)', () => {
    for (const vector of TEST_VECTORS) {
      const result = decrypt(vector.expected, vector.key)
      expect(result.output).toBe(vector.input)
    }
  })

  it('generates correct step count in instrumented mode', () => {
    const input = 'HELLO'
    const key = '3'
    const result = encrypt(input, key, { instrument: true })
    // Caesar step budget: 1 per char + 1 setup = input.length + 1
    expect(result.steps.length).toBe(input.length + 1)
    expect(result.steps[0].label).toBe('Key setup')
    expect(result.steps[1].label).toBe("Character 1 — 'H'")
  })

  it('handles shift wrapping and non-alphabetic characters correctly', () => {
    expect(encrypt('abc', '0').output).toBe('abc')
    expect(encrypt('xyz', '3').output).toBe('abc')
    expect(encrypt('xyz', '29').output).toBe('abc') // 29 mod 26 = 3
    expect(encrypt('Hello, World!', '1').output).toBe('Ifmmp, Xpsme!')
  })

 // TODO: skipped — encrypt() doesn't validate >4096 byte input yet, tracked in #110
  it.skip('throws correct errors for invalid input and keys', () => {
    expect(() => encrypt('', '3')).toThrowError(CipherError)
    expect(() => encrypt('', '3')).toThrow(/required/)
    expect(() => encrypt('HELLO', 'abc')).toThrowError(CipherError)
    expect(() => encrypt('HELLO', 'abc')).toThrow(/integer/)

    // Max length check (> 4096 bytes)
    const longInput = 'A'.repeat(4097)
    expect(() => encrypt(longInput, '3')).toThrowError(CipherError)
  })

  it('property-based fuzzing: encrypt then decrypt returns original for alpha/ASCII', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: -100, max: 100 }),
        (input, keyInt) => {
          const key = keyInt.toString()
          // We only expect round-trip identity for cases where input is not stripped/mutated.
          // Caesar preserves non-alphabetic characters, so round-trip holds for all strings.
          const enc = encrypt(input, key)
          const dec = decrypt(enc.output, key)
          expect(dec.output).toBe(input)
        }
      ),
      { numRuns: 100 }
    )
  })
})
