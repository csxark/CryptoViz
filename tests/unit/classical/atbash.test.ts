import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/classical/atbash'
import { CipherError } from '../../../lib/utils/errors'
import fc from 'fast-check'

describe('Atbash Cipher Unit Tests', () => {
  it('passes standard test vectors (encrypt/decrypt)', () => {
    for (const vector of TEST_VECTORS) {
      const encResult = encrypt(vector.input, vector.key)
      expect(encResult.output).toBe(vector.expected)

      const decResult = decrypt(vector.expected, vector.key)
      expect(decResult.output).toBe(vector.input)
    }
  })

  it('generates correct step count in instrumented mode', () => {
    const input = 'HELLO'
    const result = encrypt(input, '', { instrument: true })
    // Atbash budget: 1 per char + 1 setup = input.length + 1
    expect(result.steps.length).toBe(input.length + 1)
    expect(result.steps[0].label).toBe('Alphabet mirror table')
    expect(result.output).toBe('SVOOL')

    // Verify metadata
    expect(result.metadata.name).toBe('Atbash Cipher')
    expect(result.metadata.securityStatus).toBe('broken')

    // Verify structure of steps
    for (const step of result.steps) {
      expect(step).toHaveProperty('index')
      expect(step).toHaveProperty('label')
      expect(step).toHaveProperty('inputState')
      expect(step).toHaveProperty('outputState')
    }
  })

  it('passes non-alphabetic and special characters through unchanged', () => {
    const input = '123!@# 🔥'
    const result = encrypt(input)
    expect(result.output).toBe(input)
  })

  it('is self-inverse', () => {
    const input = 'Atbash Cryptography'
    const enc = encrypt(input).output
    const dec = decrypt(enc).output
    expect(dec).toBe(input)
  })

  it('throws correct errors for invalid input', () => {
    expect(() => encrypt('')).toThrowError(CipherError)
    expect(() => encrypt('')).toThrow(/required/)

    // Max length check (> 4096 bytes)
    const longInput = 'A'.repeat(4097)
    expect(() => encrypt(longInput)).toThrowError(CipherError)
    expect(() => encrypt(longInput)).toThrow(/exceeds/)
  })

  it('property-based fuzzing: encrypt(encrypt(x)) === x', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (input) => {
          const enc = encrypt(input).output
          const doubleEnc = encrypt(enc).output
          expect(doubleEnc).toBe(input)
        }
      ),
      { numRuns: 100 }
    )
  })
})
