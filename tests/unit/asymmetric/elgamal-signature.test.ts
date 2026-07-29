import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/asymmetric/elgamal-signature'

describe('ElGamal Signature Scheme', () => {
  it('matches the verified sign test vector', () => {
    const v = TEST_VECTORS[0]
    expect(encrypt(v.input, v.key).output).toBe(v.expected)
  })

  it('verifies a valid signature', () => {
    const result = decrypt('100,29,51', '467,2,132') // p,g,y (public)
    expect(result.output).toBe('VALID')
  })

  it('rejects a tampered message hash', () => {
    expect(() => decrypt('101,29,51', '467,2,132')).toThrow(/VERIFICATION_FAILED/)
  })

  it('rejects a tampered signature', () => {
    expect(() => decrypt('100,30,51', '467,2,132')).toThrow(/VERIFICATION_FAILED/)
  })

  it('rejects r outside (0, p)', () => {
    expect(() => decrypt('100,0,51', '467,2,132')).toThrow(/0 < r < p/)
  })
})
