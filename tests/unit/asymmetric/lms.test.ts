// lms.test.ts
import { describe, expect, it } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/asymmetric/lms'
describe('LMS', () => {
    it('signs and verifies at leaf 0', () => {
        const sig = encrypt('48656c6c6f', '00'.repeat(32), { leafIndex: 0 })
        expect(decrypt(sig.output, '00'.repeat(32), { leafIndex: 0 }).output).toBe('01')
    })
    it('rejects exhausted keys', () => {
        expect(() => encrypt('00', '00'.repeat(32), { leafIndex: 1024 })).toThrow('KEY_EXHAUSTED')
    })
})
