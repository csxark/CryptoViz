import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/classical/affine'
import { CipherError } from '@/lib/utils/errors'

describe('Affine Cipher', () => {
  describe('encrypt()', () => {
    it('encrypts with a=5, b=8 (canonical example)', () => {
      // a=5, b=8: E(x) = (5x + 8) mod 26
      // H=7 -> (35+8)%26=43%26=17 -> R
      // E=4 -> (20+8)%26=28%26=2 -> C
      // L=11 -> (55+8)%26=63%26=11 -> L
      // O=14 -> (70+8)%26=78%26=0 -> A
      expect(encrypt('HELLO', '5,8').output).toBe('RCLLA')
    })

    it('encrypts with a=3, b=5', () => {
      // a=3, b=5: E(x) = (3x + 5) mod 26
      // A=0 -> 5 -> F
      // B=1 -> 8 -> I
      // C=2 -> 11 -> L
      expect(encrypt('ABC', '3,5').output).toBe('FIL')
    })

    it('passes non-alphabetic characters through unchanged', () => {
      expect(encrypt('HELLO, WORLD!', '5,8').output).toBe('RCLLA, FMCLA!')
    })

    it('preserves letter casing', () => {
      expect(encrypt('Hello', '5,8').output).toBe('Rclla')
    })

    it('identity transform with a=1, b=0 returns input unchanged', () => {
      expect(encrypt('HELLO', '1,0').output).toBe('HELLO')
    })

    it('supports key as just "a" (b defaults to 0)', () => {
      // a=5, b=0: E(x) = 5x mod 26
      // A=0 -> 0 -> A
      // B=1 -> 5 -> F
      // C=2 -> 10 -> K
      expect(encrypt('ABC', '5').output).toBe('AFK')
    })

    it('handles space-separated key format', () => {
      expect(encrypt('HELLO', '5 8').output).toBe('RCLLA')
    })

    it('produces different output for different keys', () => {
      const r1 = encrypt('HELLO', '5,8').output
      const r2 = encrypt('HELLO', '3,7').output
      expect(r1).not.toBe(r2)
    })

    it('encrypts all letters of the alphabet uniquely', () => {
      const result = encrypt('ABCDEFGHIJKLMNOPQRSTUVWXYZ', '5,8').output
      const uniqueChars = new Set(result)
      // All 26 unique letters should map to 26 unique letters
      expect(uniqueChars.size).toBe(26)
    })
  })

  describe('decrypt()', () => {
    it('decrypts a=5, b=8 correctly', () => {
      // a⁻¹ of 5 mod 26 = 21 (since 5*21=105=4*26+1)
      // D(y) = 21*(y - 8) mod 26
      expect(decrypt('RCLLA', '5,8').output).toBe('HELLO')
    })

    it('decrypts a=3, b=5 correctly', () => {
      expect(decrypt('FIL', '3,5').output).toBe('ABC')
    })

    it('passes non-alphabetic characters through unchanged', () => {
      expect(decrypt('RCLLA, FMCLA!', '5,8').output).toBe('HELLO, WORLD!')
    })

    it('preserves letter casing', () => {
      expect(decrypt('Rclla', '5,8').output).toBe('Hello')
    })

    it('identity decryption with a=1, b=0 returns input unchanged', () => {
      expect(decrypt('HELLO', '1,0').output).toBe('HELLO')
    })
  })

  describe('round-trip encrypt -> decrypt', () => {
    it('round-trips with key 5,8', () => {
      const { output } = encrypt('HELLO WORLD', '5,8')
      expect(decrypt(output, '5,8').output).toBe('HELLOWORLD')
    })

    it('round-trips with key 3,5', () => {
      const { output } = encrypt('ATTACK AT DAWN', '3,5')
      expect(decrypt(output, '3,5').output).toBe('ATTACKATDAWN')
    })

    it('round-trips with key 7,3', () => {
      const { output } = encrypt('CRYPTOGRAPHY IS FUN', '7,3')
      expect(decrypt(output, '7,3').output).toBe('CRYPTOGRAPHYISFUN')
    })

    it('round-trips lowercase input', () => {
      const { output } = encrypt('hello world', '11,4')
      expect(decrypt(output, '11,4').output).toBe('helloworld')
    })

    it('round-trips long text with all letter types', () => {
      const input = 'The quick brown fox jumps over the lazy dog'
      const { output } = encrypt(input, '9,2')
      expect(decrypt(output, '9,2').output).toBe('Thequickbrownfoxjumpsoverthelazydog')
    })

    it('round-trips single character', () => {
      const { output } = encrypt('X', '5,8')
      expect(decrypt(output, '5,8').output).toBe('X')
    })
  })

  describe('key validation', () => {
    it('throws INVALID_KEY for non-numeric key', () => {
      try {
        encrypt('HELLO', 'abc')
        expect.unreachable()
      } catch (e) {
        expect((e as CipherError).code).toBe('INVALID_KEY')
      }
    })

    it('throws INVALID_KEY for non-coprime multiplier (a=2)', () => {
      try {
        encrypt('HELLO', '2,5')
        expect.unreachable()
      } catch (e) {
        expect((e as CipherError).code).toBe('INVALID_KEY')
      }
    })

    it('throws INVALID_KEY for non-coprime multiplier (a=13)', () => {
      try {
        encrypt('HELLO', '13,5')
        expect.unreachable()
      } catch (e) {
        expect((e as CipherError).code).toBe('INVALID_KEY')
      }
    })

    it('throws INVALID_KEY for non-coprime multiplier (a=26)', () => {
      try {
        encrypt('HELLO', '26,0')
        expect.unreachable()
      } catch (e) {
        expect((e as CipherError).code).toBe('INVALID_KEY')
      }
    })

    it('accepts all 12 valid coprime multipliers', () => {
      const validA = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]
      for (const a of validA) {
        expect(() => encrypt('HELLO', `${a},8`)).not.toThrow()
      }
    })

    it('rejects invalid multipliers that share a factor with 26', () => {
      const invalidA = [2, 4, 6, 8, 10, 12, 13, 14, 16, 18, 20, 22, 24]
      for (const a of invalidA) {
        try {
          encrypt('HELLO', `${a},5`)
          expect.unreachable(`Expected INVALID_KEY for a=${a}`)
        } catch (e) {
          expect((e as CipherError).code).toBe('INVALID_KEY')
        }
      }
    })

    it('accepts negative key values (normalized mod 26)', () => {
      // -5 mod 26 = 21, which is coprime with 26
      expect(() => encrypt('HELLO', '-5,3')).not.toThrow()
    })

    it('defaults to b=0 when only multiplier is given', () => {
      // a=5, b=0: A=0->0->A, B=1->5->F
      expect(encrypt('AB', '5').output).toBe('AF')
    })
  })

  describe('input validation', () => {
    it('throws INPUT_REQUIRED on empty input', () => {
      try {
        encrypt('', '5,8')
        expect.unreachable()
      } catch (e) {
        expect((e as CipherError).code).toBe('INPUT_REQUIRED')
      }
    })

    it('throws INPUT_TOO_LONG for oversized input', () => {
      const huge = 'A'.repeat(2 * 1024 * 1024 + 1)
      try {
        encrypt(huge, '5,8')
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
      const result = encrypt('HELLO', '5,8', { instrument: true })
      expect(result.steps.length).toBeGreaterThan(0)
    })

    it('includes key setup milestone step', () => {
      const result = encrypt('HELLO', '5,8', { instrument: true })
      const milestones = result.steps.filter(s => s.isMilestone)
      expect(milestones.length).toBeGreaterThan(0)
      expect(milestones[0].label).toContain('Key setup')
    })

    it('includes substitution table step', () => {
      const result = encrypt('HELLO', '5,8', { instrument: true })
      const tableStep = result.steps.find(s => s.matrix !== undefined)
      expect(tableStep).toBeDefined()
    })

    it('produces one step per character in instrumented mode', () => {
      const result = encrypt('HELLO', '5,8', { instrument: true })
      // Should have: key setup + substitution table + 5 char steps + final = at least 8
      expect(result.steps.length).toBeGreaterThanOrEqual(8)
    })

    it('decrypt instrumented steps show inverse formula', () => {
      const result = decrypt('RCLLA', '5,8', { instrument: true })
      const keySetup = result.steps.find(s => s.isMilestone && s.label.includes('Key setup'))
      expect(keySetup).toBeDefined()
      expect(keySetup!.outputState).toContain('D(y)')
    })

    it('instrumented steps include notes for each character', () => {
      const result = encrypt('ABC', '5,8', { instrument: true })
      const charSteps = result.steps.filter(s => s.label.includes('Character'))
      for (const step of charSteps) {
        expect(step.note).toBeDefined()
        expect(step.note!.length).toBeGreaterThan(0)
      }
    })
  })

  describe('metadata', () => {
    it('reports correct metadata on encrypt', () => {
      const result = encrypt('HELLO', '5,8')
      expect(result.metadata.name).toBe('Affine Cipher')
      expect(result.metadata.securityStatus).toBe('broken')
      expect(result.metadata.standardBody).toBeDefined()
    })

    it('reports correct metadata on decrypt', () => {
      const result = decrypt('RCLLA', '5,8')
      expect(result.metadata.name).toBe('Affine Cipher')
      expect(result.metadata.securityStatus).toBe('broken')
    })

    it('includes durationMs', () => {
      const result = encrypt('HELLO', '5,8')
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
  })

  describe('edge cases', () => {
    it('handles empty alphabet range (only punctuation)', () => {
      expect(encrypt('123!@#', '5,8').output).toBe('123!@#')
    })

    it('handles single letter input', () => {
      const result = encrypt('A', '5,8')
      expect(result.output).toBe('I') // (5*0+8)%26=8 -> I
      expect(decrypt('I', '5,8').output).toBe('A')
    })

    it('handles very long input', () => {
      const longInput = 'A'.repeat(1000)
      const result = encrypt(longInput, '5,8')
      expect(result.output).toBe('I'.repeat(1000))
    })

    it('handles key with negative values that normalize correctly', () => {
      // -21 mod 26 = 5, which is coprime
      // a=5, b=-3 mod 26 = 23
      const result = encrypt('A', '-21,-3')
      expect(result.output).toBe('X') // (5*0+23)%26=23 -> X
    })

    it('handles wrapping of b value beyond 26', () => {
      // b=32 mod 26 = 6, so this is equivalent to a=5, b=6
      const result = encrypt('A', '5,32')
      expect(result.output).toBe('G') // (5*0+6)%26=6 -> G
    })

    it('handles key with extra whitespace', () => {
      expect(encrypt('HELLO', '  5  ,  8  ').output).toBe('RCLLA')
    })
  })
})
