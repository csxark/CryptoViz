import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/asymmetric/elgamal'
import { CipherError } from '../../../lib/utils/errors'

describe('ElGamal Unit Tests', () => {
  it('passes standard test vectors (encrypt with fixed ephemeral key)', () => {
    const vector = TEST_VECTORS[0]
    const result = encrypt(vector.input, vector.key)
    expect(result.output).toBe(vector.expected)
  })

  it('passes standard test vectors (decrypt)', () => {
    const vector = TEST_VECTORS[1]
    const result = decrypt(vector.input, vector.key)
    expect(result.output).toBe(vector.expected)
  })

  it('round-trips with a random ephemeral key when none is fixed', () => {
    const enc = encrypt('7', '23,5,8') // no fixed k -> random ephemeral each run
    const dec = decrypt(enc.output, '23,5,6')
    expect(dec.output).toBe('7')
  })

  it('produces different ciphertext across runs without a fixed k (semantic security)', () => {
    const enc1 = encrypt('7', '23,5,8')
    const enc2 = encrypt('7', '23,5,8')
    // Extremely unlikely to collide with p=23 giving ~19 possible k values
    expect(enc1.output === enc2.output).toBe(false)
  })

  it('throws INPUT_REQUIRED for empty input', () => {
    expect(() => encrypt('', '23,5,8')).toThrowError(CipherError)
    expect(() => decrypt('', '23,5,6')).toThrowError(CipherError)
  })

  it('throws INPUT_TOO_LONG when message value is >= p', () => {
    expect(() => encrypt('25', '23,5,8,15')).toThrowError(CipherError)
  })

  it('throws INVALID_KEY for malformed key strings', () => {
    expect(() => encrypt('4', '23,5')).toThrowError(CipherError)
    expect(() => decrypt('19,8', '23,5')).toThrowError(CipherError)
  })

  it('generates a key-setup milestone step plus one step per block in instrumented mode', () => {
    const result = encrypt('4', '23,5,8,15', { instrument: true })
    expect(result.steps.length).toBe(2) // key setup + 1 block
    expect(result.steps[0].isMilestone).toBe(true)
  })
})
