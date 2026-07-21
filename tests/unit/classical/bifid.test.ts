import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/classical/bifid'
import { CipherError } from '@/lib/utils/errors'

describe('Bifid Cipher', () => {
  it('matches known test vectors', () => {
    for (const v of TEST_VECTORS) {
      expect(encrypt(v.input, v.key).output).toBe(v.expected)
    }
  })

  it('round-trips encrypt -> decrypt', () => {
    const { output } = encrypt('HELLOWORLD', 'BIFID')
    expect(decrypt(output, 'BIFID').output).toBe('HELLOWORLD')
  })

  it('strips non-alphabetic characters before processing', () => {
    const a = encrypt('HELLO WORLD!', 'BIFID').output
    const b = encrypt('HELLOWORLD', 'BIFID').output
    expect(a).toBe(b)
  })

  it('throws INPUT_REQUIRED on empty input', () => {
    try {
      encrypt('', 'BIFID')
      expect.unreachable()
    } catch (e) {
      expect((e as CipherError).code).toBe('INPUT_REQUIRED')
    }
  })

  it('throws INPUT_TOO_LONG for oversized input', () => {
    const huge = 'A'.repeat(2 * 1024 * 1024 + 1)
    try {
      encrypt(huge, 'BIFID')
      expect.unreachable()
    } catch (e) {
      expect((e as CipherError).code).toBe('INPUT_TOO_LONG')
    }
  })

  it('throws INVALID_KEY for a keyword with no letters', () => {
    try {
      encrypt('HELLO', '1234')
      expect.unreachable()
    } catch (e) {
      expect((e as CipherError).code).toBe('INVALID_KEY')
    }
  })

  it('produces instrumented steps when requested', () => {
    const result = encrypt('HELLO', 'BIFID', { instrument: true })
    expect(result.steps.length).toBeGreaterThan(0)
  })
})
