import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  ff1Encrypt,
  ff1Decrypt,
  stringToNumerals,
  numeralsToString,
  parseTweak,
  ALPHABETS,
} from '../../../../lib/cipher/fpe/ff1'

const hexToBytes = (hex: string): Uint8Array => {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

// NIST SP 800-38G FF1 sample vectors (AES-128 key).
const KEY = hexToBytes('2B7E151628AED2A6ABF7158809CF4F3C')

describe('FF1 — NIST SP 800-38G sample vectors', () => {
  it('sample 1: radix 10, empty tweak', () => {
    const pt = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    const { output } = ff1Encrypt(KEY, 10, new Uint8Array(0), pt)
    expect(output.join('')).toBe('2433477484')
  })

  it('sample 2: radix 10, non-empty tweak', () => {
    const pt = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    const tweak = hexToBytes('39383736353433323130')
    const { output } = ff1Encrypt(KEY, 10, tweak, pt)
    expect(output.join('')).toBe('6124200773')
  })

  it('sample 3: radix 36, non-empty tweak', () => {
    const alpha = ALPHABETS.alphanumericLower
    const pt = stringToNumerals('0123456789abcdefghi', alpha)
    const tweak = hexToBytes('3737373770717273373737')
    const { output } = ff1Encrypt(KEY, 36, tweak, pt)
    expect(numeralsToString(output, alpha)).toBe('a9tv40mll9kdu509eum')
  })

  it('decrypts each sample back to the original', () => {
    const alpha = ALPHABETS.alphanumericLower
    expect(ff1Decrypt(KEY, 10, new Uint8Array(0), [2, 4, 3, 3, 4, 7, 7, 4, 8, 4]).output.join('')).toBe('0123456789')
    expect(
      ff1Decrypt(KEY, 10, hexToBytes('39383736353433323130'), [6, 1, 2, 4, 2, 0, 0, 7, 7, 3]).output.join(''),
    ).toBe('0123456789')
    const ct3 = stringToNumerals('a9tv40mll9kdu509eum', alpha)
    expect(numeralsToString(ff1Decrypt(KEY, 36, hexToBytes('3737373770717273373737'), ct3).output, alpha)).toBe(
      '0123456789abcdefghi',
    )
  })
})

describe('FF1 — properties', () => {
  it('round-trips and preserves format for arbitrary decimal inputs and tweaks', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 3, maxLength: 20 }),
        fc.uint8Array({ minLength: 0, maxLength: 12 }),
        (numerals, tweak) => {
          const ct = ff1Encrypt(KEY, 10, tweak, numerals).output
          // Format preservation: same length, every symbol still a valid numeral.
          expect(ct).toHaveLength(numerals.length)
          expect(ct.every((d) => d >= 0 && d < 10)).toBe(true)
          const pt = ff1Decrypt(KEY, 10, tweak, ct).output
          expect(pt).toEqual(numerals)
        },
      ),
      { numRuns: 60 },
    )
  })

  it('a different tweak generally yields a different ciphertext', () => {
    const pt = stringToNumerals('4111111111111111', ALPHABETS.decimal) // a card-shaped input
    const a = ff1Encrypt(KEY, 10, parseTweak('00'), pt).output
    const b = ff1Encrypt(KEY, 10, parseTweak('01'), pt).output
    expect(a.join('')).not.toBe(b.join(''))
    // Both remain valid 16-digit numbers.
    expect(a).toHaveLength(16)
    expect(b).toHaveLength(16)
  })

  it('produces a 10-round Feistel trace', () => {
    const { steps } = ff1Encrypt(KEY, 10, new Uint8Array(0), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(steps).toHaveLength(10)
    expect(steps[0].round).toBe(0)
    expect(steps[9].round).toBe(9)
  })
})

describe('FF1 — validation', () => {
  it('rejects inputs that are too short for the radix (radix^n < 100)', () => {
    // radix 10, length 1 -> 10 < 100.
    expect(() => ff1Encrypt(KEY, 10, new Uint8Array(0), [5])).toThrow(/at least 100|too short/i)
  })

  it('rejects numerals outside the radix', () => {
    expect(() => ff1Encrypt(KEY, 10, new Uint8Array(0), [0, 1, 2, 99])).toThrow(/numeral/i)
  })

  it('rejects an invalid key length', () => {
    expect(() => ff1Encrypt(new Uint8Array(10), 10, new Uint8Array(0), [0, 1, 2])).toThrow(/key/i)
  })

  it('parseTweak handles empty and hex strings', () => {
    expect(parseTweak('')).toHaveLength(0)
    expect(Array.from(parseTweak('39383736'))).toEqual([0x39, 0x38, 0x37, 0x36])
    expect(() => parseTweak('xyz')).toThrow()
  })
})
