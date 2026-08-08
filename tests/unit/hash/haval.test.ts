import { describe, expect, it } from 'vitest'
import { encrypt, TEST_VECTORS } from '@/lib/cipher/hash/haval'

describe('HAVAL', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('supports configurable passes and output length', () => {
        const result128 = encrypt('', '', { passes: 3, outputBits: 128 })
        const result256 = encrypt('', '', { passes: 5, outputBits: 256 })
        expect(result128.output).toHaveLength(32) // 128 bits = 32 hex
        expect(result256.output).toHaveLength(64) // 256 bits = 64 hex
    })

    it('metadata flags configuration-dependent security', () => {
        const result = encrypt('', '')
        expect(result.metadata.securityStatus).toBe('legacy')
        expect(result.metadata.breakingComplexity).toContain('Configuration-dependent')
    })
})
