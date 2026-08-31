import { describe, expect, it } from 'vitest'
import { encrypt } from '@/lib/cipher/hash/echo'

describe('ECHO', () => {
    it('ECHO-256 produces 256-bit output', () => {
        expect(encrypt('', '').output).toHaveLength(64)
    })

    it('ECHO-512 produces 512-bit output', () => {
        expect(encrypt('', '', { outputBits: 512 }).output).toHaveLength(128)
    })

    it('non-zero salt produces different digest', () => {
        const h1 = encrypt('616263', '')
        const h2 = encrypt('616263', '00112233445566778899aabbccddeeff')
        expect(h1.output).not.toBe(h2.output)
    })

    it('ECHO-256 and ECHO-512 produce distinct outputs', () => {
        const h256 = encrypt('616263', '', { outputBits: 256 })
        const h512 = encrypt('616263', '', { outputBits: 512 })
        expect(h256.output).not.toBe(h512.output.slice(0, 64))
    })

    it('empty input does not panic', () => {
        expect(() => encrypt('', '')).not.toThrow()
    })
})
