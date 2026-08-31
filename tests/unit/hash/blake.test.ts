import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/hash/blake'
import { CipherError } from '@/lib/utils/errors'

describe('BLAKE', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('produces 256-bit output', () => {
        const result = encrypt('', '')
        expect(result.output).toHaveLength(64) // 256 bits = 64 hex chars
    })

    it('is deterministic: same message produces same digest', () => {
        const input = '616263'
        const res1 = encrypt(input, '')
        const res2 = encrypt(input, '')
        expect(res1.output).toBe(res2.output)
    })

    it('avalanche: distinct inputs yield different outputs', () => {
        const res1 = encrypt('61', '')
        const res2 = encrypt('62', '')
        expect(res1.output).not.toBe(res2.output)
    })

    it('supports instrumented mode', () => {
        const result = encrypt('616263', '', { instrument: true })
        expect(result.steps.length).toBeGreaterThan(0)
    })

    it('decrypt throws ALGORITHM_UNSUPPORTED', () => {
        expect(() => decrypt('1234', '')).toThrow(CipherError)
        expect(() => decrypt('1234', '')).toThrow(/BLAKE is a hash function/)
    })

    it('metadata is populated', () => {
        const result = encrypt('', '')
        expect(result.metadata.name).toBe('BLAKE')
        expect(result.metadata.securityStatus).toBe('secure')
        expect(result.metadata.yearDesigned).toBe(2008)
    })
})
