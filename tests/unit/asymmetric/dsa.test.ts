import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/asymmetric/dsa'

describe('DSA', () => {
  it('matches the verified sign test vector', () => {
    const v = TEST_VECTORS[0]
    expect(encrypt(v.input, v.key).output).toBe(v.expected)
  })

  it('verifies a valid signature', () => {
    // H=15, r=5, s=9, public key p=47,q=23,g=4,y=37
    const result = decrypt('15,5,9', '47,23,4,37')
    expect(result.output).toBe('VALID')
  })

  it('rejects a tampered message hash', () => {
    expect(() => decrypt('16,5,9', '47,23,4,37')).toThrow(/VERIFICATION_FAILED/)
  })

  it('rejects a tampered signature', () => {
    expect(() => decrypt('15,6,9', '47,23,4,37')).toThrow(/VERIFICATION_FAILED/)
  })

  it('rejects r or s outside [1, q-1]', () => {
    expect(() => decrypt('15,0,9', '47,23,4,37')).toThrow(/\[1, q-1\]/)
  })
})
