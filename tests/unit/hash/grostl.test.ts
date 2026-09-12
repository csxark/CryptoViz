import { describe, expect, it } from 'vitest'
import { encrypt, TEST_VECTORS } from '@/lib/cipher/hash/grostl'

describe('Grøstl-256', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('matches official empty string vector', () => {
        const result = encrypt('','')
        expect(result.output).toBe('e39b4796b596278f20a30a5c5e5c1f69f518d1484809cd0526c01f7924c816bc')
    })

    it('metadata is populated', () => {
        const result = encrypt('','')
        expect(result.metadata.name).toBe('Grøstl-256')
        expect(result.metadata.securityStatus).toBe('secure')
    })
})
