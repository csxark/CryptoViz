import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/twofish'

describe('Twofish', () => {
    it('exports test vectors', () => {
        expect(TEST_VECTORS.length).toBeGreaterThan(0)
    })

    it('passes official zero-key vector', () => {
        const result = encrypt(
            '00000000000000000000000000000000',
            '00000000000000000000000000000000'
        )

        expect(result.output).toBe(
            '9f589f5cf6122c32b6bfec2f2ae8c35a'
        )
    })

    it('decrypts official zero-key vector', () => {
        const result = decrypt(
            '9f589f5cf6122c32b6bfec2f2ae8c35a',
            '00000000000000000000000000000000'
        )

        expect(result.output).toBe('00000000000000000000000000000000')
    })

    it('round-trips encrypt and decrypt for 128, 192, and 256-bit keys', () => {
        const plaintext = '0123456789abcdef0123456789abcdef'
        const keys = [
            '000102030405060708090a0b0c0d0e0f', // 128-bit
            '000102030405060708090a0b0c0d0e0f1011121314151617', // 192-bit
            '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f', // 256-bit
        ]

        for (const key of keys) {
            const encrypted = encrypt(plaintext, key)
            const decrypted = decrypt(encrypted.output, key)
            expect(decrypted.output).toBe(plaintext)
        }
    })

    it('supports instrumentation', () => {
        const result = encrypt(
            '00000000000000000000000000000000',
            '00000000000000000000000000000000',
            {
                instrument: true,
            }
        )

        expect(result.steps.length).toBeGreaterThan(0)
        expect(result.steps[0].label).toContain('Key')
    })

    it('rejects invalid key length', () => {
        expect(() =>
            encrypt(
                '00000000000000000000000000000000',
                '00112233'
            )
        ).toThrow()
    })

    it('rejects non-multiple block input', () => {
        expect(() =>
            encrypt(
                '00112233',
                '00000000000000000000000000000000'
            )
        ).toThrow()
    })

    it('rejects empty input', () => {
        expect(() =>
            encrypt(
                '',
                '00000000000000000000000000000000'
            )
        ).toThrow()
    })

    it('metadata is populated', () => {
        const result = encrypt(
            '00000000000000000000000000000000',
            '00000000000000000000000000000000'
        )

        expect(result.metadata.name).toBe('Twofish')
        expect(result.metadata.blockSize).toBe(128)
        expect(result.metadata.rounds).toBe(16)
        expect(result.metadata.securityStatus).toBe('secure')
    })
})
