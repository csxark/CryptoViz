import { describe, expect, it } from 'vitest'
import { encrypt } from '@/lib/cipher/hash/simd'

describe('SIMD', () => {
    it('SIMD-256 produces 256-bit output', () => {
        expect(encrypt('', '').output).toHaveLength(64)
    })

    it('SIMD-512 produces 512-bit output', () => {
        expect(encrypt('', '', { outputBits: 512 }).output).toHaveLength(128)
    })

    it('SIMD-256 and SIMD-512 produce distinct outputs', () => {
        const h256 = encrypt('616263', '', { outputBits: 256 })
        const h512 = encrypt('616263', '', { outputBits: 512 })
        expect(h256.output).not.toBe(h512.output.slice(0, 64))
    })

    it('empty input does not panic', () => {
        expect(() => encrypt('', '')).not.toThrow()
    })
})
