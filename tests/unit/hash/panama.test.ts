import { describe, expect, it } from 'vitest'
import { encrypt, TEST_VECTORS } from '@/lib/cipher/hash/panama'

describe('Panama', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('produces 256-bit output', () => {
        const result = encrypt('', '')
        expect(result.output).toHaveLength(64) // 256 bits = 64 hex chars
    })

    it('metadata flags legacy status', () => {
        const result = encrypt('', '')
        expect(result.metadata.securityStatus).toBe('legacy')
    })
})
