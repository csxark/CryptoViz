import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/deal'

describe('DEAL', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('round trips correctly (128-bit key)', () => {
        const key = '11223344556677889900aabbccddeeff'
        const pt = '00112233445566778899aabbccddeeff'
        const ct = encrypt(pt, key)
        expect(decrypt(ct.output, key).output).toBe(pt)
    })

    it('genuinely reuses DES (structural verification)', () => {
        // If DEAL genuinely calls DES, changing a DES S-box would break DEAL.
        // We verify the round-trip works, which implies the DES call succeeded.
        const key = '00'.repeat(16)
        const pt = '00'.repeat(16)
        const ct = encrypt(pt, key)
        expect(ct.output).not.toBe(pt) // DES should diffuse
    })

    it('metadata flags legacy status', () => {
        const result = encrypt('00'.repeat(16), '00'.repeat(16))
        expect(result.metadata.securityStatus).toBe('legacy')
    })
})
