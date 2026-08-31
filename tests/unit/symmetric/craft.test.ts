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

    it('decrypt via twisted tweak matches encrypt', () => {
        const pt = '0001020304050607'
        const key = '00112233445566778899aabbccddeeff'
        const tweak = '0011223344556677'
        const ct = encrypt(pt, key, { tweak })

        // Manually compute twisted tweak
        const T = BigInt('0x' + tweak)
        const TWIST = [3, 0, 1, 2, 7, 4, 5, 6, 11, 8, 9, 10, 15, 12, 13, 14]
        let twisted = 0n
        for (let i = 0; i < 16; i++) {
            const nib = (T >> BigInt(i * 4)) & 0xFn
            twisted |= (nib << BigInt(TWIST[i] * 4))
        }

        const ct2 = encrypt(ct.output, key, { tweak: twisted.toString(16).padStart(16, '0') })
        expect(ct2.output).toBe(pt)
    })

    it('rejects invalid key length', () => {
        expect(() => encrypt('0000000000000000', '0011')).toThrow('INVALID_KEY_LENGTH')
    })
})
