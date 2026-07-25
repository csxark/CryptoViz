import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/speck'

describe('Speck128/128', () => {
  it('matches the reference vector', () => {
    const v = TEST_VECTORS[0]
    expect(encrypt(v.input, v.key).output).toBe(v.expected)
  })

  it('round-trips: decrypt(encrypt(x)) === x', () => {
    const key = '000102030405060708090a0b0c0d0e0f'
    const plaintext = '48656c6c6f20776f726c64212021212a'
    const enc = encrypt(plaintext, key)
    const dec = decrypt(enc.output, key)
    expect(dec.output).toBe(plaintext)
  })

  it('rejects a key that is not 128 bits', () => {
    expect(() => encrypt('00'.repeat(16), '00'.repeat(8))).toThrow(/128-bit key/)
  })

  it('rejects input that is not a multiple of 16 bytes', () => {
    expect(() => encrypt('00112233', '000102030405060708090a0b0c0d0e0f')).toThrow(/multiple of 16 bytes/)
  })

  it('produces an instrumented trace', () => {
    const key = '000102030405060708090a0b0c0d0e0f'
    const result = encrypt('00'.repeat(16), key, { instrument: true })
    expect(result.steps.length).toBeGreaterThan(1)
    expect(result.steps[0].label).toMatch(/Key schedule/)
  })
})
