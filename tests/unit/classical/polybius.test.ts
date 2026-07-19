import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/classical/polybius'
import { CipherError } from '../../../lib/utils/errors'

describe('Polybius Square — known-answer vectors', () => {
  for (const { input, key, expected, description } of TEST_VECTORS) {
    it(description, () => {
      const result = encrypt(input, key)
      expect(result.output).toBe(expected)
    })
  }
})

describe('Polybius Square — round-trip', () => {
  it('decrypt(encrypt(input)) === input (uppercase, no spaces)', () => {
    const input = 'HELLO'
    const key = ''
    const enc = encrypt(input, key)
    const dec = decrypt(enc.output, key)
    expect(dec.output).toBe('HELLO')
  })

  it('round-trip with keyed grid', () => {
    const input = 'CRYPTOVIZ'
    const key = 'SECRET'
    const enc = encrypt(input, key)
    const dec = decrypt(enc.output, key)
    expect(dec.output).toBe(input)
  })
})

describe('Polybius Square — J/I handling', () => {
  it('J is encoded as I coordinates', () => {
    const j = encrypt('J', '')
    const i = encrypt('I', '')
    expect(j.output).toBe(i.output)
  })
})

describe('Polybius Square — validation', () => {
  it('throws INPUT_REQUIRED for empty string', () => {
    expect(() => encrypt('', '')).toThrow(CipherError)
    try { encrypt('', '') } catch (e) {
      expect((e as CipherError).code).toBe('INPUT_REQUIRED')
    }
  })

  it('throws INPUT_TOO_LONG for > 4096 bytes', () => {
    expect(() => encrypt('A'.repeat(4097), '')).toThrow(CipherError)
    try { encrypt('A'.repeat(4097), '') } catch (e) {
      expect((e as CipherError).code).toBe('INPUT_TOO_LONG')
    }
  })
})

describe('Polybius Square — instrumented path', () => {
  it('produces steps when instrument=true', () => {
    const result = encrypt('HI', '', { instrument: true })
    expect(result.steps.length).toBeGreaterThan(0)
  })

  it('first step is grid construction milestone', () => {
    const result = encrypt('HI', '', { instrument: true })
    expect(result.steps[0].label).toContain('square')
    expect(result.steps[0].isMilestone).toBe(true)
    expect(result.steps[0].matrix).toBeDefined()
  })

  it('empty steps when instrument=false', () => {
    const result = encrypt('HI', '', { instrument: false })
    expect(result.steps).toHaveLength(0)
  })
})

describe('Polybius Square — property-based', () => {
  it('never throws TypeError on alpha input (1000 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => /[a-zA-Z]/.test(s)),
        fc.string({ maxLength: 20 }).filter(s => /^[a-zA-Z]*$/.test(s)),
        (input, key) => {
          expect(() => encrypt(input, key)).not.toThrow(TypeError)
        },
      ),
      { numRuns: 1000 },
    )
  })
})
