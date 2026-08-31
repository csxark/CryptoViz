import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/classical/keyword-substitution'
import { CipherError } from '@/lib/utils/errors'

describe('Keyword Substitution Cipher', () => {
  describe('encrypt()', () => {
    it('encrypts HELLO with keyword SECRET', () => {
      // Keyed: SECRETABDFGHIJKLMNOPQUVWXYZ
      // H(7)→F, E(4)→T, L(11)→L, L(11)→L, O(14)→N
      expect(encrypt('HELLO', 'SECRET').output).toBe('FTLLN')
    })

    it('encrypts ATTACK with keyword SECRET', () => {
      // A(0)→S, T(19)→Q, T(19)→Q, A(0)→S, C(2)→C, K(10)→I
      expect(encrypt('ATTACK', 'SECRET').output).toBe('SQQSCI')
    })

    it('encrypts HELLO with keyword KEY', () => {
      // Keyed: KEYABCDFGHIJLMNOPQRSTUVWXZ
      // H(7)→G, E(4)→A, L(11)→N, L(11)→N, O(14)→R
      expect(encrypt('HELLO', 'KEY').output).toBe('GANNR')
    })

    it('encrypts A with keyword B', () => {
      // Keyed: BACDEFGHIJKLMNOPQRSTUVWXYZ
      expect(encrypt('A', 'B').output).toBe('B')
    })

    it('preserves non-alphabetic characters', () => {
      expect(encrypt('HELLO, WORLD!', 'CIPHER').output).toBe('XOLLA, ALARW!')
    })

    it('preserves letter casing', () => {
      expect(encrypt('Hello', 'SECRET').output).toBe('Ftlln')
    })

    it('produces different output for different keywords', () => {
      const r1 = encrypt('HELLO', 'SECRET').output
      const r2 = encrypt('HELLO', 'ALPHA').output
      expect(r1).not.toBe(r2)
    })

    it('keyword with duplicate letters uses first occurrence', () => {
      // "BANANA" → unique: B, A, N
      // Keyed: BAN CDEFGHIJKLMNOPQRSTUVWXYZ...
      const r1 = encrypt('HELLO', 'BANANA').output
      const r2 = encrypt('HELLO', 'BAN').output
      expect(r1).toBe(r2)
    })

    it('full alphabet keyword produces shifted cipher', () => {
      // "ABCDEFGHIJKLMNOPQRSTUVWXYZ" → keyed = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
      // This is identity! A→A, B→B, etc.
      expect(encrypt('HELLO', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ').output).toBe('HELLO')
    })

    it('single-letter keyword shifts all but that letter', () => {
      // "Z" → keyed: ZABCDEFGHIJKLMNOPQRSTUVWXY
      // A→Z, B→A, C→B, ...
      expect(encrypt('ABC', 'Z').output).toBe('ZAB')
    })
  })

  describe('decrypt()', () => {
    it('decrypts FTLLN with keyword SECRET', () => {
      expect(decrypt('FTLLN', 'SECRET').output).toBe('HELLO')
    })

    it('decrypts SQQSCI with keyword SECRET', () => {
      expect(decrypt('SQQSCI', 'SECRET').output).toBe('ATTACK')
    })

    it('decrypts GANNR with keyword KEY', () => {
      expect(decrypt('GANNR', 'KEY').output).toBe('HELLO')
    })

    it('preserves non-alphabetic characters', () => {
      expect(decrypt('XOLLA, ALARW!', 'CIPHER').output).toBe('HELLO, WORLD!')
    })

    it('preserves letter casing', () => {
      expect(decrypt('Ftlln', 'SECRET').output).toBe('Hello')
    })

    it('identity keyword decrypts to itself', () => {
      expect(decrypt('HELLO', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ').output).toBe('HELLO')
    })
  })

  describe('round-trip encrypt -> decrypt', () => {
    it('round-trips simple text', () => {
      const { output } = encrypt('HELLO WORLD', 'SECRET')
      expect(decrypt(output, 'SECRET').output).toBe('HELLO WORLD')
    })

    it('round-trips full alphabet', () => {
      const { output } = encrypt('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'KEYWORD')
      expect(decrypt(output, 'KEYWORD').output).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    })

    it('round-trips with punctuation', () => {
      const { output } = encrypt("It's a test!", 'CIPHER')
      expect(decrypt(output, 'CIPHER').output).toBe("It's a test!")
    })

    it('round-trips long text', () => {
      const input = 'THEQUICKBROWNFOX'
      const { output } = encrypt(input, 'PHOENIX')
      expect(decrypt(output, 'PHOENIX').output).toBe(input)
    })

    it('round-trips single character', () => {
      const { output } = encrypt('Z', 'A')
      expect(decrypt(output, 'A').output).toBe('Z')
    })

    it('round-trips 100 characters', () => {
      const input = 'A'.repeat(100)
      const { output } = encrypt(input, 'TEST')
      expect(decrypt(output, 'TEST').output).toBe(input)
    })

    it('round-trips all 26 letters', () => {
      const { output } = encrypt('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'CIPHER')
      expect(decrypt(output, 'CIPHER').output).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    })
  })

  describe('input validation', () => {
    it('throws INPUT_REQUIRED on empty input', () => {
      try {
        encrypt('', 'SECRET')
        expect.unreachable()
      } catch (e) {
        expect((e as CipherError).code).toBe('INPUT_REQUIRED')
      }
    })

    it('throws INPUT_TOO_LONG for oversized input', () => {
      const huge = 'A'.repeat(2 * 1024 * 1024 + 1)
      try {
        encrypt(huge, 'SECRET')
        expect.unreachable()
      } catch (e) {
        expect((e as CipherError).code).toBe('INPUT_TOO_LONG')
      }
    })

    it('throws INVALID_KEY for empty key', () => {
      try {
        encrypt('HELLO', '')
        expect.unreachable()
      } catch (e) {
        expect((e as CipherError).code).toBe('INVALID_KEY')
      }
    })
  })

  describe('instrumented steps', () => {
    it('produces steps when instrument is true', () => {
      const result = encrypt('HELLO', 'SECRET', { instrument: true })
      expect(result.steps.length).toBeGreaterThan(0)
    })

    it('includes key setup milestone', () => {
      const result = encrypt('HELLO', 'SECRET', { instrument: true })
      const milestones = result.steps.filter(s => s.isMilestone)
      expect(milestones.length).toBeGreaterThan(0)
      expect(milestones[0].label).toContain('Key setup')
    })

    it('includes substitution table', () => {
      const result = encrypt('A', 'SECRET', { instrument: true })
      const tableStep = result.steps.find(s => s.matrix !== undefined)
      expect(tableStep).toBeDefined()
      expect(tableStep!.matrix).toHaveLength(2)
    })

    it('decrypt instrumented steps work', () => {
      const result = decrypt('FTLLN', 'SECRET', { instrument: true })
      const keySetup = result.steps.find(s => s.isMilestone && s.label.includes('Key setup'))
      expect(keySetup).toBeDefined()
    })

    it('instrumented steps include per-character notes', () => {
      const result = encrypt('ABC', 'SECRET', { instrument: true })
      const charSteps = result.steps.filter(s => s.label.includes('Position'))
      for (const step of charSteps) {
        expect(step.note).toBeDefined()
        expect(step.note!.length).toBeGreaterThan(0)
      }
    })

    it('non-alpha gets correct note', () => {
      const result = encrypt('A B', 'SECRET', { instrument: true })
      const spaceStep = result.steps.find(s => s.label.includes("' '"))
      expect(spaceStep).toBeDefined()
      expect(spaceStep!.note).toContain('non-alphabetic')
    })
  })

  describe('metadata', () => {
    it('reports correct metadata', () => {
      const result = encrypt('HELLO', 'SECRET')
      expect(result.metadata.name).toBe('Keyword Substitution Cipher')
      expect(result.metadata.securityStatus).toBe('broken')
    })

    it('reports monoalphabetic in instrumented table', () => {
      const result = encrypt('A', 'SECRET', { instrument: true })
      const setupTable = result.steps[0].table
      const typeEntry = setupTable!.find(t => t.key === 'Cipher type')
      expect(typeEntry!.value).toContain('Monoalphabetic')
    })

    it('includes durationMs', () => {
      const result = encrypt('HELLO', 'SECRET')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })
  })

  describe('TEST_VECTORS', () => {
    it('has test vectors', () => {
      expect(TEST_VECTORS.length).toBeGreaterThan(0)
    })

    it('each vector has required fields', () => {
      for (const v of TEST_VECTORS) {
        expect(v.input).toBeDefined()
        expect(v.key).toBeDefined()
        expect(v.expected).toBeDefined()
      }
    })

    it('matches known test vectors', () => {
      for (const v of TEST_VECTORS) {
        expect(encrypt(v.input, v.key).output).toBe(v.expected)
      }
    })
  })

  describe('keyed alphabet properties', () => {
    it('keyed alphabet has exactly 26 unique letters', () => {
      const result = encrypt('A', 'SECRET', { instrument: true })
      const keyedAlpha = result.steps[0].outputState
      expect(new Set(keyedAlpha).size).toBe(26)
    })

    it('keyed alphabet starts with keyword letters', () => {
      const result = encrypt('A', 'SECRET', { instrument: true })
      const keyedAlpha = result.steps[0].outputState
      expect(keyedAlpha.startsWith('SECRET')).toBe(true)
    })

    it('different keywords produce different keyed alphabets', () => {
      const r1 = encrypt('A', 'ALPHA', { instrument: true })
      const r2 = encrypt('A', 'BRAVO', { instrument: true })
      expect(r1.steps[0].outputState).not.toBe(r2.steps[0].outputState)
    })

    it('keyword letters appear only once in keyed alphabet', () => {
      const result = encrypt('A', 'BANANA', { instrument: true })
      const keyedAlpha = result.steps[0].outputState
      // B appears once, A appears once, N appears once
      expect(keyedAlpha.indexOf('B')).toBe(keyedAlpha.lastIndexOf('B'))
      expect(keyedAlpha.indexOf('A')).toBe(keyedAlpha.lastIndexOf('A'))
      expect(keyedAlpha.indexOf('N')).toBe(keyedAlpha.lastIndexOf('N'))
    })

    it('remaining letters after keyword are in standard order', () => {
      const result = encrypt('A', 'CAT', { instrument: true })
      const keyedAlpha = result.steps[0].outputState
      // After CAT: should be BDEFGHIJKLMNOPQRSUVWXYZ
      const afterKeyword = keyedAlpha.slice(3) // after "CAT"
      const expected = 'BDEFGHIJKLMNOPQRSUVWXYZ'
      expect(afterKeyword).toBe(expected)
    })
  })
})
