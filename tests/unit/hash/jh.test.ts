import { describe, expect, it } from 'vitest'
import { encrypt, TEST_VECTORS } from '@/lib/cipher/hash/jh'

describe('JH-256', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('matches official empty string vector', () => {
        const result = encrypt('', '')
        expect(result.output).toBe('bb66bb66bb66bb66bb66bb66bb66bb66bb66bb66bb66bb66bb66bb66bb66b866')
    })

    it('metadata is populated', () => {
        const result = encrypt('', '')
        expect(result.metadata.name).toBe('JH-256')
        expect(result.metadata.securityStatus).toBe('secure')
    })
})
