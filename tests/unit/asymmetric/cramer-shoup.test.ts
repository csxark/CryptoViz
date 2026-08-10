import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/asymmetric/cramer-shoup'
import { CipherError } from '@/lib/utils'

describe('Cramer-Shoup', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('round trips successfully', () => {
        const pt = '0000000000000001'
        const ct = encrypt(pt, 'mock_keys')
        expect(decrypt(ct.output, 'mock_keys').output).toBe(pt)
    })

    // CRITICAL TEST: Tampered ciphertext rejection
    it('rejects tampered ciphertext (CCA2 integrity check)', () => {
        const pt = '0000000000000001'
        const ct = encrypt(pt, 'mock_keys')

        // Flip a bit in u1 (first 16 hex chars)
        const tamperedCt = '1' + ct.output.slice(1)

        expect(() => decrypt(tamperedCt, 'mock_keys')).toThrow(CipherError)
        expect(() => decrypt(tamperedCt, 'mock_keys')).toThrow(/INTEGRITY_CHECK_FAILED/)
    })

    it('metadata is populated', () => {
        const result = encrypt('0000000000000001', 'mock_keys')
        expect(result.metadata.name).toBe('Cramer-Shoup')
        expect(result.metadata.securityStatus).toBe('secure')
    })
})
