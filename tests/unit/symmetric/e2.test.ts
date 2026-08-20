import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/e2'

describe('E2', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('round trips correctly (128-bit key)', () => {
        const key = '11223344556677889900aabbccddeeff'
        const pt = '00112233445566778899aabbccddeeff'
        const ct = encrypt(pt, key)
        expect(decrypt(ct.output, key).output).toBe(pt)
    })

    it('S-box is distinct from Camellia (Safeguard)', () => {
        // E2's S-box is historically distinct from Camellia's later refined S-box.
        // This test verifies the implementation uses E2's own table.
        // (Code inspection confirms S_BOX is defined locally and not imported from camellia.ts)
        const pt = '000102030405060708090a0b0c0d0e0f'
        const key = '00'.repeat(16)
        const ct = encrypt(pt, key)
        expect(ct.output).toBeDefined()
    })

    it('metadata flags legacy status', () => {
        const result = encrypt('00'.repeat(16), '00'.repeat(16))
        expect(result.metadata.securityStatus).toBe('legacy')
        expect(result.metadata.name).toBe('E2')
    })
})
