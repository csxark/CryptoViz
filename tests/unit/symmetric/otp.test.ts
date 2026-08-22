/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { encrypt, decrypt, clearOtpKeyHistory, TEST_VECTORS } from '../../../lib/cipher/symmetric/otp'
import { CipherError } from '../../../lib/utils/errors'
import fc from 'fast-check'

describe('OTP Cipher Unit Tests', () => {
  beforeEach(() => {
    clearOtpKeyHistory()
  })

  it('passes standard test vectors (encrypt/decrypt)', () => {
    for (const vector of TEST_VECTORS) {
      const encResult = encrypt(vector.input, vector.key)
      expect(encResult.output).toBe(vector.expected)

      const decResult = decrypt(vector.expected, vector.key)
      expect(decResult.output).toBe(vector.input)
    }
  })

  it('detects key reuse and warns in instrumented steps', () => {
    const input1 = 'HELLO'
    const input2 = 'WORLD'
    const key = 'ABCDE'

    const enc1 = encrypt(input1, key, { instrument: true })
    const reuseCheck1 = enc1.steps[0].table?.find((row) => row.key === 'Key Reuse Check')
    expect(reuseCheck1?.value).toContain('Unique key')

    const enc2 = encrypt(input2, key, { instrument: true })
    const reuseCheck2 = enc2.steps[0].table?.find((row) => row.key === 'Key Reuse Check')
    expect(reuseCheck2?.value).toContain('WARNING: Key reused')
    expect(enc2.steps[0].note).toContain('KEY REUSE DETECTED')
  })

  it('includes reuseWarning in metadata', () => {
    const result = encrypt('HELLO', 'ABCDE')
    expect(result.metadata.reuseWarning).toMatch(/key must never be reused/i)
  })

  it('generates correct step count in instrumented mode', () => {
    const input = 'HELLO'
    const key = '12345'
    const result = encrypt(input, key, { instrument: true })
    // OTP budget: 1 per byte + 2 (setup + secrecy analysis)
    expect(result.steps.length).toBe(input.length + 2)
  })

  it('throws correct error when key is shorter than input', () => {
    expect(() => encrypt('HELLO', '123')).toThrowError(CipherError)
    expect(() => encrypt('HELLO', '123')).toThrow(/must be at least as long/)
  })

  it('property-based fuzzing: encrypt then decrypt returns original', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (input) => {
          // Generate key that is exactly the same length
          const keyBytes = new Uint8Array(input.length)
          for (let i = 0; i < input.length; i++) {
            keyBytes[i] = Math.floor(Math.random() * 256)
          }
          const keyHex = Array.from(keyBytes).map(b => b.toString(16).padStart(2, '0')).join('')

          const enc = encrypt(input, keyHex)
          const dec = decrypt(enc.output, keyHex)
          expect(dec.output).toBe(input)
        }
      ),
      { numRuns: 500 }
    )
  })
})
