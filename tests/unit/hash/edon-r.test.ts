import { describe, expect, it } from 'vitest'
import { encrypt } from '@/lib/cipher/hash/edon-r'

describe('Edon-R', () => {
    it('Edon-R256 produces 256-bit output', () => {
        expect(encrypt('', '').output).toHaveLength(64)
    })

    it('Edon-R512 produces 512-bit output', () => {
        expect(encrypt('', '', { outputBits: 512 }).output).toHaveLength(128)
    })

    it('Edon-R256 and Edon-R512 produce distinct outputs', () => {
        const h256 = encrypt('616263', '', { outputBits: 256 })
        const h512 = encrypt('616263', '', { outputBits: 512 })
        expect(h256.output).not.toBe(h512.output.slice(0, 64))
    })

    it('empty input does not panic', () => {
        expect(() => encrypt('', '')).not.toThrow()
    })

    // Educational collision test placeholder
    // In a full implementation, this would use the Mendel et al. SAC 2009 collision pair
    it('demonstrates quasigroup transformation', () => {
        const h1 = encrypt('00', '')
        const h2 = encrypt('01', '')
        expect(h1.output).not.toBe(h2.output)
    })
})
