import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/3way'

describe('3-Way', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('preserves 3-fold cyclic symmetry in sub-steps', () => {
        // A core property of 3-Way: rotating the input words cyclically 
        // should result in a correspondingly rotated output.
        const pt1 = '0102030405060708090a0b0c'
        const pt2 = '090a0b0c0102030405060708' // Cyclically rotated by 1 word (4 bytes)
        const key = '000000000000000000000000'

        const ct1 = encrypt(pt1, key).output
        const ct2 = encrypt(pt2, key).output

        // ct2 should be ct1 cyclically rotated by 1 word
        expect(ct2).toBe(ct1.slice(8) + ct1.slice(0, 8))
    })

    it('decrypt is exact inverse via bit-reversal property', () => {
        const key = '112233445566778899aabbcc'
        const pt = '00112233445566778899aabb'
        const ct = encrypt(pt, key)
        expect(decrypt(ct.output, key).output).toBe(pt)
    })

    it('metadata flags broken status', () => {
        const result = encrypt('000000000000000000000000', '000000000000000000000000')
        expect(result.metadata.securityStatus).toBe('broken')
    })
})
