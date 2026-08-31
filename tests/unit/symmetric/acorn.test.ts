import { describe, expect, it } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/acorn'

describe('ACORN v3', () => {
    it('round trips', () => {
        const pt = '48656c6c6f'
        const key = '00'.repeat(32)
        const ct = encrypt(pt, key)
        expect(decrypt(ct.output, key).output).toBe(pt)
    })

    it('throws on corrupted tag', () => {
        const pt = '48656c6c6f'
        const key = '00'.repeat(32)
        const ct = encrypt(pt, key)
        const corrupted = ct.output.slice(0, -2) + 'ff'
        expect(() => decrypt(corrupted, key)).toThrow('AUTH_TAG_MISMATCH')
    })
})
