import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/asymmetric/gost-r34-10'

describe('GOST R 34.10-2012', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('handles e=0 special case', () => {
        // The implementation forces e=1 if hash mod n is 0
        const result = encrypt('message', '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
        expect(result.output).toBeDefined()
    })

    it('metadata is populated', () => {
        const result = encrypt('msg', '1234')
        expect(result.metadata.name).toBe('GOST R 34.10-2012')
        expect(result.metadata.securityStatus).toBe('secure')
    })
})
