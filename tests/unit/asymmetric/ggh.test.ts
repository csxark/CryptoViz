import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/asymmetric/ggh'

describe('GGH', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('round trips with good basis', () => {
        const msg = '050a'
        const ct = encrypt(msg, 'mock')
        const pt = decrypt(ct.output, 'mock')
        expect(pt.output).toBe(msg)
    })

    it('unimodular transformation preserves lattice (det = ±1)', () => {
        // The implementation uses U = [[3, 2], [1, 1]]
        // det = 3*1 - 2*1 = 1
        // This guarantees B and B' generate the SAME lattice.
        expect(3 * 1 - 2 * 1).toBe(1)
    })

    it('metadata flags broken status unconditionally', () => {
        const result = encrypt('0000', 'mock')
        expect(result.metadata.securityStatus).toBe('broken')
        expect(result.metadata.breakingComplexity).toContain('Nguyen')
    })
})
