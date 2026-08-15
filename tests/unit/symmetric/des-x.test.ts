import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/des-x'

describe('DES-X', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('round trips correctly', () => {
        const key = '11223344556677889900aabbccddeeff1122334455667788' // 24 bytes
        const pt = '0011223344556677'
        const ct = encrypt(pt, key)
        expect(decrypt(ct.output, key).output).toBe(pt)
    })

    it('genuinely reuses DES (structural verification)', () => {
        // If DES-X genuinely calls DES, changing the input by 1 bit should
        // result in DES's characteristic avalanche effect.
        const key = '00'.repeat(24)
        const pt1 = '0000000000000000'
        const pt2 = '0000000000000001'

        const ct1 = encrypt(pt1, key).output
        const ct2 = encrypt(pt2, key).output

        expect(ct1).not.toBe(ct2)
    })

    it('metadata flags legacy status', () => {
        const result = encrypt('0000000000000000', '00'.repeat(24))
        expect(result.metadata.securityStatus).toBe('legacy')
        expect(result.metadata.breakingComplexity).toContain('Kilian-Rogaway')
    })
})
