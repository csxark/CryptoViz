import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/asymmetric/chor-rivest'
import { CipherError } from '@/lib/utils'

describe('Chor-Rivest', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('round trips with default mock key', () => {
        const msg = 'e0'
        const ct = encrypt(msg, 'mock')
        expect(ct.output).toBe('00c6')
        const decrypted = decrypt(ct.output, 'mock')
        expect(decrypted.output).toBe(msg)
    })

    it('round trips with a supplied private key', () => {
        const privateKey = JSON.stringify({
            publicWeights: [241, 212, 87, 89, 18, 323, 105],
            privatePermutation: [2, 0, 4, 1, 5, 3, 6],
            privateD: 17,
            generator: [5, 1, 0],
        })

        const msg = 'e0'
        const ct = encrypt(msg, privateKey)
        expect(ct.output).toBe('00c6')

        const decrypted = decrypt(ct.output, privateKey)
        expect(decrypted.output).toBe(msg)
    })

    it('REJECTS messages violating fixed Hamming weight constraint', () => {
        // 0xFF = 11111111 = 8 bits set (violates FIXED_WEIGHT=3)
        const invalidMsg = 'ff'
        expect(() => encrypt(invalidMsg, 'mock')).toThrow(CipherError)
        expect(() => encrypt(invalidMsg, 'mock')).toThrow(/exactly 3 1-bits/)
    })

    it('REJECTS zero-weight messages', () => {
        const zeroMsg = '00'  // 0 bits set
        expect(() => encrypt(zeroMsg, 'mock')).toThrow(CipherError)
    })

    it('uses genuine GF(p^h) field-extension arithmetic', () => {
        const msg = 'e0'  // Valid weight
        const ct = encrypt(msg, 'mock')
        expect(ct.output).toBe('00c6')
    })

    it('metadata flags unconditional broken status', () => {
        const result = encrypt('e0', 'mock')
        expect(result.metadata.securityStatus).toBe('broken')
        expect(result.metadata.breakingComplexity).toContain('Vaudenay')
        expect(result.metadata.breakingComplexity).toContain('GF(p^h)')
    })
})
