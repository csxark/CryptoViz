import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/classical/nihilist'
import { CipherError } from '@/lib/utils/errors'

describe('Nihilist Cipher', () => {
  it('matches known test vectors', () => {
    for (const v of TEST_VECTORS) {
      expect(encrypt(v.input, v.key).output).toBe(v.expected)
    }
  })

  it('round-trips encrypt -> decrypt', () => {
    const { output } = encrypt('HELLOWORLD', 'RUSSIAN,KEY')
    expect(decrypt(output, 'RUSSIAN,KEY').output).toBe('HELLOWORLD')
  })

  it('throws INPUT_REQUIRED on empty input', () => {
    try {
      encrypt('', ',KEY')
      expect.unreachable()
    } catch (e) {
      expect((e as CipherError).code).toBe('INPUT_REQUIRED')
    }
  })

  it('throws INVALID_KEY when no numeric keyword is supplied', () => {
    try {
      encrypt('HELLO', '')
      expect.unreachable()
    } catch (e) {
      expect((e as CipherError).code).toBe('INVALID_KEY')
    }
  })

  it('throws INVALID_INPUT for malformed decrypt input', () => {
    try {
      decrypt('not numbers', ',KEY')
      expect.unreachable()
    } catch (e) {
      expect((e as CipherError).code).toBe('INVALID_INPUT')
    }
  })

  it('produces instrumented steps when requested', () => {
    const result = encrypt('HELLO', ',KEY', { instrument: true })
    expect(result.steps.length).toBeGreaterThan(0)
  })
})
