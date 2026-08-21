import { describe, expect, it } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/cast128'

describe('CAST-128', () => {
    it('round trips 128-bit key (16 rounds)', () => {
        const pt = '0123456789abcdef'
        const key = '0123456789abcdef0123456789abcdef'
        expect(decrypt(encrypt(pt, key).output, key).output).toBe(pt)
    })

    it('round trips 80-bit key (12 rounds)', () => {
        const pt = '0123456789abcdef'
        const key = '0123456789abcdef0123' // 10 bytes
        expect(decrypt(encrypt(pt, key).output, key).output).toBe(pt)
    })

    it('rejects invalid key length', () => {
        expect(() => encrypt('0000000000000000', '0123')).toThrow('INVALID_KEY_LENGTH')
    })
})
