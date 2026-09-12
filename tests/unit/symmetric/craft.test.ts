import { describe, expect, it } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/craft'

describe('CRAFT', () => {
    it('round trips via reflection decryption', () => {
        const pt = '0001020304050607'
        const key = '00112233445566778899aabbccddeeff'
        const tweak = '0011223344556677'
        const ct = encrypt(pt, key, { tweak })
        expect(decrypt(ct.output, key, { tweak }).output).toBe(pt)
    })

    it('decrypt matches original plaintext', () => {
        const pt = '0001020304050607'
        const key = '00112233445566778899aabbccddeeff'
        const tweak = '0011223344556677'
        const ct = encrypt(pt, key, { tweak })

        const dec = decrypt(ct.output, key, { tweak })
        expect(dec.output).toBe(pt)
    })

    it('rejects invalid key length', () => {
        expect(() => encrypt('0000000000000000', '0011')).toThrow('INVALID_KEY_LENGTH')
    })
})
