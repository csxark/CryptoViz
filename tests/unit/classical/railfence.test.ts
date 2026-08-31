import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/classical/railfence'
import { CipherError } from '../../../lib/utils/errors'
import fc from 'fast-check'

describe('Rail Fence Cipher Unit Tests', () => {
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
    // Rail Fence encrypt budget: setup + grid visualization + N rails + final result = 1 + 1 + 3 + 1 = 6 steps.
    expect(result.steps.length).toBe(6)
  })

  it('throws correct errors for invalid input and keys (#1724)', () => {
    expect(() => encrypt('', '3')).toThrowError(CipherError)
    expect(() => encrypt('hello', '1')).toThrowError(CipherError)
    expect(() => encrypt('hello', '0')).toThrowError(CipherError)
    expect(() => encrypt('hello', '-1')).toThrowError(CipherError)
    expect(() => encrypt('hello', '1.5')).toThrowError(CipherError)
    expect(() => encrypt('hello', 'abc')).toThrowError(CipherError)
    expect(() => encrypt('hello', '3', { rails: 1 })).toThrowError(CipherError)
    expect(() => decrypt('hello', '1')).toThrowError(CipherError)
    expect(() => decrypt('hello', '0')).toThrowError(CipherError)
    expect(() => decrypt('hello', '-2')).toThrowError(CipherError)
  })

  it('property-based fuzzing: encrypt then decrypt returns original', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 100 }),
        fc.integer({ min: 2, max: 15 }),
        (input, rails) => {
          const key = rails.toString()
          const enc = encrypt(input, key)
          const dec = decrypt(enc.output, key)
          expect(dec.output).toBe(input)
        }
      ),
      { numRuns: 100 }
    )
  })
})
