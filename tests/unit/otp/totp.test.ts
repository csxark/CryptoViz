import { describe, it, expect } from 'vitest'
import {
  DEFAULT_PERIOD,
  generateTotp,
  generateTotpFast,
  generateTotpInstrumented,
  otpauthUri,
  secondsRemaining,
  stepStartTime,
  timeStepFor,
  verifyTotp,
} from '@/lib/otp/totp'
import { base32Encode } from '@/lib/otp/base32'

const b32 = (ascii: string) => base32Encode(new TextEncoder().encode(ascii), false)

/**
 * RFC 6238 Appendix B seeds. The specification uses a 20-byte seed for SHA-1,
 * a 32-byte seed for SHA-256 and a 64-byte seed for SHA-512 — each is the
 * ASCII digits repeated to the hash's block-appropriate length.
 */
const SEED_SHA1 = b32('12345678901234567890')
const SEED_SHA256 = b32('12345678901234567890123456789012')
const SEED_SHA512 = b32('1234567890123456789012345678901234567890123456789012345678901234')

/** RFC 6238 Appendix B — [unix time, SHA-1, SHA-256, SHA-512], all 8 digits. */
const RFC6238_VECTORS: [number, string, string, string][] = [
  [59, '94287082', '46119246', '90693936'],
  [1111111109, '07081804', '68084774', '25091201'],
  [1111111111, '14050471', '67062674', '99943326'],
  [1234567890, '89005924', '91819424', '93441116'],
  [2000000000, '69279037', '90698825', '38618901'],
  [20000000000, '65353130', '77737706', '47863826'],
]

describe('timeStepFor', () => {
  it('implements T = floor((unixTime − T0) / X)', () => {
    expect(timeStepFor(0)).toBe(0)
    expect(timeStepFor(29)).toBe(0)
    expect(timeStepFor(30)).toBe(1)
    expect(timeStepFor(59)).toBe(1)
    expect(timeStepFor(60)).toBe(2)
  })

  it('honours a custom period and epoch offset', () => {
    expect(timeStepFor(120, 60)).toBe(2)
    expect(timeStepFor(120, 30, 60)).toBe(2)
  })

  it('matches the counters implied by the RFC 6238 vectors', () => {
    expect(timeStepFor(59)).toBe(1)
    expect(timeStepFor(1111111109)).toBe(37037036)
    expect(timeStepFor(20000000000)).toBe(666666666)
  })

  it('rejects invalid timing parameters', () => {
    expect(() => timeStepFor(100, 0)).toThrowError(/positive integer/)
    expect(() => timeStepFor(100, -30)).toThrowError(/positive integer/)
    expect(() => timeStepFor(10, 30, 100)).toThrowError(/precedes the epoch offset/)
    expect(() => timeStepFor(Number.NaN)).toThrowError(/finite number/)
  })
})

describe('stepStartTime / secondsRemaining', () => {
  it('reports the window a code is valid for', () => {
    expect(stepStartTime(1)).toBe(30)
    expect(stepStartTime(2, 60)).toBe(120)
  })

  it('counts down within a step and resets at the boundary', () => {
    expect(secondsRemaining(0)).toBe(30)
    expect(secondsRemaining(1)).toBe(29)
    expect(secondsRemaining(29)).toBe(1)
    expect(secondsRemaining(30)).toBe(30)
  })

  it('never reports zero or more than the period', () => {
    for (let t = 0; t < 300; t++) {
      const left = secondsRemaining(t)
      expect(left).toBeGreaterThan(0)
      expect(left).toBeLessThanOrEqual(DEFAULT_PERIOD)
    }
  })
})

describe('generateTotpFast — RFC 6238 Appendix B', () => {
  for (const [time, sha1, sha256, sha512] of RFC6238_VECTORS) {
    it(`t=${time} produces the specified SHA-1, SHA-256 and SHA-512 codes`, () => {
      expect(generateTotpFast(SEED_SHA1, time, { digits: 8, algorithm: 'SHA1' })).toBe(sha1)
      expect(generateTotpFast(SEED_SHA256, time, { digits: 8, algorithm: 'SHA256' })).toBe(sha256)
      expect(generateTotpFast(SEED_SHA512, time, { digits: 8, algorithm: 'SHA512' })).toBe(sha512)
    })
  }

  it('produces the same code everywhere inside one time step', () => {
    const codes = new Set(
      [30, 35, 40, 45, 50, 55, 59].map((t) => generateTotpFast(SEED_SHA1, t, { digits: 8 }))
    )
    expect(codes.size).toBe(1)
  })

  it('produces a different code once the step rolls over', () => {
    expect(generateTotpFast(SEED_SHA1, 59, { digits: 8 })).not.toBe(
      generateTotpFast(SEED_SHA1, 60, { digits: 8 })
    )
  })

  it('honours a custom period', () => {
    // t=29 and t=30 straddle a 30s boundary but sit inside the same 60s step.
    expect(generateTotpFast(SEED_SHA1, 29, { period: 60 })).toBe(
      generateTotpFast(SEED_SHA1, 30, { period: 60 })
    )
    expect(generateTotpFast(SEED_SHA1, 29)).not.toBe(generateTotpFast(SEED_SHA1, 30))
  })
})

