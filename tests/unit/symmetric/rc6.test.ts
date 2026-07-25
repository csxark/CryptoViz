import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/rc6'

describe('RC6-32/20/16', () => {
  it('matches the published test vector', () => {
    const v = TEST_VECTORS[0]
    const result = encrypt(v.input, v.key)
    expect(result.output).toBe(v.expected)
  })

  it('round-trips arbitrary 16-byte-aligned input', () => {
    const key = '000102030405060708090a0b0c0d0e0f'
    const plaintext = '48656c6c6f20776f726c6421202020202020202020202020202020'.slice(0, 32)
    const enc = encrypt(plaintext, key)
    const dec = decrypt(enc.output, key)
    expect(dec.output).toBe(plaintext)
  })

  it('rejects a key that is not 128 bits', () => {
    expect(() => encrypt('00000000000000000000000000000000'.slice(0, 32), '00'.repeat(8))).toThrow(/128-bit key/)
  })

  it('rejects input that is not a multiple of 16 bytes', () => {
    expect(() => encrypt('00112233', '000102030405060708090a0b0c0d0e0f')).toThrow(/multiple of 16 bytes/)
  })

  it('rejects non-hex input', () => {
    expect(() => encrypt('zz'.repeat(16), '000102030405060708090a0b0c0d0e0f')).toThrow()
  })

  it('produces an instrumented trace with per-block steps', () => {
    const key = '000102030405060708090a0b0c0d0e0f'
    const result = encrypt('00000000000000000000000000000000'.slice(0, 32), key, { instrument: true })
    expect(result.steps.length).toBeGreaterThan(1)
    expect(result.steps[0].label).toMatch(/Key schedule/)
  })
})