import { describe, expect, it } from 'vitest'
import { encryptRipemd256, encryptRipemd320 } from '@/lib/cipher/hash/ripemd256-320'

describe('RIPEMD-256/320', () => {
    it('RIPEMD-256 produces 64 hex chars', () => {
        expect(encryptRipemd256('', '').output).toHaveLength(64)
    })

    it('RIPEMD-320 produces 80 hex chars', () => {
        expect(encryptRipemd320('', '').output).toHaveLength(80)
    })
})
