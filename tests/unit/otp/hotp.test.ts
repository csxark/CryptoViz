import { describe, it, expect } from 'vitest'
import {
  counterToBytes,
  decodeSecret,
  dynamicTruncate,
  generateHotp,
  generateHotpFast,
  generateHotpInstrumented,
  verifyHotp,
} from '@/lib/otp/hotp'
import { base32Encode } from '@/lib/otp/base32'

/** RFC 4226 Appendix D secret: the ASCII string "12345678901234567890". */
const RFC4226_SECRET_ASCII = '12345678901234567890'
const RFC4226_SECRET_BASE32 = base32Encode(new TextEncoder().encode(RFC4226_SECRET_ASCII), false)

/** RFC 4226 Appendix D — HOTP values for counters 0 through 9. */
const RFC4226_VECTORS = [
  '755224',
  '287082',
  '359152',
  '969429',
  '338314',
  '254676',
  '287922',
  '162583',
  '399871',
  '520489',
]

describe('counterToBytes', () => {
  it('encodes the counter as 8 big-endian bytes', () => {
    expect(Array.from(counterToBytes(0))).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
    expect(Array.from(counterToBytes(1))).toEqual([0, 0, 0, 0, 0, 0, 0, 1])
    expect(Array.from(counterToBytes(255))).toEqual([0, 0, 0, 0, 0, 0, 0, 255])
    expect(Array.from(counterToBytes(256))).toEqual([0, 0, 0, 0, 0, 0, 1, 0])
  })

  it('stays exact above 2^32, where a 32-bit shift would overflow', () => {
    // 0x01_00_00_00_00 = 4294967296
    expect(Array.from(counterToBytes(4294967296))).toEqual([0, 0, 0, 1, 0, 0, 0, 0])
    // The largest time step in RFC 6238's own vectors: 666666666 = 0x27BC86AA.
    expect(Array.from(counterToBytes(666666666))).toEqual([0, 0, 0, 0, 0x27, 0xbc, 0x86, 0xaa])
  })

  it('rejects negative, fractional and unsafe counters', () => {
    expect(() => counterToBytes(-1)).toThrowError(/non-negative integer/)
    expect(() => counterToBytes(1.5)).toThrowError(/non-negative integer/)
    expect(() => counterToBytes(Number.MAX_SAFE_INTEGER + 2)).toThrowError(/safe integer/)
  })
})

describe('dynamicTruncate — RFC 4226 §5.4 worked example', () => {
  it('reproduces the offset and 31-bit value from the specification', () => {
    // The digest printed in RFC 4226 §5.4.
    const mac = Uint8Array.from([
      0x1f, 0x86, 0x98, 0x69, 0x0e, 0x02, 0xca, 0x16, 0x61, 0x85, 0x50, 0xef, 0x7f, 0x19, 0xda,
      0x8e, 0x94, 0x5b, 0x55, 0x5a,
    ])

    const { offset, value } = dynamicTruncate(mac)

    // Last byte 0x5a → low nibble 0xa = 10.
    expect(offset).toBe(10)
    // Bytes 10..13 are 50 ef 7f 19 → 0x50ef7f19, high bit already clear.
    expect(value).toBe(0x50ef7f19)
    expect(value % 1000000).toBe(872921)
  })

  it('clears the top bit so the value is always a positive 31-bit integer', () => {
    const mac = new Uint8Array(20).fill(0xff)
    const { offset, value } = dynamicTruncate(mac)

    expect(offset).toBe(15)
    expect(value).toBe(0x7fffffff)
    expect(value).toBeGreaterThan(0)
  })

  it('rejects a digest shorter than 20 bytes', () => {
    expect(() => dynamicTruncate(new Uint8Array(19))).toThrowError(/at least 20 HMAC bytes/)
  })
})

describe('generateHotpFast — RFC 4226 Appendix D', () => {
  RFC4226_VECTORS.forEach((expected, counter) => {
    it(`counter ${counter} produces ${expected}`, () => {
      expect(generateHotpFast(RFC4226_SECRET_BASE32, counter)).toBe(expected)
    })
  })

  it('accepts the same secret expressed as ASCII or hex', () => {
    const asAscii = generateHotpFast(RFC4226_SECRET_ASCII, 0, { secretEncoding: 'ascii' })
    const asHex = generateHotpFast('3132333435363738393031323334353637383930', 0, {
      secretEncoding: 'hex',
    })

    expect(asAscii).toBe('755224')
    expect(asHex).toBe('755224')
  })

  it('honours the requested digit count', () => {
    expect(generateHotpFast(RFC4226_SECRET_BASE32, 0, { digits: 8 })).toHaveLength(8)
    expect(generateHotpFast(RFC4226_SECRET_BASE32, 0, { digits: 8 })).toBe('84755224')
    expect(generateHotpFast(RFC4226_SECRET_BASE32, 0, { digits: 10 })).toHaveLength(10)
  })

  it('zero-pads a short code rather than returning fewer digits', () => {
    // Scan for a counter whose truncated value is small enough to need padding.
    let padded: string | null = null
    for (let counter = 0; counter < 3000 && padded === null; counter++) {
      const code = generateHotpFast(RFC4226_SECRET_BASE32, counter, { digits: 10 })
      if (code.startsWith('0')) padded = code
    }

    expect(padded).not.toBeNull()
    expect(padded).toHaveLength(10)
  })
})

