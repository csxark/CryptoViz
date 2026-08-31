import { describe, expect, it } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/tinyjambu'

describe('TinyJAMBU', () => {
    it('round trips', () => {
        const pt = '48656c6c6f'
        const key = '00'.repeat(28)
        const ct = encrypt(pt, key)
        expect(decrypt(ct.output, key).output).toBe(pt)
    })

    it('throws on corrupted tag', () => {
        const pt = '48656c6c6f'
        const key = '00'.repeat(28)
        const ct = encrypt(pt, key)
        const corrupted = ct.output.slice(0, -2) + 'ff'
        expect(() => decrypt(corrupted, key)).toThrow('AUTH_TAG_MISMATCH')
    })

    it('rejects invalid key length', () => {
        expect(() => encrypt('00', '00'.repeat(16))).toThrow('INVALID_KEY_LENGTH')
    })
})
