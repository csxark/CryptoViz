import { describe, expect, it } from 'vitest'
import { encrypt } from '@/lib/cipher/hash/shabal'

describe('Shabal', () => {
    it('produces 256-bit output by default', () => {
        expect(encrypt('', '').output).toHaveLength(64)
    })

    it('supports 512-bit output', () => {
        expect(encrypt('', '', { outputBits: 512 }).output).toHaveLength(128)
    })
})
