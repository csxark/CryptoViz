import { describe, expect, it } from 'vitest'
import { generate, verify } from '@/lib/cipher/hash/parallel-hash'

describe('ParallelHash128', () => {
    it('produces 256-bit output by default', () => {
        expect(generate('', '64:').output).toHaveLength(64)
    })

    it('different block sizes produce different output', () => {
        const h1 = generate('test', '8:')
        const h2 = generate('test', '16:')
        expect(h1.output).not.toBe(h2.output)
    })

    it('customization string changes output', () => {
        const h1 = generate('test', '8:')
        const h2 = generate('test', '8:MyApp')
        expect(h1.output).not.toBe(h2.output)
    })

    it('verifies correct hash', () => {
        const h = generate('test', '8:').output
        expect(verify('test', '8:', h)).toBe(true)
    })
})
