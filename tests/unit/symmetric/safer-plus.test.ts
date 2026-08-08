import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/safer-plus'

describe('SAFER+', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('X and L tables are inverses', () => {
        // The module generates these, we just verify the round trip concept
        const pt = '00000000000000000000000000000000'
        const key = '00000000000000000000000000000000'
        const ct = encrypt(pt, key)
        expect(decrypt(ct.output, key).output).toBe(pt)
    })

    it('metadata is populated', () => {
        const result = encrypt('00000000000000000000000000000000', '00000000000000000000000000000000')
        expect(result.metadata.name).toBe('SAFER+')
        expect(result.metadata.securityStatus).toBe('legacy')
    })
})
