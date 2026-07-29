import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/gost'

describe('GOST 28147-89', () => {
  it('matches the reference vector', () => {
    const v = TEST_VECTORS[0]
    expect(encrypt(v.input, v.key).output).toBe(v.expected)
  })

  it('round-trips: decrypt(encrypt(x)) === x', () => {
    const key = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'
    const plaintext = '48656c6c6f2130'.padEnd(16, '0')
    const enc = encrypt(plaintext, key)
    const dec = decrypt(enc.output, key)
    expect(dec.output).toBe(plaintext)
  })

  it('rejects a key that is not 256 bits', () => {
    expect(() => encrypt('0000000000000000', '00'.repeat(16))).toThrow(/256-bit key/)
  })

  it('rejects input that is not a multiple of 8 bytes', () => {
    expect(() => encrypt('001122', '00'.repeat(32))).toThrow(/multiple of 8 bytes/)
  })
})
