import { describe, expect, it } from 'vitest'
import { generate, encrypt, decrypt } from '@/lib/cipher/asymmetric/opaque'

describe('OPAQUE', () => {
    it('generates server keys', () => {
        const keys = generate()
        expect(keys.serverPublicKey).toHaveLength(64)
        expect(keys.oprfKey).toHaveLength(64)
    })

    it('full flow produces session key', () => {
        const keys = generate()
        const sessionKey = encrypt('password123', keys.serverPublicKey)
        expect(sessionKey.output).toHaveLength(64)
    })

    it('different passwords produce different session keys', () => {
        const keys = generate()
        const k1 = encrypt('password1', keys.serverPublicKey)
        const k2 = encrypt('password2', keys.serverPublicKey)
        expect(k1.output).not.toBe(k2.output)
    })

    it('empty password does not panic', () => {
        const keys = generate()
        expect(() => encrypt('', keys.serverPublicKey)).not.toThrow()
    })
})
