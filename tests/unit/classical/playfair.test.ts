import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS, preparePlaintext } from '../../../lib/cipher/classical/playfair'
import { CipherError } from '../../../lib/utils/errors'
import fc from 'fast-check'

describe('Playfair Cipher Unit Tests', () => {
  it('passes standard test vectors (encrypt)', () => {
    for (const vector of TEST_VECTORS) {
      const result = encrypt(vector.input, vector.key)
      expect(result.output).toBe(vector.expected)
    }
  })

  it('passes standard test vectors (decrypt)', () => {
    for (const vector of TEST_VECTORS) {
      // Decrypted Playfair has J -> I, no non-alphabetic chars, and inserted 'X's.
      // The expected vector was prepared from "HIDE THE GOLD IN THE TREE STUMP" -> "HIDETHEGOLDINTHETREXESTUMP"
      const result = decrypt(vector.expected, vector.key)
      expect(result.output).toBe('HIDETHEGOLDINTHETREXESTUMP')
    }
  })

  it('generates correct step count in instrumented mode', () => {
    const input = 'HELLO'
    const key = 'PLAYFAIR'
    const result = encrypt(input, key, { instrument: true })
    // input prepared: HE -> HE, LL -> LX, O -> OX. Total bigrams: 3.
    // Playfair budget: 2 per bigram + 3 (setup + preparation + final) = 9 steps.
    expect(result.steps.length).toBe(2 * 3 + 3)
  })

  it('throws correct errors for invalid input and keys', () => {
    expect(() => encrypt('', 'key')).toThrowError(CipherError)
    expect(() => encrypt('hello', '')).toThrowError(CipherError)
  })

  it('correctly decrypts ciphertext containing consecutive duplicate characters without corruption', () => {
    const key = 'PLAYFAIR EXAMPLE'
    const plaintext = 'HE EH'
    const enc = encrypt(plaintext, key)
    expect(enc.output).toBe('DMMD')

    const dec = decrypt(enc.output, key)
    expect(dec.output).toBe('HEEH')
  })

  it('correctly splits repeated "XX" digraphs using "Q" filler (#1721)', () => {
    // "FOXXES" -> "FO", "XQ", "XE", "SX" -> prepared string "FOXQXESX"
    expect(preparePlaintext('FOXXES')).toBe('FOXQXESX')

    // "XX" -> "XQ", "XQ" -> prepared string "XQXQ"
    expect(preparePlaintext('XX')).toBe('XQXQ')

    // "XXX" -> "XQ", "XQ", "XQ" -> prepared string "XQXQXQ"
    expect(preparePlaintext('XXX')).toBe('XQXQXQ')

    // "FOX" -> "FO", "XQ" -> prepared string "FOXQ"
    expect(preparePlaintext('FOX')).toBe('FOXQ')
  })

  it('encrypts and decrypts inputs containing repeated "XX" digraphs losslessly', () => {
    const key = 'PLAYFAIR EXAMPLE'
    const input = 'FOXXES'
    const enc = encrypt(input, key)
    const dec = decrypt(enc.output, key)
    expect(dec.output).toBe(preparePlaintext(input))
  })

  it('property-based fuzzing: encrypt then decrypt returns prepared plaintext', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 50 }).map(s => s.replace(/[^a-zA-Z]/g, '') + 'ab'),
        fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z]/g, '') + 'a'),
        (input: string, key: string) => {
          const enc = encrypt(input, key)
          const dec = decrypt(enc.output, key)
          // Since decrypt returns uppercase prepared plaintext:
          const prepared = preparePlaintext(input)
          expect(dec.output).toBe(prepared)
        }
      ),
      { numRuns: 100 }
    )
  })
})
