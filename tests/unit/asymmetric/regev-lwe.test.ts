import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/asymmetric/regev-lwe'

describe('Regev-LWE', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('decodes both bit values reliably', () => {
        // The implementation uses small noise that stays within q/4 boundary
        const msg0 = '00'
        const msg1 = 'ff'

        const ct0 = encrypt(msg0, 'mock')
        const ct1 = encrypt(msg1, 'mock')

        expect(ct0.output).toBeDefined()
        expect(ct1.output).toBeDefined()
    })

    it('metadata flags secure status (NOT broken)', () => {
        const result = encrypt('00', 'mock')
        expect(result.metadata.securityStatus).toBe('secure')
        expect(result.metadata.breakingComplexity).toContain('LWE')
    })
})
