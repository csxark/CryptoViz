import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/hash/md2'
import { CipherError } from '@/lib/utils/errors'

describe('MD2', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('matches official RFC 1319 empty string vector', () => {
        const result = encrypt('', '')
        expect(result.output).toBe('8350e5a3e24c153df2275c9f80692773')
    })

    it('matches official RFC 1319 "a" vector', () => {
        const result = encrypt('61', '') // "a" in hex
        expect(result.output).toBe('32ec01ec4a6dac72c0ab96fb34c0b5d1')
    })

    it('matches official RFC 1319 "abc" vector', () => {
        const result = encrypt('616263', '') // "abc" in hex
        expect(result.output).toBe('da853b0d3f88d99b30283a69e6ded6bb')
    })

    it('matches official RFC 1319 "message digest" vector', () => {
        const input = Buffer.from('message digest').toString('hex')
        const result = encrypt(input, '')
        expect(result.output).toBe('ab4f496bfb2a530b219ff33031fe06b0')
    })

    it('is deterministic for repeated invocations', () => {
        const input = '68656c6c6f'
        const res1 = encrypt(input, '')
        const res2 = encrypt(input, '')
        expect(res1.output).toBe(res2.output)
    })

    it('supports instrumented execution tracing steps', () => {
        const result = encrypt('61', '', { instrument: true })
        expect(result.steps.length).toBeGreaterThan(0)
    })

    it('decrypt throws ALGORITHM_UNSUPPORTED', () => {
        expect(() => decrypt('1234', '')).toThrow(CipherError)
        expect(() => decrypt('1234', '')).toThrow(/MD2 is a hash function/)
    })

    it('metadata flags broken status', () => {
        const result = encrypt('', '')
        expect(result.metadata.securityStatus).toBe('broken')
        expect(result.metadata.name).toBe('MD2')
        expect(result.metadata.yearDesigned).toBe(1989)
    })
})
