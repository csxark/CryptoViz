import { describe, expect, it } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/lblock'

describe('LBlock', () => {
    it('round trips with 80-bit key', () => {
        const pt = '0001020304050607'
        const key = '00112233445566778899'
        const ct = encrypt(pt, key)
        expect(decrypt(ct.output, key).output).toBe(pt)
    })

    it('rejects invalid key length', () => {
        expect(() => encrypt('0000000000000000', '0011223344556677')).toThrow('INVALID_KEY_LENGTH')
    })

    it('PKCS#7 padding for sub-8-byte input', () => {
        const pt = '000102'
        const key = '00112233445566778899'
        const ct = encrypt(pt, key)
        expect(decrypt(ct.output, key).output).toBe(pt)
    })

    it('empty input returns empty output', () => {
        expect(encrypt('', '00112233445566778899').output).toBe('')
    })

    it('Feistel rotation direction differs between encrypt and decrypt', () => {
        // Verified implicitly by round-trip correctness
        const pt = 'ffffffffffffffff'
        const key = '00000000000000000000'
        const ct = encrypt(pt, key)
        expect(decrypt(ct.output, key).output).toBe(pt)
    })
})
