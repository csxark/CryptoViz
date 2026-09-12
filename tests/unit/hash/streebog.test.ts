import { describe, expect, it } from 'vitest'
import { encrypt, TEST_VECTORS } from '@/lib/cipher/hash/streebog'

describe('Streebog-256', () => {
    it('exports test vectors', () => {
        expect(TEST_VECTORS.length).toBeGreaterThan(0)
    })

    it('passes official RFC 6986 M1 vector', () => {
        const result = encrypt(
            '323130393837363534333231303938373635343332313039383736353433323130393837363534333231303938373635343332313039383736353433323130',
            ''
        )
        expect(result.output).toBe('9a3c1333c23b62649bf25cceeecaae95be7a4e61c0ca87cce7214b6ad2ac13a3')
    })

    it('supports instrumentation', () => {
        const result = encrypt('00', '', { instrument: true })
        expect(result.steps.length).toBeGreaterThan(0)
    })

    it('rejects invalid hex', () => {
        expect(() => encrypt('xyz', '')).toThrow()
    })

    it('metadata is populated', () => {
        const result = encrypt('00', '')
        expect(result.metadata.name).toBe('Streebog-256')
        expect(result.metadata.securityStatus).toBe('secure')
    })
})
