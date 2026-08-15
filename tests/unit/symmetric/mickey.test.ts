import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/mickey'

describe('MICKEY', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('round trips correctly', () => {
        const key = '11223344556677889900aabbccddeeff'
        const iv = '00112233445566778899aabbccddeeff'
        const pt = '48656c6c6f'
        const ct = encrypt(pt, key, { iv })
        expect(decrypt(ct.output, key, { iv }).output).toBe(pt)
    })

    it('metadata is populated', () => {
        const result = encrypt('00', '00'.repeat(16), { iv: '00'.repeat(16) })
        expect(result.metadata.name).toBe('MICKEY')
        expect(result.metadata.securityStatus).toBe('secure')
    })
})
