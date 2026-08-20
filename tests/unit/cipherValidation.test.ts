import { describe, expect, it } from 'vitest'
import { CipherError } from '../../lib/utils/errors'
import {
  DEFAULT_MAX_INPUT_BYTES,
  normalizeAsciiText,
  parseAndValidateHex,
  validateKeyLength,
  validateRequiredInput,
} from '../../lib/utils/cipherValidation'

describe('cipher validation pipeline', () => {
  it('rejects empty input with INPUT_REQUIRED', () => {
    expect(() => validateRequiredInput('')).toThrowError(CipherError)
    try {
      validateRequiredInput('')
    } catch (error) {
      expect(error).toMatchObject({ code: 'INPUT_REQUIRED' })
    }
  })

  it('enforces the default 4096-byte input limit', () => {
    expect(DEFAULT_MAX_INPUT_BYTES).toBe(4096)
    expect(() => validateRequiredInput('a'.repeat(4097))).toThrowError(
      /maximum size of 4096 bytes/
    )
  })

  it('counts UTF-8 bytes rather than JavaScript code units', () => {
    expect(() => validateRequiredInput('é'.repeat(2049))).toThrowError(
      /maximum size of 4096 bytes/
    )
  })

  it('normalizes hex whitespace and returns bytes', () => {
    expect(Array.from(parseAndValidateHex('00 aa\nFF'))).toEqual([0, 170, 255])
  })

  it('rejects odd-length and invalid hex consistently', () => {
    expect(() => parseAndValidateHex('abc', undefined, 'Key')).toThrowError(
      /even number of hexadecimal characters/
    )
    expect(() => parseAndValidateHex('00xz', undefined, 'Key')).toThrowError(
      /non-hexadecimal characters/
    )
  })

  it('validates expected byte lengths', () => {
    expect(() => parseAndValidateHex('0011', 3, 'AES key')).toThrowError(
      /must be exactly 3 bytes/
    )
  })

  it('reports readable allowed key lengths', () => {
    expect(() => validateKeyLength(new Uint8Array(15), [16, 24, 32], 'AES')).toThrowError(
      /AES key must be 16, 24 or 32 bytes/
    )
  })

  it('supports ASCII normalization options', () => {
    expect(normalizeAsciiText('Vigénère-Key!', { uppercase: true, stripNonAlpha: true })).toBe('VIGNEREKEY')
    expect(normalizeAsciiText('Ab-Cd', { stripNonAlpha: true })).toBe('AbCd')
  })
})
