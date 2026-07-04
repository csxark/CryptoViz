import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/classical/vigenere'
import { CipherError } from '../../../lib/utils/errors'
import fc from 'fast-check'

describe('Vigenere Cipher Unit Tests', () => {
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
    const key = 'KEY'
    const result = encrypt(input, key, { instrument: true })
    // Vigenere step budget: 1 per char + 3 (setup + stream + final table alignment)
    expect(result.steps.length).toBe(input.length + 3)
    expect(result.steps[result.steps.length - 1].label).toBe('Vigenère table alignment')
    expect(result.steps[result.steps.length - 1].matrix).toBeDefined()
    expect(result.output).toBe('RIJVS')

    // Verify metadata
    expect(result.metadata.name).toBe('Vigenère Cipher')
    expect(result.metadata.securityStatus).toBe('broken')

    // Verify structure of steps
    for (const step of result.steps) {
      expect(step).toHaveProperty('index')
      expect(step).toHaveProperty('label')
      expect(step).toHaveProperty('inputState')
      expect(step).toHaveProperty('outputState')
    }
  })

  it('handles non-alphabetic characters in input and filters keys correctly', () => {
    expect(encrypt('Hello, World!', 'key').output).toBe('Rijvs, Uyvjn!')
    expect(() => encrypt('HELLO', '12345')).toThrowError(CipherError)
    expect(() => encrypt('HELLO', '')).toThrowError(CipherError)

    // Max length check (> 4096 bytes)
    const longInput = 'A'.repeat(4097)
    expect(() => encrypt(longInput, 'key')).toThrowError(CipherError)
    expect(() => encrypt(longInput, 'key')).toThrow(/exceeds/)
  })

  it('property-based fuzzing: encrypt then decrypt returns original for alphabetic input', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 10 }).map(s => s.replace(/[^a-zA-Z]/g, '') + 'a'),
        (input, key) => {
          const enc = encrypt(input, key)
          const dec = decrypt(enc.output, key)
          expect(dec.output).toBe(input)
        }
      ),
      { numRuns: 100 }
    )
  })
})
