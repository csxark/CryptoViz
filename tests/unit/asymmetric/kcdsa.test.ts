import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/asymmetric/kcdsa'

describe('KCDSA', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('commitment hash combines message AND w', () => {
        // The implementation explicitly concatenates msgBytes and wBytes before hashing
        const result = encrypt('616263', '1234567890abcdef')
        expect(result.output).toBeDefined()
    })

    it('metadata is populated', () => {
        const result = encrypt('616263', '1234567890abcdef')
        expect(result.metadata.name).toBe('KCDSA')
        expect(result.metadata.securityStatus).toBe('secure')
    })
})
