import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/classical/columnar-transposition'
import { CipherError } from '../../../lib/utils/errors'

describe('Columnar Transposition — known-answer vectors', () => {
  for (const { input, key, expected, description } of TEST_VECTORS) {
    it(description, () => {
      const result = encrypt(input, key)
      expect(result.output).toBe(expected)

      // Round-trip check
      const decrypted = decrypt(result.output, key)
      expect(decrypted.output).toBe(input)
    })
  }
})

describe('Columnar Transposition — round-trip', () => {
  it('decrypt(encrypt(input, key), key) === input (uppercase letters only)', () => {
    const cases = [
      { input: 'HELLOWORLD', key: 'KEY' },
      { input: 'ATTACKATDAWN', key: 'ZEBRAS' },
      { input: 'CRYPTOGRAPHY', key: 'ABC' },
      { input: 'ABCDE', key: 'TWOCOLUMNS' },
    ]
    for (const { input, key } of cases) {
      const enc = encrypt(input, key)
      const dec = decrypt(enc.output, key)
      expect(dec.output).toBe(input)
    }
  })

  it('correctly calculates column heights for irregular grids (Issue #1698 regression)', () => {
    // Key "ZEBRA" (5 cols), ciphertext length 12 (12 % 5 = 2 remainder columns)
    // Ranks: Z=4, E=2, B=1, R=3, A=0
    // Physical cols 0 and 1 take height 3, physical cols 2, 3, 4 take height 2.
    const ciphertext = 'EJCHBGLDIAFK'
    const key = 'ZEBRA'
    const resultFast = decrypt(ciphertext, key, { instrument: false })
    const resultInstrumented = decrypt(ciphertext, key, { instrument: true })

    expect(resultFast.output).toBe('ABCDEFGHIJKL')
    expect(resultInstrumented.output).toBe('ABCDEFGHIJKL')
  })

  it('handles multi-word and irregular length round-trips correctly', () => {
    const key = 'ZEBRA'
    const input = 'ATTACK AT DAWN'
    const cleanInput = 'ATTACKATDAWN' // length 12
    const enc = encrypt(input, key)
    const dec = decrypt(enc.output, key)
    expect(dec.output).toBe(cleanInput)
  })
})

describe('Columnar Transposition — key validation', () => {
  it('throws INVALID_KEY for empty key', () => {
    expect(() => encrypt('HELLO', '')).toThrow(CipherError)
    try { encrypt('HELLO', '') } catch (e) {
      expect((e as CipherError).code).toBe('INVALID_KEY')
    }
  })

  it('throws INVALID_KEY for numeric key', () => {
    expect(() => encrypt('HELLO', '123')).toThrow(CipherError)
    try { encrypt('HELLO', '123') } catch (e) {
      expect((e as CipherError).code).toBe('INVALID_KEY')
    }
  })

  it('throws INVALID_KEY for single-char key', () => {
    expect(() => encrypt('HELLO', 'A')).toThrow(CipherError)
  })

  it('accepts valid 2-char key', () => {
    expect(() => encrypt('HELLO', 'AB')).not.toThrow()
  })
})

describe('Columnar Transposition — input validation', () => {
  it('throws INPUT_REQUIRED for empty input', () => {
    expect(() => encrypt('', 'KEY')).toThrow(CipherError)
    try { encrypt('', 'KEY') } catch (e) {
      expect((e as CipherError).code).toBe('INPUT_REQUIRED')
    }
  })

  it('throws INPUT_TOO_LONG for > 4096 bytes', () => {
    expect(() => encrypt('A'.repeat(4097), 'KEY')).toThrow(CipherError)
  })
})

describe('Columnar Transposition — rank stability', () => {
  it('keys with repeated letters produce stable column ordering', () => {
    // No crash on duplicate letters
    expect(() => encrypt('HELLO', 'AABB')).not.toThrow()
  })
})

describe('Columnar Transposition — instrumented path', () => {
  it('produces steps when instrument=true', () => {
    const result = encrypt('HELLOWORLD', 'KEY', { instrument: true })
    expect(result.steps.length).toBeGreaterThan(0)
  })
  it('documents trailing X padding ambiguity in decrypt steps', () => {
  const result = decrypt('EOHLLLX', 'KEY', { instrument: true })

  const outputStep = result.steps.find(
    (step) => step.label === 'Plaintext output',
  )

  expect(outputStep).toBeDefined()
  expect(outputStep?.note).toContain("Trailing 'X' padding characters stripped.")
  expect(outputStep?.note).toContain(
    "trailing 'X' characters in the original plaintext are indistinguishable from padding and may be lost.",
  )
})

  it('first step is key rank assignment milestone', () => {
    const result = encrypt('HELLOWORLD', 'KEY', { instrument: true })
    expect(result.steps[0].isMilestone).toBe(true)
    expect(result.steps[0].label).toContain('rank')
  })

  it('includes grid step with matrix', () => {
    const result = encrypt('HELLOWORLD', 'KEY', { instrument: true })
    const gridStep = result.steps.find((s) => s.matrix !== undefined)
    expect(gridStep).toBeDefined()
  })

  it('empty steps when instrument=false', () => {
    const result = encrypt('HELLO', 'KEY', { instrument: false })
    expect(result.steps).toHaveLength(0)
  })
})

describe('Columnar Transposition — property-based', () => {
  it('round-trip holds for any alpha input and valid key (500 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).map((s) => s.toUpperCase().replace(/[^A-W]/g, 'A') || 'A'),
        fc.string({ minLength: 2, maxLength: 10 }).map((s) => s.toUpperCase().replace(/[^A-Z]/g, 'B') || 'AB'),
        (input, key) => {
          if (input.length === 0 || key.length < 2) return
          const enc = encrypt(input, key)
          const dec = decrypt(enc.output, key)
          expect(dec.output).toBe(input)
        },
      ),
      { numRuns: 500 },
    )
  })
})
