import { describe, expect, it } from 'vitest'
import { generate, sign, verify } from '@/lib/cipher/asymmetric/sphincs-plus'

describe('SPHINCS+', () => {
    it('keygen produces valid key pair', () => {
        const { publicKey, privateKey } = generate({ paramSet: '128s' })
        expect(publicKey).toBeDefined()
        expect(privateKey).toBeDefined()
        expect(publicKey.length).toBeGreaterThan(0)
        expect(privateKey.length).toBeGreaterThan(0)
    })

    it('sign → verify round-trip succeeds', () => {
        const { publicKey, privateKey } = generate({ paramSet: '128s' })
        const message = 'Hello, post-quantum world!'
        const signature = sign(message, privateKey, { paramSet: '128s' })
        expect(verify(message, publicKey, signature, { paramSet: '128s' })).toBe(true)
    })

    it('verify returns false on tampered message', () => {
        const { publicKey, privateKey } = generate({ paramSet: '128s' })
        const message = 'Hello'
        const signature = sign(message, privateKey, { paramSet: '128s' })
        expect(verify('Tampered', publicKey, signature, { paramSet: '128s' })).toBe(false)
    })

    it('verify returns false on random signature', () => {
        const { publicKey } = generate({ paramSet: '128s' })
        const randomSig = '00'.repeat(100)
        expect(verify('test', publicKey, randomSig, { paramSet: '128s' })).toBe(false)
    })

    it('parameter set changes key size', () => {
        const k128 = generate({ paramSet: '128s' })
        const k256 = generate({ paramSet: '256f' })
        expect(k128.publicKey.length).not.toBe(k256.publicKey.length)
    })
})
