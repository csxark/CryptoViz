import { describe, expect, it } from 'vitest'
import { encrypt, TEST_VECTORS } from '@/lib/cipher/hash/ripemd128'

describe('RIPEMD-128', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('matches official empty string vector', () => {
        const result = encrypt('','')
        expect(result.output).toBe('cdf26213a150dc3ecb610f18f6b38b46')
    })

    it('matches official "abc" vector', () => {
        const result = encrypt('616263','') // "abc" in hex
        expect(result.output).toBe('c14a12199c66e4ba84636b0f69144c77')
    })

    it('metadata flags legacy status', () => {
        const result = encrypt('','')
        expect(result.metadata.securityStatus).toBe('legacy')
    })
})
