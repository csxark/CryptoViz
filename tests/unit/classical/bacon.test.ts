import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/classical/bacon'
import { CipherError } from '@/lib/utils/errors'

describe("Bacon's Cipher", () => {
  describe('encrypt()', () => {
    it('encrypts HELP correctly (standard alphabet)', () => {
      // H=7(00111)=AABBB, E=4(00100)=AABAA, L=10(01010)=ABABA, P=14(01110)=ABBBA
      expect(encrypt('HELP').output).toBe('AABBBAAAABAABAABBBA')
    })

    it('encrypts A to AAAAA', () => {
      expect(encrypt('A').output).toBe('AAAAA')
    })

    it('encrypts B to AAAAB', () => {
      expect(encrypt('B').output).toBe('AAAAB')
    })

    it('encrypts Z to BABBB', () => {
      // Z=23=10111=BABBB
      expect(encrypt('Z').output).toBe('BABBB')
    })

    it('encrypts ABC to expected pattern', () => {
      expect(encrypt('ABC').output).toBe('AAAAA AAAAB AAABA')
    })

    it('strips non-alphabetic characters', () => {
      expect(encrypt('HELLO WORLD!').output).toBe(encrypt('HELLOWORLD').output)
    })

    it('produces output of length 5 * input_letters', () => {
      expect(encrypt('HELLO').output.length).toBe(25)
      expect(encrypt('ABC').output.length).toBe(15)
    })

    it('output contains only A and B', () => {
      const result = encrypt('CRYPTOGRAPHY').output
      expect(result).toMatch(/^[AB\s]+$/)
    })

    it('preserves distinct encoding for different letters', () => {
      const results = new Set<string>()
      for (let c = 65; c <= 90; c++) {
        const letter = String.fromCharCode(c)
        results.add(encrypt(letter).output)
      }
      // All 26 letters should produce different encodings (24 unique in standard)
      expect(results.size).toBeGreaterThanOrEqual(24)
    })

    it('supports extended (26-letter) mode via key', () => {
      const extResult = encrypt('I', 'extended').output
      const stdResult = encrypt('I', '').output
      // In standard mode, I and J share the same code (ABAAA)
      // In extended mode, I has a unique code
      expect(extResult).not.toBe(stdResult)
    })
  })

  describe('decrypt()', () => {
    it('decrypts AABBBAAAABAABAABBBA back to HELP', () => {
      expect(decrypt('AABBBAAAABAABAABBBA').output).toBe('HELP')
    })

    it('decrypts AAAAA back to A', () => {
      expect(decrypt('AAAAA').output).toBe('A')
    })

    it('decrypts AAAAB back to B', () => {
      expect(decrypt('AAAAB').output).toBe('B')
    })

    it('decrypts BABBB back to Z', () => {
      expect(decrypt('BABBB').output).toBe('Z')
    })

    it('decrypts with spaces between blocks', () => {
      expect(decrypt('AAAAA AAAAB AAABA').output).toBe('ABC')
    })

    it('throws on non-multiple-of-5 input', () => {
      try {
        decrypt('AAAA')
        expect.unreachable()
      } catch (e) {
        expect((e as CipherError).code).toBe('INVALID_INPUT')
      }
    })

    it('throws on empty input after cleaning', () => {
      try {
        decrypt('123')
        expect.unreachable()
      } catch (e) {
        expect((e as CipherError).code).toBe('INVALID_INPUT')
      }
    })

    it('supports extended mode decryption', () => {
      // In extended mode, I and J have different codes
      const iCode = encrypt('I', 'extended').output
      const jCode = encrypt('J', 'extended').output
      expect(iCode).not.toBe(jCode)
      expect(decrypt(iCode, 'extended').output).toBe('I')
      expect(decrypt(jCode, 'extended').output).toBe('J')
    })
  })

  describe('round-trip encrypt -> decrypt', () => {
    it('round-trips simple text', () => {
      const { output } = encrypt('HELLO')
      expect(decrypt(output).output).toBe('HELLO')
    })

    it('round-trips full alphabet', () => {
      const { output } = encrypt('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
      expect(decrypt(output).output).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    })

    it('round-trips single letter', () => {
      const { output } = encrypt('X')
      expect(decrypt(output).output).toBe('X')
    })

    it('round-trips repeated letters', () => {
      const { output } = encrypt('AAAA')
      expect(decrypt(output).output).toBe('AAAA')
    })

    it('round-trips extended mode', () => {
      const { output } = encrypt('IJUV', 'extended')
      expect(decrypt(output, 'extended').output).toBe('IJUV')
    })

    it('round-trips long text', () => {
      const input = 'THEQUICKBROWNFOX'
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

    it('throws INVALID_INPUT for input with no valid letters', () => {
      try {
        encrypt('123!@#')
        expect.unreachable()
      } catch (e) {
        expect((e as CipherError).code).toBe('INVALID_INPUT')
      }
    })
  })

  describe('instrumented steps', () => {
    it('produces steps when instrument is true', () => {
      const result = encrypt('HELP', '', { instrument: true })
      expect(result.steps.length).toBeGreaterThan(0)
    })

    it('includes key setup milestone', () => {
      const result = encrypt('HELP', '', { instrument: true })
      const milestones = result.steps.filter(s => s.isMilestone)
      expect(milestones.length).toBeGreaterThan(0)
      expect(milestones[0].label).toContain('Key setup')
    })

    it('includes encoding table', () => {
      const result = encrypt('A', '', { instrument: true })
      const tableStep = result.steps.find(s => s.matrix !== undefined)
      expect(tableStep).toBeDefined()
    })

    it('decrypt instrumented shows grouping step', () => {
      const result = decrypt('AABBB', '', { instrument: true })
      const groupStep = result.steps.find(s => s.label.includes('Group'))
      expect(groupStep).toBeDefined()
    })

    it('produces per-bit steps in encrypt', () => {
      const result = encrypt('AB', '', { instrument: true })
      // A=AAAAA, B=AAAAB = 10 bits total → should have 10 bit steps
      const bitSteps = result.steps.filter(s => s.label.includes('Bit'))
      expect(bitSteps.length).toBe(10)
    })

    it('produces per-block steps in decrypt', () => {
      const result = decrypt('AAAAA AAAAB', '', { instrument: true })
      const blockSteps = result.steps.filter(s => s.label.includes('Block'))
      expect(blockSteps.length).toBe(2) // A and B
    })
  })

  describe('metadata', () => {
    it('reports correct metadata', () => {
      const result = encrypt('HELLO')
      expect(result.metadata.name).toBe("Bacon's Cipher")
      expect(result.metadata.securityStatus).toBe('broken')
      expect(result.metadata.yearDesigned).toBe(1623)
    })

    it('includes durationMs', () => {
      const result = encrypt('HELLO')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('reports steganographic category in table', () => {
      const result = encrypt('A', '', { instrument: true })
      const setupTable = result.steps[0].table
      expect(setupTable).toBeDefined()
      const typeEntry = setupTable!.find(t => t.key === 'Cipher type')
      expect(typeEntry!.value).toContain('Steganographic')
    })
  })

  describe('TEST_VECTORS', () => {
    it('has test vectors defined', () => {
      expect(TEST_VECTORS.length).toBeGreaterThan(0)
    })

    it('matches known test vectors', () => {
      for (const v of TEST_VECTORS) {
        const { output } = encrypt(v.input)
        expect(output).toBe(v.expected)
      }
    })
  })

  describe('steganographic properties', () => {
    it('output length is always 5x the input letter count', () => {
      for (const word of ['A', 'AB', 'HELP', 'CRYPTOGRAPHY']) {
        const { output } = encrypt(word)
        const letterCount = word.replace(/[^A-Z]/gi, '').length
        // Output may contain spaces between blocks in some formats
        const symbolCount = output.replace(/\s/g, '').length
        expect(symbolCount).toBe(letterCount * 5)
      }
    })

    it('different plaintexts produce different ciphertexts', () => {
      const a = encrypt('ABC').output
      const b = encrypt('DEF').output
      expect(a).not.toBe(b)
    })

    it('standard mode merges I/J and U/V', () => {
      // I and J should produce the same code in standard mode
      const iResult = encrypt('I').output.replace(/\s/g, '')
      const jResult = encrypt('J').output.replace(/\s/g, '')
      expect(iResult).toBe(jResult)
    })

    it('extended mode distinguishes I from J', () => {
      const iResult = encrypt('I', 'extended').output
      const jResult = encrypt('J', 'extended').output
      expect(iResult).not.toBe(jResult)
    })
  })
})
