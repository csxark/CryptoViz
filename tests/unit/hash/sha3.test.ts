import { describe, it, expect } from 'vitest'
import { sha3_256 } from '@noble/hashes/sha3.js'
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/hash/sha3'
import { CipherError } from '../../../lib/utils/errors'
import fc from 'fast-check'

describe('SHA3-256 Hash Unit Tests', () => {
  it('passes standard test vectors (fast mode)', () => {
    for (const vector of TEST_VECTORS) {
      const result = encrypt(vector.input, vector.key)
      expect(result.output).toBe(vector.expected)
    }
  })

  it('passes standard test vectors (instrumented mode)', () => {
    for (const vector of TEST_VECTORS) {
      const result = encrypt(vector.input, vector.key, { instrument: true })
      expect(result.output).toBe(vector.expected)
    }
  })

  it('throws on decrypt', () => {
    expect(() => decrypt()).toThrowError(CipherError)
  })

  it('produces a milestone padding step and a final digest step in instrumented mode', () => {
    const result = encrypt('abc', '', { instrument: true })
    expect(result.steps[0].label).toContain('Padding')
    expect(result.steps[0].isMilestone).toBe(true)
    expect(result.steps[result.steps.length - 1].label).toBe('Squeeze final digest')
    expect(result.steps[result.steps.length - 1].outputState).toBe(result.output)
  })

  it('validates input limit (> 2 MB shared limit)', () => {
    const longInput = 'a'.repeat(2 * 1024 * 1024 + 1)
    expect(() => encrypt(longInput)).toThrowError(CipherError)
  })

  it('handles the exact rate-boundary case (136-byte input) without an extra empty block bug', () => {
    const input = 'a'.repeat(136)
    const expected = Buffer.from(sha3_256(new TextEncoder().encode(input))).toString('hex')
    const result = encrypt(input, '')
    expect(result.output).toBe(expected)
  })

  it('property-based: matches the audited @noble/hashes implementation for arbitrary input', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 500 }), (input: string) => {
        const expected = Buffer.from(sha3_256(new TextEncoder().encode(input))).toString('hex')
        const result = encrypt(input, '')
        expect(result.output).toBe(expected)
      }),
      { numRuns: 200 }
    )
  })

  it('instrumented mode matches fast mode output for arbitrary input (permutation correctness)', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 300 }), (input: string) => {
        const fast = encrypt(input, '')
        const instrumented = encrypt(input, '', { instrument: true })
        expect(instrumented.output).toBe(fast.output)
      }),
      { numRuns: 100 }
    )
  })
})
