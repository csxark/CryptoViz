import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/classical/adfgvx'
import { CipherError } from '../../../lib/utils/errors'
import fc from 'fast-check'

describe('ADFGVX Cipher Unit Tests', () => {
  it('passes standard test vectors (encrypt)', () => {
    for (const vector of TEST_VECTORS) {
      const result = encrypt(vector.input, vector.key)
      expect(result.output).toBe(vector.expected)
    }
  })

  it('passes standard test vectors (decrypt)', () => {
    for (const vector of TEST_VECTORS) {
      const result = decrypt(vector.expected, vector.key)
      expect(result.output).toBe(vector.input.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    }
  })

  it('throws INPUT_REQUIRED for empty input', () => {
    expect(() => encrypt('', 'PICTURE,GERMAN')).toThrowError(CipherError)
  })

  it('throws INVALID_KEY when the key is not "gridKey,transKey"', () => {
    expect(() => encrypt('HELLO', 'ONLYONEKEY')).toThrowError(CipherError)
    expect(() => encrypt('HELLO', ',MISSINGFIRST')).toThrowError(CipherError)
  })

  it('throws INVALID_INPUT for malformed ADFGVX ciphertext on decrypt', () => {
    expect(() => decrypt('ZZZZ', 'PICTURE,GERMAN')).toThrowError(CipherError)
    expect(() => decrypt('ADF', 'PICTURE,GERMAN')).toThrowError(CipherError) // odd length
  })

  it('generates a grid-build milestone plus one step per character in instrumented mode', () => {
    const result = encrypt('HELLO', 'PICTURE,GERMAN', { instrument: true })
    // 1 grid-build milestone + 5 substitution steps + 1 transposition milestone
    expect(result.steps.length).toBe(7)
    expect(result.steps[0].isMilestone).toBe(true)
  })

  it('property-based fuzzing: encrypt then decrypt returns the cleaned plaintext', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 60 }).map((s) => (s.replace(/[^a-zA-Z0-9]/g, '') || 'AB')),
        (input) => {
          const key = 'PICTURE,GERMAN'
          const enc = encrypt(input, key)
          const dec = decrypt(enc.output, key)
          expect(dec.output).toBe(input.toUpperCase())
        }
      ),
      { numRuns: 1000 }
    )
  })
})
