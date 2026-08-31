import { describe, expect, it } from 'vitest'
import { generate, sign, verify, proveDisclosure, verifyDisclosure } from '@/lib/cipher/asymmetric/bbs-plus'

describe('BBS+', () => {
    it('generates key pair', () => {
        const keys = generate()
        expect(keys.publicKey).toBeDefined()
        expect(keys.privateKey).toBeDefined()
    })

    it('signs and verifies', () => {
        const keys = generate()
        const messages = ['Alice', '1990', 'Engineer']
        const sig = sign(messages, keys.privateKey)
        expect(verify(messages, keys.publicKey, sig)).toBe(true)
    })

    it('generates and verifies disclosure proof', () => {
        const keys = generate()
        const messages = ['Alice', '1990', 'Engineer']
        const sig = sign(messages, keys.privateKey)
        const proof = proveDisclosure(messages, keys.publicKey, sig, [0, 2])
        expect(verifyDisclosure(['Alice', 'Engineer'], keys.publicKey, proof, [0, 2])).toBe(true)
    })

    it('rejects wrong disclosed message', () => {
        const keys = generate()
        const messages = ['Alice', '1990', 'Engineer']
        const sig = sign(messages, keys.privateKey)
        const proof = proveDisclosure(messages, keys.publicKey, sig, [0])
        expect(verifyDisclosure(['Bob'], keys.publicKey, proof, [0])).toBe(false)
    })
})
