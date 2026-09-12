import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/feal'

describe('FEAL-8', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('passes canonical test vector', () => {
        const result = encrypt('0000000000000000', '0000000000000000')
        expect(result.output).toBe('c1f5bb7a89a83861')
    })

    it('round trips encryption and decryption', () => {
        const pt = '0123456789abcdef'
        const key = 'fedcba9876543210'
        const ct = encrypt(pt, key)
        expect(decrypt(ct.output, key).output).toBe(pt)
    })

    it('metadata flags broken status', () => {
        const result = encrypt('0000000000000000', '0000000000000000')
        expect(result.metadata.securityStatus).toBe('broken')
        expect(result.metadata.breakingComplexity).toContain('differential')
    })
})
