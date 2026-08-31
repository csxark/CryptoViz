import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/hash/panama'
import { CipherError } from '@/lib/utils/errors'

describe('Panama', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('produces 256-bit output', () => {
        const result = encrypt('', '')
        expect(result.output).toHaveLength(64) // 256 bits = 64 hex chars
    })

    it('is deterministic: repeated executions yield identical digest', () => {
        const input = '68656c6c6f20776f726c64'
        const res1 = encrypt(input, '')
        const res2 = encrypt(input, '')
        expect(res1.output).toBe(res2.output)
    })

    it('avalanche: distinct inputs yield different digests', () => {
        const resA = encrypt('00', '')
        const resB = encrypt('01', '')
        expect(resA.output).not.toBe(resB.output)
    })

    it('supports instrumented mode', () => {
        const result = encrypt('000102030405060708', '', { instrument: true })
        expect(result.steps.length).toBeGreaterThan(0)
    })

    it('decrypt throws ALGORITHM_UNSUPPORTED', () => {
        expect(() => decrypt('abcd', '')).toThrow(CipherError)
        expect(() => decrypt('abcd', '')).toThrow(/Panama.*cannot be decrypted/)
    })

    it('metadata flags legacy status', () => {
        const result = encrypt('', '')
        expect(result.metadata.securityStatus).toBe('legacy')
        expect(result.metadata.name).toBe('Panama')
        expect(result.metadata.yearDesigned).toBe(1998)
    })
})
