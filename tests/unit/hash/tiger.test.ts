import { describe, expect, it } from 'vitest'
import { encrypt, TEST_VECTORS } from '@/lib/cipher/hash/tiger'

describe('Tiger', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('matches official empty string vector', () => {
        const result = encrypt('', '')
        expect(result.output).toBe('ab112aaefdc4f8b975e3b2838e438649a1f3b5a5fca57a16')
    })

    it('metadata is populated', () => {
        const result = encrypt('', '')
        expect(result.metadata.name).toBe('Tiger')
        expect(result.metadata.securityStatus).toBe('secure')
    })
})
