import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/hash/whirlpool'
import { CipherError } from '../../../lib/utils/errors'

describe('Whirlpool Hash Unit Tests', () => {
  it('passes standard test vectors (encrypt)', () => {
    for (const vector of TEST_VECTORS) {
      const result = encrypt(vector.input, vector.key)
      expect(result.output).toBe(vector.expected)
    }
  })

  it('throws on decrypt', () => {
    expect(() => decrypt()).toThrowError(CipherError)
  })

  it('generates correct step count in instrumented mode', () => {
    const result = encrypt('abc', '', { instrument: true })
    expect(result.steps.length).toBe(12)
    expect(result.steps[0].label).toBe('Whirlpool Padding & Formatting')
    expect(result.steps[1].label).toBe('Block 1/1 — Round 1/10')
    expect(result.steps[10].label).toBe('Block 1/1 — Round 10/10')
    expect(result.steps[11].label).toBe('Final Whirlpool Digest')
  })

  it('validates input limit (> 2 MB shared limit)', () => {
    const longInput = 'a'.repeat(2 * 1024 * 1024 + 1)
    expect(() => encrypt(longInput)).toThrowError(CipherError)
  })
})
