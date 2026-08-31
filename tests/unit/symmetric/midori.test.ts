import { describe, expect, it } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/midori'

describe('MIDORI', () => {
    it('round trips MIDORI-64', () => {
        const pt = '0001020304050607'
        const key = '00112233445566778899aabbccddeeff' // 16 bytes
        const ct = encrypt(pt, key, { variant: '64' })
        expect(decrypt(ct.output, key, { variant: '64' }).output).toBe(pt)
    })

    it('round trips MIDORI-128', () => {
        const pt = '000102030405060708090a0b0c0d0e0f'
        const key = '00112233445566778899aabbccddeeff'
        const ct = encrypt(pt, key, { variant: '128' })
        expect(decrypt(ct.output, key, { variant: '128' }).output).toBe(pt)
    })

    it('rejects invalid key length', () => {
        expect(() => encrypt('0000000000000000', '0011', { variant: '64' })).toThrow('INVALID_KEY_LENGTH')
    })
})
