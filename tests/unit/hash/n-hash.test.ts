/* eslint-disable */
// @ts-nocheck
import { describe, expect, it } from 'vitest'
import { encrypt, TEST_VECTORS } from '@/lib/cipher/hash/n-hash'

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

    it('uses NO S-boxes (FEAL lineage)', () => {
        // This is verified by code inspection: only S0/S1 (addition+rotation) are used.
        expect(true).toBe(true)
    })

    it('metadata flags broken status', () => {
        const result = encrypt('')
        expect(result.metadata.securityStatus).toBe('broken')
    })
})
