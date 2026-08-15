import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/zuc'

describe('ZUC', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('round trips correctly', () => {
        const key = '3d4c4be96a82fdaeb58f641db17b455b'
        const iv = '84319aa8de6915ca1f6bda6bfbde8be3'
        const pt = '00000000'
        const ct = encrypt(pt, key, { iv })
        expect(decrypt(ct.output, key, { iv }).output).toBe(pt)
    })

    it('metadata is populated', () => {
        const result = encrypt('00000000', '00'.repeat(16), { iv: '00'.repeat(16) })
        expect(result.metadata.name).toBe('ZUC')
        expect(result.metadata.securityStatus).toBe('secure')
    })
})
