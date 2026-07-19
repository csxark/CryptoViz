import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/hash/sha1'
import { CipherError } from '../../../lib/utils/errors'

// ─── Known-Answer Test Vectors ────────────────────────────────────────────────

describe('SHA-1 — known-answer vectors', () => {
  for (const { input, key, expected, description } of TEST_VECTORS) {
    it(description, () => {
      const result = encrypt(input, key)
      expect(result.output).toBe(expected)
    })
  }
})

// ─── Output Format ────────────────────────────────────────────────────────────

describe('SHA-1 — output properties', () => {
  it('output is always 40 hex chars (160-bit digest)', () => {
    const result = encrypt('hello', '')
    expect(result.output).toHaveLength(40)
    expect(result.output).toMatch(/^[0-9a-f]{40}$/)
  })

  it('outputEncoding is hex', () => {
    expect(encrypt('test', '').outputEncoding).toBe('hex')
  })

  it('metadata securityStatus is broken', () => {
    expect(encrypt('x', '').metadata.securityStatus).toBe('broken')
  })

  it('durationMs is a non-negative number', () => {
    const { durationMs } = encrypt('hello', '')
    expect(typeof durationMs).toBe('number')
    expect(durationMs).toBeGreaterThanOrEqual(0)
  })
})

// ─── Input Validation ─────────────────────────────────────────────────────────

describe('SHA-1 — input validation', () => {
  it('throws INPUT_REQUIRED for empty string', () => {
    expect(() => encrypt('', '')).toThrow(CipherError)
    try {
      encrypt('', '')
    } catch (e) {
      expect((e as CipherError).code).toBe('INPUT_REQUIRED')
    }
  })

  it('throws INPUT_TOO_LONG for input > 4096 bytes', () => {
    const big = 'a'.repeat(4097)
    expect(() => encrypt(big, '')).toThrow(CipherError)
    try {
      encrypt(big, '')
    } catch (e) {
      expect((e as CipherError).code).toBe('INPUT_TOO_LONG')
    }
  })

  it('accepts exactly 4096 bytes without throwing', () => {
    const boundary = 'a'.repeat(4096)
    expect(() => encrypt(boundary, '')).not.toThrow()
  })
})

// ─── Block Boundary Edge Cases ────────────────────────────────────────────────

describe('SHA-1 — block boundary edge cases', () => {
  it('55-byte input (fits in single block with padding)', () => {
    const input = 'a'.repeat(55)
    const result = encrypt(input, '')
    expect(result.output).toHaveLength(40)
  })

  it('56-byte input (requires two blocks — padding crosses boundary)', () => {
    const input = 'a'.repeat(56)
    const result = encrypt(input, '')
    expect(result.output).toHaveLength(40)
  })

  it('64-byte input (fills single block, padding in second block)', () => {
    const input = 'a'.repeat(64)
    const result = encrypt(input, '')
    expect(result.output).toHaveLength(40)
  })

  it('65-byte input (two-block input)', () => {
    const input = 'a'.repeat(65)
    const result = encrypt(input, '')
    expect(result.output).toHaveLength(40)
  })
})

// ─── Determinism ──────────────────────────────────────────────────────────────

describe('SHA-1 — determinism', () => {
  it('same input always produces same output', () => {
    const r1 = encrypt('hello world', '')
    const r2 = encrypt('hello world', '')
    expect(r1.output).toBe(r2.output)
  })

  it('different inputs produce different outputs (collision resistance)', () => {
    const r1 = encrypt('hello', '')
    const r2 = encrypt('world', '')
    expect(r1.output).not.toBe(r2.output)
  })
})

// ─── Instrumented Path ────────────────────────────────────────────────────────

describe('SHA-1 — instrumented path', () => {
  it('produces steps array when instrument=true', () => {
    const result = encrypt('abc', '', { instrument: true })
    expect(result.steps.length).toBeGreaterThan(0)
  })

  it('produces empty steps array when instrument=false', () => {
    const result = encrypt('abc', '', { instrument: false })
    expect(result.steps).toHaveLength(0)
  })

  it('steps have required CipherStep fields', () => {
    const result = encrypt('abc', '', { instrument: true })
    for (const step of result.steps) {
      expect(typeof step.index).toBe('number')
      expect(typeof step.label).toBe('string')
      expect(typeof step.note).toBe('string')
    }
  })

  it('first step is preprocessing milestone', () => {
    const result = encrypt('abc', '', { instrument: true })
    expect(result.steps[0].label).toContain('Preprocessing')
    expect(result.steps[0].isMilestone).toBe(true)
  })

  it('last step contains broken warning', () => {
    const result = encrypt('abc', '', { instrument: true })
    const last = result.steps[result.steps.length - 1]
    expect(last.note).toContain('BROKEN')
    expect(last.isMilestone).toBe(true)
  })

  it('step count within budget (≤84 for single-block input)', () => {
    const result = encrypt('abc', '', { instrument: true })
    expect(result.steps.length).toBeLessThanOrEqual(84)
  })
})

// ─── Property-Based Fuzz Tests ────────────────────────────────────────────────

describe('SHA-1 — property-based (fast-check)', () => {
  it('never throws TypeError on any valid ASCII string (1000 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (input) => {
          expect(() => encrypt(input, '')).not.toThrow(TypeError)
        },
      ),
      { numRuns: 1000 },
    )
  })

  it('output always 40 hex chars for any valid input', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (input) => {
          const result = encrypt(input, '')
          expect(result.output).toHaveLength(40)
          expect(result.output).toMatch(/^[0-9a-f]+$/)
        },
      ),
      { numRuns: 500 },
    )
  })

  it('two distinct inputs never produce same digest (collision test)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (a, b) => {
          if (a === b) return
          const ra = encrypt(a, '')
          const rb = encrypt(b, '')
          expect(ra.output).not.toBe(rb.output)
        },
      ),
      { numRuns: 500 },
    )
  })
})
