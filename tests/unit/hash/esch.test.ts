import { describe, expect, it } from 'vitest'
import { encrypt } from '@/lib/cipher/hash/esch'

describe('ESCH256', () => {
    it('produces 256-bit output for empty input', () => {
        expect(encrypt('', '').output).toHaveLength(64)
    })

    it('produces 256-bit output for non-empty input', () => {
        expect(encrypt('616263', '').output).toHaveLength(64)
    })

    it('empty input does not panic', () => {
        expect(() => encrypt('', '')).not.toThrow()
    })
})
