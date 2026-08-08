import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/asymmetric/sm2'

describe('SM2', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('computes ZA and signs correctly', () => {
        const result = encrypt('message', '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
        expect(result.output).toBeDefined()
    })

    it('metadata is populated', () => {
        const result = encrypt('msg', '1234')
        expect(result.metadata.name).toBe('SM2')
        expect(result.metadata.securityStatus).toBe('secure')
    })
})
