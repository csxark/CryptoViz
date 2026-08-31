import { describe, expect, it } from 'vitest'
import { generate, encrypt, decrypt } from '@/lib/cipher/asymmetric/blind-rsa'

describe('Blind RSA', () => {
    it('generates server keys', () => {
        const keys = generate()
        expect(keys.publicKey).toBeDefined()
        expect(keys.privateKey).toBeDefined()
    })

    it('full protocol simulation', () => {
        const keys = generate()
        const msg = 'test message'

        // Client blind
        const blindResult = encrypt(msg, keys.publicKey)
        const blindData = JSON.parse(blindResult.output)

        // Server sign (mocked: server just returns blinded_msg^d mod n)
        const pk = JSON.parse(keys.publicKey)
        const sk = JSON.parse(keys.privateKey)
        const n = BigInt('0x' + pk.n)
        const d = BigInt(sk.d)
        const blinded_msg = BigInt('0x' + blindData.blindedMessage)

        // blind_sig = blinded_msg^d mod n
        let blind_sig = 1n
        let base = blinded_msg % n
        let exp = d
        while (exp > 0n) {
            if (exp & 1n) blind_sig = (blind_sig * base) % n
            base = (base * base) % n
            exp >>= 1n
        }

        // Client unblind
        const unblindResult = decrypt(blind_sig.toString(16), blindData.blindingFactor, msg, keys.publicKey)
        expect(unblindResult.output).toBeDefined()
    })

    it('unlinkability: same message blinded twice produces different blinded_msg', () => {
        const keys = generate()
        const msg = 'test message'
        const b1 = encrypt(msg, keys.publicKey)
        const b2 = encrypt(msg, keys.publicKey)
        expect(b1.output).not.toBe(b2.output)
    })
})
