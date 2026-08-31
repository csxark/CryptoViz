import { describe, expect, it } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/aegis128l'

describe('AEGIS-128L', () => {
    it('round trips with 128-bit tag', () => {
        const pt = '48656c6c6f' // "Hello"
        const key = '00'.repeat(32) // 16-byte key + 16-byte nonce
        const ct = encrypt(pt, key, { tagLen: 16 })
        expect(decrypt(ct.output, key, { tagLen: 16 }).output).toBe(pt)
    })

    it('round trips with 256-bit tag', () => {
        const pt = '48656c6c6f'
        const key = '00'.repeat(32)
        const ct = encrypt(pt, key, { tagLen: 32 })
        expect(decrypt(ct.output, key, { tagLen: 32 }).output).toBe(pt)
    })

    it('throws on corrupted tag', () => {
        const pt = '48656c6c6f'
        const key = '00'.repeat(32)
        const ct = encrypt(pt, key, { tagLen: 16 })
        const corrupted = ct.output.slice(0, -2) + 'ff'
        expect(() => decrypt(corrupted, key, { tagLen: 16 })).toThrow('AUTH_TAG_MISMATCH')
    })

    it('rejects invalid key length', () => {
        expect(() => encrypt('00', '00'.repeat(16))).toThrow('INVALID_KEY_LENGTH')
    })
})
