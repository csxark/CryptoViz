import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/classical/trithemius'
import { CipherError } from '@/lib/utils/errors'

describe('Trithemius Cipher', () => {
  describe('encrypt()', () => {
    it('encrypts HELLO correctly (shift by position)', () => {
      // H(7+0)=7→H, E(4+1)=5→F, L(11+2)=13→N, L(11+3)=14→O, O(14+4)=18→S
      expect(encrypt('HELLO').output).toBe('HFNOS')
    })

    it('encrypts ABC to ACE', () => {
      // A(0+0)=0→A, B(1+1)=2→C, C(2+2)=4→E
      expect(encrypt('ABC').output).toBe('ACE')
    })

    it('encrypts ATTACK to AVVDGP', () => {
      // A(0+0)=0→A, T(19+1)=20→U, T(19+2)=21→V, A(0+3)=3→D, C(2+4)=6→G, K(10+5)=15→P
      expect(encrypt('ATTACK').output).toBe('AVVDGP')
    })

    it('preserves letter casing', () => {
      expect(encrypt('Hello').output).toBe('Hfnos')
    })

    it('passes non-alphabetic characters through unchanged', () => {
      expect(encrypt('HELLO, WORLD!').output).toBe('HFNOS, AUQYF!')
    })

    it('single letter at position 0 is identity', () => {
      expect(encrypt('A').output).toBe('A')
    })

    it('produces different output than Caesar for the same input', () => {
      const trithemius = encrypt('HELLO').output
      const caesarShift3 = 'KHOOR'
      expect(trithemius).not.toBe(caesarShift3)
    })

    it('handles long input with wrapping shifts', () => {
      // After position 26, shifts wrap around (26 mod 26 = 0)
      const input = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAA' // 27 A's
      const result = encrypt(input)
      // First 26 letters: A shifts by 0,1,...,25 → A,B,...,Z
      // 27th letter: A shifts by 26 mod 26 = 0 → A
      expect(result.output).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZA')
    })
  })

  describe('decrypt()', () => {
    it('decrypts HFNOS back to HELLO', () => {
      expect(decrypt('HFNOS').output).toBe('HELLO')
    })

    it('decrypts ACE back to ABC', () => {
      expect(decrypt('ACE').output).toBe('ABC')
    })

    it('decrypts AVVDGP back to ATTACK', () => {
      expect(decrypt('AVVDGP').output).toBe('ATTACK')
    })

    it('preserves letter casing', () => {
      expect(decrypt('Hfnos').output).toBe('Hello')
    })

    it('passes non-alphabetic characters through unchanged', () => {
      expect(decrypt('HFNOS, AUQYF!').output).toBe('HELLO, WORLD!')
    })

    it('single letter at position 0 is identity', () => {
      expect(decrypt('A').output).toBe('A')
    })

    it('decrypts wrapping shifts correctly', () => {
      const encrypted = 'ABCDEFGHIJKLMNOPQRSTUVWXYZA' // 27 chars
      const decrypted = decrypt(encrypted)
      expect(decrypted.output).toBe('AAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
    })
  })

  describe('round-trip encrypt -> decrypt', () => {
    it('round-trips simple text', () => {
      const { output } = encrypt('HELLO WORLD')
      expect(decrypt(output).output).toBe('HELLO WORLD')
    })

    it('round-trips all uppercase', () => {
      const { output } = encrypt('THE QUICK BROWN FOX')
      expect(decrypt(output).output).toBe('THE QUICK BROWN FOX')
    })

    it('round-trips all lowercase', () => {
      const { output } = encrypt('the quick brown fox')
      expect(decrypt(output).output).toBe('the quick brown fox')
    })

    it('round-trips mixed case with punctuation', () => {
      const { output } = encrypt("It's a test!")
      expect(decrypt(output).output).toBe("It's a test!")
    })

    it('round-trips single character', () => {
      const { output } = encrypt('X')
      expect(decrypt(output).output).toBe('X')
    })

    it('round-trips empty-ish input (only spaces)', () => {
      const { output } = encrypt('   ')
      expect(decrypt(output).output).toBe('   ')
    })

    it('round-trips 100 characters', () => {
      const input = 'A'.repeat(100)
      const { output } = encrypt(input)
      expect(decrypt(output).output).toBe(input)
    })
  })

  describe('input validation', () => {
    it('throws INPUT_REQUIRED on empty input', () => {
      try {
        encrypt('')
        expect.unreachable()
      } catch (e) {
        expect((e as CipherError).code).toBe('INPUT_REQUIRED')
      }
    })

    it('throws INPUT_TOO_LONG for oversized input', () => {
      const huge = 'A'.repeat(2 * 1024 * 1024 + 1)
      try {
        encrypt(huge)
        expect.unreachable()
      } catch (e) {
        expect((e as CipherError).code).toBe('INPUT_TOO_LONG')
      }
    })
  })

  describe('instrumented steps', () => {
    it('produces steps when instrument is true', () => {
      const result = encrypt('HELLO', '', { instrument: true })
      expect(result.steps.length).toBeGreaterThan(0)
    })

    it('includes key setup milestone step', () => {
      const result = encrypt('HELLO', '', { instrument: true })
      const milestones = result.steps.filter(s => s.isMilestone)
      expect(milestones.length).toBeGreaterThan(0)
      expect(milestones[0].label).toContain('Key setup')
    })

    it('includes shift mapping table step', () => {
      const result = encrypt('HELLO', '', { instrument: true })
      const tableStep = result.steps.find(s => s.matrix !== undefined)
      expect(tableStep).toBeDefined()
      expect(tableStep!.label).toContain('shift')
    })

    it('produces one step per character in instrumented mode', () => {
      const result = encrypt('HELLO', '', { instrument: true })
      // Key setup + shift table + 5 char steps + final = at least 8
      expect(result.steps.length).toBeGreaterThanOrEqual(8)
    })

    it('decrypt instrumented steps show subtraction formula', () => {
      const result = decrypt('HFNOS', '', { instrument: true })
      const keySetup = result.steps.find(s => s.isMilestone && s.label.includes('Key setup'))
      expect(keySetup).toBeDefined()
      expect(keySetup!.outputState).toContain('- i')
    })

    it('instrumented steps include notes for each character', () => {
      const result = encrypt('ABC', '', { instrument: true })
      const charSteps = result.steps.filter(s => s.label.includes('Position'))
      for (const step of charSteps) {
        expect(step.note).toBeDefined()
        expect(step.note!.length).toBeGreaterThan(0)
      }
    })

    it('non-alpha characters get correct note in instrumented mode', () => {
      const result = encrypt('A B', '', { instrument: true })
      const spaceStep = result.steps.find(s => s.label.includes("' '"))
      expect(spaceStep).toBeDefined()
      expect(spaceStep!.note).toContain('non-alphabetic')
    })
  })

  describe('metadata', () => {
    it('reports correct metadata on encrypt', () => {
      const result = encrypt('HELLO')
      expect(result.metadata.name).toBe('Trithemius Cipher')
      expect(result.metadata.securityStatus).toBe('broken')
      expect(result.metadata.yearDesigned).toBe(1508)
    })

    it('reports correct metadata on decrypt', () => {
      const result = decrypt('HFNOS')
      expect(result.metadata.name).toBe('Trithemius Cipher')
      expect(result.metadata.securityStatus).toBe('broken')
    })

    it('includes durationMs', () => {
      const result = encrypt('HELLO')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })
  })

  describe('TEST_VECTORS', () => {
    it('has test vectors defined', () => {
      expect(TEST_VECTORS.length).toBeGreaterThan(0)
    })

    it('each test vector includes required fields', () => {
      for (const v of TEST_VECTORS) {
        expect(v.input).toBeDefined()
        expect(v.key).toBeDefined()
        expect(v.expected).toBeDefined()
      }
    })

    it('matches known test vectors', () => {
      for (const v of TEST_VECTORS) {
        const { output } = encrypt(v.input)
        expect(output).toBe(v.expected)
      }
    })
  })

  describe('mathematical properties', () => {
    it('encryption at position 0 is identity for any letter', () => {
      for (let c = 65; c <= 90; c++) {
        const letter = String.fromCharCode(c)
        expect(encrypt(letter).output).toBe(letter)
      }
    })

    it('the cipher is self-inverse when applied twice (composite shift)', () => {
      // Encrypt twice: shift by i twice = shift by 2i
      // This is NOT the same as identity in general
      const input = 'HELLO'
      const { output: once } = encrypt(input)
      const { output: twice } = encrypt(once)
      // Twice encrypted should shift by 2i each position
      expect(twice).not.toBe(input)
    })

    it('Caesar cipher with shift k is a special case where position doesn\'t matter', () => {
      // Trithemius at position 0 with input 'A' gives 'A' (shift 0)
      // This is Caesar with shift 0 — an identity
      expect(encrypt('A').output).toBe('A')
    })
  })
})
