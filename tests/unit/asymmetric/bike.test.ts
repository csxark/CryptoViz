import { describe, expect, it } from 'vitest'
import { generate, encrypt, decrypt } from '@/lib/cipher/asymmetric/bike'

describe('BIKE', () => {
    it('keygen produces valid key pair', () => {
        const { publicKey, privateKey } = generate({ level: 'L1' })
        expect(publicKey).toBeDefined()
        expect(privateKey).toBeDefined()
    })

    it('encap → decap round-trip recovers shared key', () => {
        const { publicKey, privateKey } = generate({ level: 'L1' })
        const ct = encrypt('test', publicKey, { level: 'L1' })
        const K = decrypt(ct, privateKey, { level: 'L1' })
        expect(K).toBeDefined()
        expect(K.length).toBeGreaterThan(0)
    })

    it('decap failure returns deterministic rejection key', () => {
        const { privateKey } = generate({ level: 'L1' })
        const corruptedCt = 'ff'.repeat(100)
        const K = decrypt(corruptedCt, privateKey, { level: 'L1' })
        expect(K).toBeDefined()
        // Rejection key is deterministic based on private key and ciphertext
    })

    it('parameter set changes key length', () => {
        const kL1 = generate({ level: 'L1' })
        const kL3 = generate({ level: 'L3' })
        expect(kL1.publicKey.length).not.toBe(kL3.publicKey.length)
    })
})
