import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/hash/has160'
import { CipherError } from '@/lib/utils/errors'

describe('HAS-160', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('produces 160-bit output', () => {
        const result = encrypt('')
        expect(result.output).toHaveLength(40) // 160 bits = 40 hex chars
    })

    it('is deterministic: same input produces same digest', () => {
        const input = '616263'
        const res1 = encrypt(input, '')
        const res2 = encrypt(input, '')
        expect(res1.output).toBe(res2.output)
    })

    it('avalanche: distinct inputs yield different digests', () => {
        const res1 = encrypt('61', '')
        const res2 = encrypt('62', '')
        expect(res1.output).not.toBe(res2.output)
    })

    it('supports instrumented step generation', () => {
        const result = encrypt('616263', '', { instrument: true })
        expect(result.steps.length).toBeGreaterThan(0)
    })

    it('decrypt throws ALGORITHM_UNSUPPORTED', () => {
        expect(() => decrypt('1234', '')).toThrow(CipherError)
        expect(() => decrypt('1234', '')).toThrow(/HAS-160 is a hash function/)
    })

    it('metadata flags legacy status', () => {
        const result = encrypt('')
        expect(result.metadata.securityStatus).toBe('legacy')
        expect(result.metadata.name).toBe('HAS-160')
        expect(result.metadata.yearDesigned).toBe(1998)
    })
})