describe('generateHotpInstrumented', () => {
  it('returns the same code as the fast path for every Appendix D vector', () => {
    RFC4226_VECTORS.forEach((expected, counter) => {
      const result = generateHotpInstrumented(RFC4226_SECRET_BASE32, counter)
      expect(result.code).toBe(expected)
      expect(result.code).toBe(generateHotpFast(RFC4226_SECRET_BASE32, counter))
    })
  })

  it('traces every RFC step with sequential indices', () => {
    const result = generateHotpInstrumented(RFC4226_SECRET_BASE32, 0)

    expect(result.steps).toHaveLength(6)
    expect(result.steps.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5])
    expect(result.steps[0].label).toMatch(/Decode the shared secret/)
    expect(result.steps[3].label).toMatch(/Dynamic truncation/)
  })

  it('exposes the intermediate state the visualizer needs', () => {
    const result = generateHotpInstrumented(RFC4226_SECRET_BASE32, 1)

    expect(result.counterHex).toBe('0000000000000001')
    expect(result.hmacHex).toMatch(/^[0-9a-f]{40}$/)
    expect(result.offset).toBeGreaterThanOrEqual(0)
    expect(result.offset).toBeLessThanOrEqual(15)
    expect(result.dynamicBinaryCode).toBeGreaterThanOrEqual(0)
    expect(result.dynamicBinaryCode).toBeLessThanOrEqual(0x7fffffff)
    expect(result.algorithm).toBe('SHA1')
    expect(result.digits).toBe(6)
  })

  it('produces a longer digest for SHA-256 and SHA-512', () => {
    expect(
      generateHotpInstrumented(RFC4226_SECRET_BASE32, 0, { algorithm: 'SHA256' }).hmacHex
    ).toHaveLength(64)
    expect(
      generateHotpInstrumented(RFC4226_SECRET_BASE32, 0, { algorithm: 'SHA512' }).hmacHex
    ).toHaveLength(128)
  })
})

describe('generateHotp dispatch', () => {
  it('skips the trace when instrument is false but returns the same code', () => {
    const fast = generateHotp(RFC4226_SECRET_BASE32, 5, { instrument: false })
    const traced = generateHotp(RFC4226_SECRET_BASE32, 5)

    expect(fast.code).toBe('254676')
    expect(fast.code).toBe(traced.code)
    expect(fast.steps).toHaveLength(0)
    expect(traced.steps.length).toBeGreaterThan(0)
  })
})

describe('verifyHotp — RFC 4226 §7.4 resynchronization', () => {
  it('accepts the code at the expected counter with zero drift', () => {
    const result = verifyHotp(RFC4226_SECRET_BASE32, '755224', 0)

    expect(result.valid).toBe(true)
    expect(result.matchedCounter).toBe(0)
    expect(result.delta).toBe(0)
    expect(result.searched).toEqual([0])
  })

  it('resynchronises when the token counter has run ahead', () => {
    // The user pressed the button five extra times without submitting.
    const result = verifyHotp(RFC4226_SECRET_BASE32, '254676', 0, 10)

    expect(result.valid).toBe(true)
    expect(result.matchedCounter).toBe(5)
    expect(result.delta).toBe(5)
  })

  it('rejects a code that drifted beyond the look-ahead window', () => {
    const result = verifyHotp(RFC4226_SECRET_BASE32, '520489', 0, 3)

    expect(result.valid).toBe(false)
    expect(result.matchedCounter).toBeNull()
    expect(result.searched).toEqual([0, 1, 2, 3])
  })

  it('never accepts a counter behind the expected one', () => {
    const result = verifyHotp(RFC4226_SECRET_BASE32, '755224', 5, 10)
    expect(result.valid).toBe(false)
  })

  it('tolerates whitespace in a pasted code', () => {
    expect(verifyHotp(RFC4226_SECRET_BASE32, '755 224', 0).valid).toBe(true)
  })

  it('rejects an invalid window', () => {
    expect(() => verifyHotp(RFC4226_SECRET_BASE32, '755224', 0, -1)).toThrowError(
      /non-negative integer/
    )
  })
})

describe('decodeSecret', () => {
  it('decodes each supported encoding to the same bytes', () => {
    const fromBase32 = decodeSecret(RFC4226_SECRET_BASE32, 'base32')
    const fromAscii = decodeSecret(RFC4226_SECRET_ASCII, 'ascii')
    const fromHex = decodeSecret('3132333435363738393031323334353637383930', 'hex')

    expect(Array.from(fromBase32)).toEqual(Array.from(fromAscii))
    expect(Array.from(fromHex)).toEqual(Array.from(fromAscii))
    expect(fromAscii).toHaveLength(20)
  })

  it('rejects an empty secret', () => {
    expect(() => decodeSecret('', 'base32')).toThrowError(/shared secret is required/)
  })

  it('rejects malformed hex', () => {
    expect(() => decodeSecret('abc', 'hex')).toThrowError(/even number of characters/)
    expect(() => decodeSecret('zzzz', 'hex')).toThrowError(/non-hexadecimal/)
  })

  it('rejects an unknown encoding', () => {
    // @ts-expect-error deliberately passing an unsupported encoding
    expect(() => decodeSecret('ABCD', 'base58')).toThrowError(/Unknown secret encoding/)
  })
})

describe('option validation', () => {
  it('rejects a digit count outside the supported range', () => {
    expect(() => generateHotpFast(RFC4226_SECRET_BASE32, 0, { digits: 5 })).toThrowError(
      /between 6 and 10/
    )
    expect(() => generateHotpFast(RFC4226_SECRET_BASE32, 0, { digits: 11 })).toThrowError(
      /between 6 and 10/
    )
  })

  it('rejects an unsupported hash algorithm', () => {
    expect(() =>
      // @ts-expect-error deliberately passing an unsupported algorithm
      generateHotpFast(RFC4226_SECRET_BASE32, 0, { algorithm: 'MD5' })
    ).toThrowError(/Unsupported OTP algorithm/)
  })
})
