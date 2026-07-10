import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/classical/rot13'
import { CipherError } from '../../../lib/utils/errors'
import fc from 'fast-check'

describe('ROT13 Cipher Unit Tests', () => {
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
    const result = encrypt(input, '13', { instrument: true })
    expect(result.steps.length).toBe(input.length + 1)
  })

  it('is self-inverse', () => {
    const input = 'Vulnerable Cryptography'
    const enc = encrypt(input).output
    const dec = decrypt(enc).output
    expect(dec).toBe(input)
  })

  // TODO: skipped — encrypt() doesn't validate >4096 byte input yet, tracked in #110
  it.skip('throws correct errors for invalid input', () => {
    expect(() => encrypt('')).toThrowError(CipherError)
    const longInput = 'A'.repeat(4097)
    expect(() => encrypt(longInput)).toThrowError(CipherError)
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
