import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/hash/blake3'

describe('BLAKE3', () => {
  it('matches the official empty-input test vector', () => {
    const v = TEST_VECTORS[0]
    const result = encrypt(v.input, v.key)
    expect(result.output).toBe(v.expected)
  })

  it('produces a 32-byte (64 hex char) digest for arbitrary input', () => {
    const result = encrypt('The quick brown fox jumps over the lazy dog', '')
    expect(result.output).toHaveLength(64)
  })

  it('is deterministic', () => {
    const a = encrypt('hello world', '')
    const b = encrypt('hello world', '')
    expect(a.output).toBe(b.output)
  })

  it('decrypt throws ALGORITHM_UNSUPPORTED', () => {
    expect(() => decrypt('anything', '')).toThrow(/ALGORITHM_UNSUPPORTED|one-way/)
  })

  it('produces an instrumented trace', () => {
    const result = encrypt('abc', '', { instrument: true })
    expect(result.steps.length).toBeGreaterThanOrEqual(2)
    expect(result.steps[0].label).toMatch(/Chunking/)
  })
})
