import { describe, expect, it } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/saturnin'

describe('SATURNIN', () => {
    it('round trips', () => {
        const pt = '00'.repeat(32)
        const key = '00'.repeat(64)
        const ct = encrypt(pt, key)
        expect(decrypt(ct.output, key).output).toBe(pt)
    })

    it('rejects invalid key length', () => {
        expect(() => encrypt('00', '00'.repeat(32))).toThrow('INVALID_KEY_LENGTH')
    })
})
