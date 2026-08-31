import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/hash/skein'

describe('Skein-256', () => {
    it('matches Skein v1.3 spec: empty message', () => {
        const v = TEST_VECTORS[0]
        expect(encrypt(v.input, v.key).output).toBe(v.expected)
    })

    it('matches Skein v1.3 spec: single byte 0xff', () => {
        const v = TEST_VECTORS[1]
        expect(encrypt(v.input, v.key).output).toBe(v.expected)
    })

    it('is deterministic: same input produces same hash', () => {
        const input = '48656c6c6f20576f726c64'
        expect(encrypt(input, '').output).toBe(encrypt(input, '').output)
    })

    it('different inputs produce different hashes', () => {
        expect(encrypt('00', '').output).not.toBe(encrypt('01', '').output)
    })

    it('output is always 32 bytes (64 hex chars)', () => {
        expect(encrypt('', '').output).toHaveLength(64)
        expect(encrypt('aabbcc', '').output).toHaveLength(64)
    })

    it('decrypt is identical to encrypt (hash has no inverse)', () => {
        const input = 'deadbeef'
        expect(encrypt(input, '').output).toBe(decrypt(input, '').output)
    })
})
