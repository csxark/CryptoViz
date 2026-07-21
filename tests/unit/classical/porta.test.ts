import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/classical/porta'
import { CipherError } from '@/lib/utils/errors'

describe('Porta Cipher', () => {
  it('matches known test vectors', () => {
    for (const v of TEST_VECTORS) {
      expect(encrypt(v.input, v.key).output).toBe(v.expected)
    }
  })

  it('is reciprocal: decrypting == re-encrypting with the same key', () => {
    const { output } = encrypt('HELP', 'KEY')
    expect(decrypt(output, 'KEY').output).toBe('HELP')
    expect(encrypt(output, 'KEY').output).toBe('HELP')
  })

  it('throws INPUT_REQUIRED on empty input', () => {
    try {
      encrypt('', 'KEY')
      expect.unreachable()
    } catch (e) {
      expect((e as CipherError).code).toBe('INPUT_REQUIRED')
    }
  })

  it('throws INVALID_KEY for empty/non-letter key', () => {
    try {
      encrypt('HELLO', '123')
      expect.unreachable()
    } catch (e) {
      expect((e as CipherError).code).toBe('INVALID_KEY')
    }
  })

  it('passes non-alphabetic characters through unchanged', () => {
    const { output } = encrypt('HI, THERE!', 'KEY')
    expect(output).toContain(',')
    expect(output).toContain('!')
  })

  it('produces instrumented steps when requested', () => {
    const result = encrypt('HELLO', 'KEY', { instrument: true })
    expect(result.steps.length).toBeGreaterThan(0)
  })
})
