import { describe, expect, it } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/prince'

describe('PRINCE', () => {
    it('round trips via alpha-reflection', () => {
        const pt = '0123456789abcdef'
        const key = '00112233445566778899aabbccddeeff'
        const ct = encrypt(pt, key)
        expect(decrypt(ct.output, key).output).toBe(pt)
    })

    it('verifies alpha constant precision', () => {
        // Alpha = 0xC0AC29B7C97C50DDn
        // If stored as Number, precision is lost and decryption fails.
        const pt = 'ffffffffffffffff'
        const key = 'ffffffffffffffffffffffffffffffff'
        expect(decrypt(encrypt(pt, key).output, key).output).toBe(pt)
    })
})
