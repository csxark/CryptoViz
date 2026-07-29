import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/threefish'

describe('Threefish-256', () => {
  const key = '17161514131211101f1e1d1c1b1a191827262524232221202f2e2d2c2b2a2928'
  const tweak = '07060504030201000f0e0d0c0b0a0908'
  const zeroBlock = '0'.repeat(64)

  it('round-trips: decrypt(encrypt(x)) === x', () => {
    const enc = encrypt(zeroBlock, `${key}|${tweak}`)
    const dec = decrypt(enc.output, `${key}|${tweak}`)
    expect(dec.output).toBe(zeroBlock)
  })

  it('a different tweak produces different ciphertext for the same key+plaintext', () => {
    const encA = encrypt(zeroBlock, `${key}|${tweak}`)
    const encB = encrypt(zeroBlock, `${key}|00000000000000000000000000000001`)
    expect(encA.output).not.toBe(encB.output)
  })

  it('defaults the tweak to zero when omitted', () => {
    const enc = encrypt(zeroBlock, key)
    const dec = decrypt(enc.output, key)
    expect(dec.output).toBe(zeroBlock)
  })

  it('rejects a key that is not 256 bits', () => {
    expect(() => encrypt(zeroBlock, '00'.repeat(16))).toThrow(/256-bit key/)
  })

  it('rejects input that is not exactly 32 bytes', () => {
    expect(() => encrypt('00112233', key)).toThrow(/32 bytes/)
  })
})
