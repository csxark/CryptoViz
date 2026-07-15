import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS, prepareText, parseHillKey } from '../../../lib/cipher/classical/hill'
import { CipherError } from '../../../lib/utils/errors'
import fc from 'fast-check'

describe('Hill Cipher Unit Tests', () => {
  it('passes standard test vectors (encrypt)', () => {
    for (const vector of TEST_VECTORS) {
      const result = encrypt(vector.input, vector.key)
      expect(result.output).toBe(vector.expected)
    }
  })

  it('passes standard test vectors (decrypt)', () => {
    for (const vector of TEST_VECTORS) {
      const result = decrypt(vector.expected, vector.key)
      expect(result.output).toBe(prepareText(vector.input))
    }
  })

  it('throws INPUT_REQUIRED for empty input', () => {
    expect(() => encrypt('', 'HILL')).toThrowError(CipherError)
  })

  it('throws INVALID_KEY_LENGTH when key is not exactly 4 letters', () => {
    expect(() => parseHillKey('ABC')).toThrowError(CipherError)
    expect(() => parseHillKey('ABCDE')).toThrowError(CipherError)
  })

  it('throws INVALID_KEY when key matrix is not invertible mod 26', () => {
    // det([[0,0],[0,0]]) = 0, not coprime with 26
    expect(() => parseHillKey('AAAA')).toThrowError(CipherError)
  })

  it('pads odd-length input with X and strips non-alphabetic characters', () => {
    expect(prepareText('Attack at dawn!')).toBe('ATTACKATDAWN')
    // even length already, no padding needed here — verify a genuinely odd case
    expect(prepareText('CAT')).toBe('CATX')
  })

  it('generates one milestone step plus one step per 2-letter block in instrumented mode', () => {
    const result = encrypt('HELP', 'HILL', { instrument: true })
    // "HELP" -> 2 blocks (HE, LP) + 1 key-setup milestone step
    expect(result.steps.length).toBe(3)
    expect(result.steps[0].isMilestone).toBe(true)
  })

  it('property-based fuzzing: encrypt then decrypt returns the prepared plaintext', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 40 }).map((s) => s.replace(/[^a-zA-Z]/g, '') + 'ab'),
        (input: string) => {
          const key = 'HILL'
          const enc = encrypt(input, key)
          const dec = decrypt(enc.output, key)
          expect(dec.output).toBe(prepareText(input))
        }
      ),
      { numRuns: 100 }
    )
  })
})
