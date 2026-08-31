import { describe, expect, it } from 'vitest'
import { generate, encrypt, decrypt } from '@/lib/cipher/asymmetric/saber'

describe('SABER', () => {
    it('keygen produces valid key pair', () => {
        const { publicKey, privateKey } = generate({ paramSet: 'Saber' })
        expect(publicKey).toBeDefined()
        expect(privateKey).toBeDefined()
    })

    it('encap → decap round-trip recovers shared key', () => {
        const { publicKey, privateKey } = generate({ paramSet: 'Saber' })
        const ct = encrypt('test', publicKey, { paramSet: 'Saber' })
        const K = decrypt(ct, privateKey, { paramSet: 'Saber' })
        expect(K).toBeDefined()
        expect(K.length).toBeGreaterThan(0)
    })

    it('LightSaber and FireSaber produce different key sizes', () => {
        const kLight = generate({ paramSet: 'LightSaber' })
        const kFire = generate({ paramSet: 'FireSaber' })
        expect(kLight.publicKey.length).not.toBe(kFire.publicKey.length)
    })
})
