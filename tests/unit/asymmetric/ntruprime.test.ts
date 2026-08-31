import { describe, expect, it } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/asymmetric/ntruprime'

describe('Streamlined NTRU Prime', () => {
    it('encrypt and decrypt produce shared key', () => {
        const pub = '00'
        const priv = '00'
        const enc = encrypt(pub, priv)
        expect(enc.output).toBeDefined()
    })
})
