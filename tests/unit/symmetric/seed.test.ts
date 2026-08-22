import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/seed'

describe('SEED-128', () => {
    it('matches all RFC 4269 Appendix B test vectors (encrypt)', () => {
        for (const v of TEST_VECTORS) {
            expect(encrypt(v.input, v.key).output.toLowerCase()).toBe(v.expected.toLowerCase())
        }
    })

    it('matches all RFC 4269 Appendix B test vectors (decrypt)', () => {
        for (const v of TEST_VECTORS) {
            expect(decrypt(v.expected, v.key).output.toLowerCase()).toBe(v.input.toLowerCase())
        }
    })

    it.skip('round-trip encrypt then decrypt', () => {
        const key = '00000000000000000000000000000000'
        const pt = '000102030405060708090a0b0c0d0e0f'
        expect(decrypt(encrypt(pt, key).output, key).output).toBe(pt)
    })

    it('different keys produce different ciphertexts', () => {
        const pt = '000102030405060708090a0b0c0d0e0f'
        const key1 = '00000000000000000000000000000000'
        const key2 = '00000000000000000000000000000001'
        expect(encrypt(pt, key1).output).not.toBe(encrypt(pt, key2).output)
    })

    it('throws for key not 16 bytes', () => {
        expect(() => encrypt('00000000000000000000000000000000', '0011')).toThrow()
    })

    it('throws for input not multiple of 16 bytes', () => {
        expect(() => encrypt('001122', '00000000000000000000000000000000')).toThrow()
    })
})
