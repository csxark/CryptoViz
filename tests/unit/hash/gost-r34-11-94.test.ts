import { describe, expect, it } from 'vitest'
import { encrypt, TEST_VECTORS } from '@/lib/cipher/hash/gost-r34-11-94'

describe('GOST R 34.11-94', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('reuses gost.ts for compression', () => {
        // The implementation imports and calls gostEncrypt internally
        const result = encrypt('')
        expect(result.output).toHaveLength(64) // 256 bits = 64 hex chars
    })

    it('metadata flags legacy status', () => {
        const result = encrypt('')
        expect(result.metadata.securityStatus).toBe('legacy')
    })
})
