import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, homomorphicAdd, TEST_VECTORS } from '@/lib/cipher/asymmetric/okamoto-uchiyama'

describe('Okamoto-Uchiyama', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('encrypt/decrypt round-trip recovers message', () => {
        const pt = '05'  // Small message < p=101
        const ct = encrypt(pt, 'mock')
        const recovered = decrypt(ct.output, 'p_only')
        expect(recovered.output).toBe(pt)
    })

    it('decryption uses ONLY p (never references q)', () => {
        const pt = '0a'
        const ct = encrypt(pt, 'mock')
        const recovered = decrypt(ct.output, 'p_only')
        expect(recovered.output).toBe(pt)
    })

    it('additive homomorphism: E(m1) · E(m2) = E(m1 + m2)', () => {
        const m1 = '03'
        const m2 = '04'
        const c1 = encrypt(m1, 'mock')
        const c2 = encrypt(m2, 'mock')

        // Combine ciphertexts via multiplication mod n
        const cCombined = homomorphicAdd(c1.output, c2.output)

        // Decrypt combined — should equal m1 + m2 = 7
        const mCombined = decrypt(cCombined, 'p_only')
        expect(parseInt(mCombined.output, 16)).toBe(7)
    })

    it('probabilistic encryption: same message, different randomness', () => {
        const pt = '05'
        const c1 = encrypt(pt, 'mock')
        const c2 = encrypt(pt, 'mock')
        expect(c1.output).not.toBe(c2.output)
        expect(decrypt(c1.output, 'p_only').output).toBe(pt)
        expect(decrypt(c2.output, 'p_only').output).toBe(pt)
    })

    it('deterministic mode with explicit r option', () => {
        const pt = '05'
        const c = encrypt(pt, 'mock', { r: 42 })
        expect(c.output).toBe('00000000000c9910')
        expect(decrypt(c.output, 'p_only').output).toBe(pt)
    })

    it('metadata flags secure status', () => {
        const result = encrypt('05', 'mock')
        expect(result.metadata.securityStatus).toBe('secure')
        expect(result.metadata.name).toBe('Okamoto-Uchiyama')
    })

    it('asserts round-trip decrypt(encrypt(m)) === m across multiple message inputs', () => {
        const messages = ['01', '05', '0a', '20', '50']
        for (const msg of messages) {
            const encrypted = encrypt(msg, 'mock')
            const decrypted = decrypt(encrypted.output, 'p_only')
            expect(decrypted.output).toBe(msg)
        }
    })
})
