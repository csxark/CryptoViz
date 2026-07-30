import { describe, it, expect } from 'vitest'
import {
  BASE32_ALPHABET,
  base32Encode,
  base32Decode,
  formatBase32,
  generateBase32Secret,
} from '@/lib/otp/base32'

const enc = (s: string) => new TextEncoder().encode(s)
const dec = (b: Uint8Array) => new TextDecoder().decode(b)

describe('BASE32_ALPHABET', () => {
  it('is the RFC 4648 §6 alphabet with no visually ambiguous characters', () => {
    expect(BASE32_ALPHABET).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567')
    expect(BASE32_ALPHABET).toHaveLength(32)
    for (const ch of '0189') {
      expect(BASE32_ALPHABET).not.toContain(ch)
    }
  })
})

describe('base32Encode — RFC 4648 §10 test vectors', () => {
  const vectors: [string, string][] = [
    ['f', 'MY======'],
    ['fo', 'MZXQ===='],
    ['foo', 'MZXW6==='],
    ['foob', 'MZXW6YQ='],
    ['fooba', 'MZXW6YTB'],
    ['foobar', 'MZXW6YTBOI======'],
  ]

  for (const [input, expected] of vectors) {
    it(`encodes "${input}" to ${expected}`, () => {
      expect(base32Encode(enc(input))).toBe(expected)
    })
  }

  it('omits padding when asked', () => {
    expect(base32Encode(enc('foobar'), false)).toBe('MZXW6YTBOI')
    expect(base32Encode(enc('f'), false)).toBe('MY')
  })

  it('encodes an empty input to an empty string', () => {
    expect(base32Encode(new Uint8Array(0))).toBe('')
  })

  it('pads every output to a multiple of 8 characters', () => {
    for (let length = 1; length <= 40; length++) {
      const encoded = base32Encode(new Uint8Array(length).fill(0xab))
      expect(encoded.length % 8).toBe(0)
    }
  })
})

describe('base32Decode — RFC 4648 §10 test vectors', () => {
  const vectors: [string, string][] = [
    ['MY======', 'f'],
    ['MZXQ====', 'fo'],
    ['MZXW6===', 'foo'],
    ['MZXW6YQ=', 'foob'],
    ['MZXW6YTB', 'fooba'],
    ['MZXW6YTBOI======', 'foobar'],
  ]

  for (const [input, expected] of vectors) {
    it(`decodes ${input} to "${expected}"`, () => {
      expect(dec(base32Decode(input))).toBe(expected)
    })
  }

  it('decodes correctly without padding', () => {
    expect(dec(base32Decode('MZXW6YTBOI'))).toBe('foobar')
  })

  it('tolerates lowercase, spaces and hyphens the way printed secrets arrive', () => {
    expect(dec(base32Decode('mzxw6ytboi'))).toBe('foobar')
    expect(dec(base32Decode('MZXW 6YTB OI'))).toBe('foobar')
    expect(dec(base32Decode('MZXW-6YTB-OI'))).toBe('foobar')
  })
})

describe('base32 round-trip', () => {
  it('round-trips every byte length from 1 to 64', () => {
    for (let length = 1; length <= 64; length++) {
      const bytes = new Uint8Array(length)
      for (let i = 0; i < length; i++) bytes[i] = (i * 37 + length) & 0xff

      expect(Array.from(base32Decode(base32Encode(bytes)))).toEqual(Array.from(bytes))
    }
  })

  it('round-trips all-zero and all-0xff payloads', () => {
    for (const fill of [0x00, 0xff]) {
      const bytes = new Uint8Array(20).fill(fill)
      expect(Array.from(base32Decode(base32Encode(bytes)))).toEqual(Array.from(bytes))
    }
  })
})

describe('base32Decode error handling', () => {
  it('throws INPUT_REQUIRED on empty input', () => {
    expect(() => base32Decode('')).toThrowError(/empty/)
    expect(() => base32Decode('====')).toThrowError(/empty/)
  })

  it('rejects characters outside the alphabet rather than silently dropping them', () => {
    // Silently skipping these would produce a wrong secret and an unexplained wrong code.
    expect(() => base32Decode('MZXW0YTB')).toThrowError(/not a valid Base32 character/)
    expect(() => base32Decode('MZXW1YTB')).toThrowError(/not a valid Base32 character/)
    expect(() => base32Decode('MZXW!YTB')).toThrowError(/not a valid Base32 character/)
  })

  it('rejects a length that cannot correspond to any whole byte count', () => {
    expect(() => base32Decode('MZX')).toThrowError(/not decodable/)
    expect(() => base32Decode('MZXW6Y')).toThrowError(/not decodable/)
  })

  it('rejects a non-string input', () => {
    // @ts-expect-error deliberately passing the wrong type to check the runtime guard
    expect(() => base32Decode(null)).toThrowError(/must be a string/)
  })
})

describe('formatBase32', () => {
  it('groups a secret into readable blocks', () => {
    expect(formatBase32('MZXW6YTBOI')).toBe('MZXW 6YTB OI')
    expect(formatBase32('MZXW6YTBOI', 5)).toBe('MZXW6 YTBOI')
  })

  it('normalises existing spacing and case first', () => {
    expect(formatBase32('mzxw-6ytb oi')).toBe('MZXW 6YTB OI')
  })
})

describe('generateBase32Secret', () => {
  it('produces a decodable secret of the requested byte length', () => {
    const secret = generateBase32Secret(20)
    expect(base32Decode(secret)).toHaveLength(20)
    expect(secret).toMatch(/^[A-Z2-7]+$/)
  })

  it('produces a different secret on each call', () => {
    const secrets = new Set(Array.from({ length: 20 }, () => generateBase32Secret()))
    expect(secrets.size).toBe(20)
  })

  it('rejects a secret shorter than the RFC 4226 §4 minimum of 128 bits', () => {
    expect(() => generateBase32Secret(15)).toThrowError(/at least 16 bytes/)
  })
})
