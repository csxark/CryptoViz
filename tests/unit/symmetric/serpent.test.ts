import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/serpent'

describe('Serpent', () => {
  const key = '000102030405060708090a0b0c0d0e0f'

  it('matches the official NESSIE test vector', () => {
    const v = TEST_VECTORS[0]
    const res = encrypt(v.input, v.key)
    expect(res.output).toBe(v.expected)
  })

  it('round-trips: decrypt(encrypt(x)) === x', () => {
    const plaintext = '00112233445566778899aabbccddeeff'
    const enc = encrypt(plaintext, key)
    const dec = decrypt(enc.output, key)
    expect(dec.output).toBe(plaintext)
  })

  it('rejects a key that is not 128 bits', () => {
    // Serpent supports 128, 192, 256; this implementation is locked to 128
    expect(() => encrypt('00'.repeat(16), '00'.repeat(8))).toThrow(/128-bit/)
  })

  it('rejects input that is not exactly 16 bytes', () => {
    expect(() => encrypt('00112233', key)).toThrow(/16 bytes/)
  })

  it('produces an instrumented trace with milestones', () => {
    const result = encrypt('00'.repeat(16), key, { instrument: true })
    expect(result.steps.length).toBeGreaterThan(0)
    expect(result.steps.some(s => s.isMilestone)).toBe(true)
    expect(result.steps[0].label).toBe('Key Schedule')
  })
})
