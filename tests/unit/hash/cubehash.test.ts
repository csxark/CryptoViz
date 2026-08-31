import { describe, expect, it } from 'vitest'
import { encrypt } from '@/lib/cipher/hash/cubehash'

describe('CubeHash', () => {
    it('produces 256-bit output by default', () => {
        expect(encrypt('', '').output).toHaveLength(64)
    })

    it('supports 512-bit output', () => {
        expect(encrypt('', '', { outputBits: 512 }).output).toHaveLength(128)
    })

    it('rejects invalid rounds', () => {
        expect(() => encrypt('', '', { rounds: 0 })).toThrow(/Rounds must be > 0/)
    })
})
