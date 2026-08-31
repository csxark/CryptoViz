import { describe, expect, it } from 'vitest'
import { encrypt } from '@/lib/cipher/hash/bmw'

describe('Blue Midnight Wish', () => {
    it('produces 256-bit output by default (32-bit words)', () => {
        expect(encrypt('', '').output).toHaveLength(64)
    })

    it('supports 512-bit output (64-bit BigInt words)', () => {
        expect(encrypt('', '', { outputBits: 512 }).output).toHaveLength(128)
    })
})