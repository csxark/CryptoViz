import { describe, expect, it } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/piccolo'

describe('PICCOLO', () => {
    it('PICCOLO-80 round trips', () => {
        const pt = '0001020304050607'
        const key = '00112233445566778899'
        const ct = encrypt(pt, key)
        expect(decrypt(ct.output, key).output).toBe(pt)
    })

    it('PICCOLO-128 round trips', () => {
        const pt = '0001020304050607'
        const key = '00112233445566778899aabbccddeeff'
        const ct = encrypt(pt, key)
        expect(decrypt(ct.output, key).output).toBe(pt)
    })

    it('rejects invalid key length', () => {
        expect(() => encrypt('0000000000000000', '001122334455')).toThrow('INVALID_KEY_LENGTH')
    })

    it('PKCS#7 padding for sub-8-byte input', () => {
        const pt = '000102'
        const key = '00112233445566778899'
        const ct = encrypt(pt, key)
        expect(decrypt(ct.output, key).output).toBe(pt)
    })
})
