import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/asymmetric/boneh-franklin-ibe'

describe('Boneh-Franklin IBE', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('round trips with correct identity', () => {
        // Setup: PKG master secret s = 5, P = 1. P_pub = 5.
        const s = 5n
        const P_pub = 5n

        const identity = 'alice@example.com'

        // Extract: d_ID = s * Q_ID
        let Q_ID = 0n
        for (let i = 0; i < identity.length; i++) Q_ID = (Q_ID * 31n + BigInt(identity.charCodeAt(i))) % (0xFFFFFFFFFFFFFFC4n)
        if (Q_ID === 0n) Q_ID = 1n
        const d_ID = (s * Q_ID) % (0xFFFFFFFFFFFFFFC4n)

        const msg = '68656c6c6f' // "hello"
        const ct = encrypt(msg, `${P_pub.toString(16)},${identity}`)
        const pt = decrypt(ct.output, d_ID.toString(16).padStart(16, '0'))

        expect(pt.output).toBe(msg)
    })

    // CRITICAL TEST: Wrong identity cannot decrypt
    it('fails to decrypt with wrong identity private key', () => {
        const s = 5n
        const P_pub = 5n
        const identity_alice = 'alice@example.com'
        const identity_bob = 'bob@example.com'

        let Q_alice = 0n, Q_bob = 0n
        const Q_mod = 0xFFFFFFFFFFFFFFC4n
        for (let i = 0; i < identity_alice.length; i++) Q_alice = (Q_alice * 31n + BigInt(identity_alice.charCodeAt(i))) % Q_mod
        for (let i = 0; i < identity_bob.length; i++) Q_bob = (Q_bob * 31n + BigInt(identity_bob.charCodeAt(i))) % Q_mod

        const d_bob = (s * Q_bob) % Q_mod

        const msg = '68656c6c6f'
        // Encrypt to Alice
        const ct = encrypt(msg, `${P_pub.toString(16)},${identity_alice}`)

        // Attempt decrypt with Bob's key
        const pt_wrong = decrypt(ct.output, d_bob.toString(16).padStart(16, '0'))

        expect(pt_wrong.output).not.toBe(msg)
    })

    it('metadata is populated', () => {
        const result = encrypt('00', '1,alice')
        expect(result.metadata.name).toBe('Boneh-Franklin IBE')
        expect(result.metadata.securityStatus).toBe('secure')
    })
})
