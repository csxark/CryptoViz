import { describe, expect, it } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/mantis'

describe('MANTIS', () => {
    it('round trips MANTIS-7', () => {
        const pt = '0001020304050607'
        const key = '00112233445566778899aabbccddeeff'
        const tweak = '0011223344556677'
        const ct = encrypt(pt, key, { tweak, variant: 7 })
        expect(decrypt(ct.output, key, { tweak, variant: 7 }).output).toBe(pt)
    })

    it('decrypt is equivalent to encrypt with swapped key halves', () => {
        const pt = '0001020304050607'
        const k0 = '0011223344556677'
        const k1 = '8899aabbccddeeff'
        const key = k0 + k1
        const keySwapped = k1 + k0
        const tweak = '0000000000000000'

        const ct = encrypt(pt, key, { tweak })
        const ctSwapped = encrypt(pt, keySwapped, { tweak })
        const dec = decrypt(ct.output, key, { tweak })

        expect(dec.output).toBe(pt)
        expect(ctSwapped.output).toBe(dec.output) // Reflection property
    })

    it('rejects invalid key length', () => {
        expect(() => encrypt('0000000000000000', '0011')).toThrow('INVALID_KEY_LENGTH')
    })
})
