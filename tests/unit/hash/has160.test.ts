/* eslint-disable */
// @ts-nocheck
import { describe, expect, it } from 'vitest'
import { encrypt, TEST_VECTORS } from '@/lib/cipher/hash/has160'

describe('HAS-160', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('produces 160-bit output', () => {
        const result = encrypt('')
        expect(result.output).toHaveLength(40) // 160 bits = 40 hex chars
    })

    it('metadata flags legacy status', () => {
        const result = encrypt('')
        expect(result.metadata.securityStatus).toBe('legacy')
    })
})
