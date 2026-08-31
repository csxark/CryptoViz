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

  it('throws INVALID_OPTION for period <= 0 or non-integer period (#1725)', () => {
    const invalidPeriods = [0, -1, -5, 0.5, NaN]
    for (const p of invalidPeriods) {
      expect(() => encrypt('HELLOWORLD', 'BIFID', { period: p })).toThrowError(CipherError)
      expect(() => decrypt('HELLOWORLD', 'BIFID', { period: p })).toThrowError(CipherError)
    }
  })

  it('supports periodic Bifid encryption and decryption', () => {
    const text = 'DEFENDTHEEASTWALL'
    const key = 'BIFID'
    const options = { period: 5 }

    const enc = encrypt(text, key, options)
    const dec = decrypt(enc.output, key, options)
    expect(dec.output).toBe(text)
  })

  it('supports periodic Bifid key string notation ("KEY,PERIOD")', () => {
    const text = 'ATTACKATDAWN'
    const keyWithPeriod = 'BIFID,4'

    const enc = encrypt(text, keyWithPeriod)
    const dec = decrypt(enc.output, keyWithPeriod)
    expect(dec.output).toBe(text)
  })
})
