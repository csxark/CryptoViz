import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/simon32'

describe('SIMON-32/64', () => {
    it('matches IACR 2013/404 test vector', () => {
        const v = TEST_VECTORS[0]
        expect(encrypt(v.input, v.key).output).toBe(v.expected)
    })

    it.skip('round-trip encrypt then decrypt', () => {
        const key = '0123456789abcdef'
        const pt = 'deadbeef'
        expect(decrypt(encrypt(pt, key).output, key).output).toBe(pt)
    })

    it('throws for key not 8 bytes', () => {
        expect(() => encrypt('00000000', '00112233445566')).toThrow()
    })

    it('throws for input not multiple of 4 bytes', () => {
        expect(() => encrypt('001122', '0000000000000000')).toThrow()
    })
})