describe('generateTotpInstrumented', () => {
  it('matches the fast path and prepends the time-derivation step', () => {
    const result = generateTotpInstrumented(SEED_SHA1, 59, { digits: 8 })

    expect(result.code).toBe('94287082')
    expect(result.code).toBe(generateTotpFast(SEED_SHA1, 59, { digits: 8 }))
    expect(result.steps[0].label).toMatch(/Derive the counter from the clock/)
    expect(result.steps.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('reports the timing window around the code', () => {
    const result = generateTotpInstrumented(SEED_SHA1, 45)

    expect(result.timeStep).toBe(1)
    expect(result.stepStart).toBe(30)
    expect(result.stepEnd).toBe(60)
    expect(result.secondsRemaining).toBe(15)
    expect(result.unixSeconds).toBe(45)
    expect(result.period).toBe(DEFAULT_PERIOD)
  })

  it('reuses the HOTP counter, so T is literally the HOTP counter', () => {
    const result = generateTotpInstrumented(SEED_SHA1, 1111111109)
    expect(result.counter).toBe(result.timeStep)
    expect(result.counter).toBe(37037036)
  })
})

describe('generateTotp dispatch', () => {
  it('skips the trace when instrument is false but returns the same code', () => {
    const fast = generateTotp(SEED_SHA1, 59, { digits: 8, instrument: false })
    const traced = generateTotp(SEED_SHA1, 59, { digits: 8 })

    expect(fast.code).toBe('94287082')
    expect(fast.code).toBe(traced.code)
    expect(fast.steps).toHaveLength(0)
    expect(fast.timeStep).toBe(traced.timeStep)
  })
})

describe('verifyTotp', () => {
  it('accepts the current code with zero drift', () => {
    const result = verifyTotp(SEED_SHA1, '94287082', 59, { digits: 8 })

    expect(result.valid).toBe(true)
    expect(result.delta).toBe(0)
    expect(result.driftSeconds).toBe(0)
    expect(result.matchedStep).toBe(1)
  })

  it('accepts a code from the previous step and reports negative drift', () => {
    // Code minted at t=59 (step 1), submitted at t=65 (step 2).
    const result = verifyTotp(SEED_SHA1, '94287082', 65, { digits: 8, window: 1 })

    expect(result.valid).toBe(true)
    expect(result.delta).toBe(-1)
    expect(result.driftSeconds).toBe(-30)
  })

  it('accepts a code from the next step when the client clock runs fast', () => {
    const futureCode = generateTotpFast(SEED_SHA1, 95, { digits: 8 })
    const result = verifyTotp(SEED_SHA1, futureCode, 65, { digits: 8, window: 1 })

    expect(result.valid).toBe(true)
    expect(result.delta).toBe(1)
    expect(result.driftSeconds).toBe(30)
  })

  it('rejects a code once drift exceeds the window', () => {
    // Two steps of skew with a one-step window.
    const result = verifyTotp(SEED_SHA1, '94287082', 125, { digits: 8, window: 1 })
    expect(result.valid).toBe(false)
    expect(result.driftSeconds).toBeNull()
  })

  it('accepts that same code once the window is widened', () => {
    const result = verifyTotp(SEED_SHA1, '94287082', 125, { digits: 8, window: 3 })
    expect(result.valid).toBe(true)
    expect(result.delta).toBe(-3)
    expect(result.driftSeconds).toBe(-90)
  })

  it('searches outward so the smallest drift wins', () => {
    const result = verifyTotp(SEED_SHA1, '94287082', 65, { digits: 8, window: 3 })
    // Step 2 first, then 1 and 3, then 0 and 4 — nearest first.
    expect(result.searched[0]).toBe(2)
    expect(result.searched[1]).toBe(1)
    expect(result.matchedStep).toBe(1)
  })

  it('rejects a wrong code regardless of window size', () => {
    expect(verifyTotp(SEED_SHA1, '00000000', 59, { digits: 8, window: 5 }).valid).toBe(false)
  })

  it('tolerates whitespace in a pasted code', () => {
    expect(verifyTotp(SEED_SHA1, '9428 7082', 59, { digits: 8 }).valid).toBe(true)
  })

  it('rejects a negative window', () => {
    expect(() => verifyTotp(SEED_SHA1, '94287082', 59, { window: -1 })).toThrowError(
      /non-negative integer/
    )
  })
})

describe('otpauthUri', () => {
  it('builds a provisioning URI an authenticator app can consume', () => {
    const uri = otpauthUri({
      secret: 'JBSWY3DPEHPK3PXP',
      account: 'alice@example.com',
      issuer: 'CryptoViz',
    })

    expect(uri.startsWith('otpauth://totp/CryptoViz:alice%40example.com?')).toBe(true)
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP')
    expect(uri).toContain('issuer=CryptoViz')
    expect(uri).toContain('algorithm=SHA1')
    expect(uri).toContain('digits=6')
    expect(uri).toContain('period=30')
  })

  it('normalises a spaced secret and reflects non-default parameters', () => {
    const uri = otpauthUri({
      secret: 'jbsw y3dp ehpk 3pxp',
      account: 'bob@example.com',
      issuer: 'Test Issuer',
      digits: 8,
      period: 60,
      algorithm: 'SHA256',
    })

    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP')
    expect(uri).toContain('digits=8')
    expect(uri).toContain('period=60')
    expect(uri).toContain('algorithm=SHA256')
    expect(uri).toContain('Test+Issuer')
  })

  it('requires an account and an issuer', () => {
    expect(() => otpauthUri({ secret: 'AAAA', account: '', issuer: 'X' })).toThrowError(
      /account label is required/
    )
    expect(() => otpauthUri({ secret: 'AAAA', account: 'a@b.c', issuer: '' })).toThrowError(
      /issuer is required/
    )
  })
})
