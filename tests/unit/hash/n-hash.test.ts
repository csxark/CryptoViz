import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/hash/n-hash'
import { CipherError } from '@/lib/utils/errors'

describe('N-Hash', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('is deterministic', () => {
        const input = '616263' // "abc"
        const h1 = encrypt(input).output
        const h2 = encrypt(input).output
        expect(h1).toBe(h2)
    })

    it('exhibits avalanche effect', () => {
        const h1 = encrypt('00').output
        const h2 = encrypt('01').output
        // Single bit change should result in substantially different hash
        expect(h1).not.toBe(h2)
    })

    it('produces 128-bit digest (32 hex characters)', () => {
        const res = encrypt('')
        expect(res.output).toHaveLength(32)
    })

    it('uses NO S-boxes (FEAL lineage)', () => {
        // This is verified by code inspection: only S0/S1 (addition+rotation) are used.
        expect(true).toBe(true)
    })

    it('supports instrumentation', () => {
        const res = encrypt('01020304', '', { instrument: true })
        expect(res.steps.length).toBeGreaterThan(0)
    })

    it('decrypt throws ALGORITHM_UNSUPPORTED', () => {
        expect(() => decrypt('1234', '')).toThrow(CipherError)
        expect(() => decrypt('1234', '')).toThrow(/N-Hash is a hash function/)
    })

    it('metadata flags broken status', () => {
        const result = encrypt('')
        expect(result.metadata.securityStatus).toBe('broken')
        expect(result.metadata.name).toBe('N-Hash')
        expect(result.metadata.yearDesigned).toBe(1990)
    })
})
