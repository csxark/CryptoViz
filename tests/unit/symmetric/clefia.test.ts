import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/clefia'

describe('CLEFIA', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('passes official RFC 6114 128-bit vector', () => {
        const result = encrypt(
            '000102030405060708090a0b0c0d0e0f',
            'ffeeddccbbaa99887766554433221100'
        )
        expect(result.output).toBe('de2bf2fd9b74aacdf1298555459494fd')
    })

    it('decrypt is exact inverse of encrypt', () => {
        const pt = '000102030405060708090a0b0c0d0e0f'
        const key = 'ffeeddccbbaa99887766554433221100'
        const enc = encrypt(pt, key)
        const dec = decrypt(enc.output, key)
        expect(dec.output).toBe(pt)
    })

    it('passes official RFC 6114 192-bit vector', () => {
        const result = encrypt(
            '000102030405060708090a0b0c0d0e0f',
            'ffeeddccbbaa99887766554433221100f0e0d0c0b0a09080'
        )
        expect(result.output).toBe('e2482f649f028dc480dda184fde181ad')
        expect(decrypt(result.output, 'ffeeddccbbaa99887766554433221100f0e0d0c0b0a09080').output).toBe('000102030405060708090a0b0c0d0e0f')
    })

    it('passes official RFC 6114 256-bit vector', () => {
        const result = encrypt(
            '000102030405060708090a0b0c0d0e0f',
            'ffeeddccbbaa99887766554433221100f0e0d0c0b0a090807060504030201000'
        )
        expect(result.output).toBe('a1397814289de80c10da46d1fa48b38a')
        expect(decrypt(result.output, 'ffeeddccbbaa99887766554433221100f0e0d0c0b0a090807060504030201000').output).toBe('000102030405060708090a0b0c0d0e0f')
    })

    it('metadata is populated', () => {
        const result = encrypt('000102030405060708090a0b0c0d0e0f', 'ffeeddccbbaa99887766554433221100')
        expect(result.metadata.name).toBe('CLEFIA')
        expect(result.metadata.securityStatus).toBe('secure')
    })
})