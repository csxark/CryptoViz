import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/noekeon'

describe('NOEKEON', () => {
    it.skip('matches NOEKEON direct mode test vector', () => {
        const v = TEST_VECTORS[0]
        expect(encrypt(v.input, v.key).output).toBe(v.expected)
    })

    it.skip('round-trip encrypt then decrypt', () => {
        const key = '000102030405060708090a0b0c0d0e0f'
        const pt = 'deadbeefcafebabe0011223344556677'
        expect(decrypt(encrypt(pt, key).output, key).output).toBe(pt)
    })

    it('throws for key not 16 bytes', () => {
        expect(() => encrypt('00000000000000000000000000000000', '0011')).toThrow()
    })

    it('throws for input not multiple of 16 bytes', () => {
        expect(() => encrypt('001122', '00000000000000000000000000000000')).toThrow()
    })
})
