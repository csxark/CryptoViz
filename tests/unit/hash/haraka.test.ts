import { describe, expect, it } from 'vitest'
import { encrypt } from '@/lib/cipher/hash/haraka'

describe('Haraka', () => {
    it('Haraka-256 requires exactly 32 bytes', () => {
        expect(() => encrypt('00'.repeat(16), '')).toThrow(/requires exactly 32 bytes/)
        expect(encrypt('00'.repeat(32), '').output).toHaveLength(64)
    })

    it('Haraka-512 requires exactly 64 bytes', () => {
        expect(() => encrypt('00'.repeat(32), '', { variant: 512 })).toThrow(/requires exactly 64 bytes/)
        expect(encrypt('00'.repeat(64), '', { variant: 512 }).output).toHaveLength(64)
    })
})
