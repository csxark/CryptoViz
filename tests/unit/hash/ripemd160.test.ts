import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/hash/ripemd160'
import { CipherError } from '../../../lib/utils/errors'
import fc from 'fast-check'

describe('RIPEMD-160 Unit Tests', () => {
  it('passes standard test vectors', () => {
    for (const vector of TEST_VECTORS) {
      const result = encrypt(vector.input)
      expect(result.output).toBe(vector.expected)
    }
  })

  it('throws INPUT_REQUIRED for null/undefined input', () => {
    // @ts-expect-error testing runtime guard against non-string input
    expect(() => encrypt(null)).toThrowError(CipherError)
    // @ts-expect-error testing runtime guard against non-string input
    expect(() => encrypt(undefined)).toThrowError(CipherError)
  })

  it('accepts empty string (unlike keyed ciphers, empty input is a valid hash input)', () => {
    const result = encrypt('')
    expect(result.output).toBe('9c1185a5c5e9fc54612808977ee8f548b2258d31')
  })

  it('throws ALGORITHM_UNSUPPORTED on decrypt', () => {
    expect(() => decrypt()).toThrowError(CipherError)
  })

  it('fast and instrumented modes agree on the final digest', () => {
    const fast = encrypt('The quick brown fox jumps over the lazy dog')
    const instrumented = encrypt('The quick brown fox jumps over the lazy dog', '', { instrument: true })
    expect(instrumented.output).toBe(fast.output)
    expect(instrumented.steps.length).toBeGreaterThan(0)
    expect(instrumented.steps[0].isMilestone).toBe(true)
  })

  it('produces one padding milestone, one step per 64-byte block, and one final-digest step', () => {
    // 'abc' (3 bytes) pads to exactly 1 block of 64 bytes
    const result = encrypt('abc', '', { instrument: true })
    expect(result.steps.length).toBe(3) // padding + 1 block + final digest
  })

  it('property-based: hashing is deterministic and produces a 40-char hex digest', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 500 }), (input) => {
        const r1 = encrypt(input)
        const r2 = encrypt(input)
        expect(r1.output).toBe(r2.output)
        expect(r1.output).toMatch(/^[0-9a-f]{40}$/)
      }),
      { numRuns: 200 }
    )
  })
})
