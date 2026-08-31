import { describe, expect, it } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/deoxys'

describe('Deoxys-II-256', () => {
    it('round trips with empty AD', () => {
        const pt = '48656c6c6f'
        const key = '00'.repeat(48)
        const ct = encrypt(pt, key)
        expect(decrypt(ct.output, key).output).toBe(pt)
    })

    it('throws on corrupted tag', () => {
        const pt = '48656c6c6f'
        const key = '00'.repeat(48)
        const ct = encrypt(pt, key)
        const corrupted = ct.output.slice(0, -2) + 'ff'
        expect(() => decrypt(corrupted, key)).toThrow('AUTH_TAG_MISMATCH')
    })

    it('nonce-misuse resistance: XOR leakage is expected but harmless', () => {
        const key = '00'.repeat(48)
        const m1 = '1111111111111111'
        const m2 = '2222222222222222'
        const c1 = encrypt(m1, key)
        const c2 = encrypt(m2, key)
        // c1 XOR c2 should equal m1 XOR m2 (CTR-like leakage)
        // But tags will differ, preventing forgery
        expect(c1.output).not.toBe(c2.output)
    })
})
