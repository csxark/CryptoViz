import { describe, it, expect } from 'vitest'
import { describePbkdf2Stages, estimateOfflineCrackYears, OWASP_MIN_ITERATIONS } from '@/lib/kdf/pbkdf2Trace'

describe('describePbkdf2Stages', () => {
  it('produces 5 descriptive stages including password, salt, iterations, OWASP check, and truncation', () => {
    const steps = describePbkdf2Stages({
      passwordLength: 12,
      saltHex: 'a1b2c3d4e5f60718',
      iterations: 600_000,
      hash: 'SHA-256',
      keyLength: 32,
    })
    expect(steps).toHaveLength(5)
    expect(steps.map((s) => s.label)).toEqual([
      'Import password as key material',
      'Combine with salt',
      'Run 600,000 HMAC-SHA-256 rounds',
      'Iteration count vs. OWASP guidance',
      'Truncate to requested key length',
    ])
  })

  it('flags iteration counts below the OWASP floor', () => {
    const steps = describePbkdf2Stages({
      passwordLength: 8,
      saltHex: 'aa',
      iterations: 10_000,
      hash: 'SHA-256',
      keyLength: 32,
    })
    const owaspStep = steps.find((s) => s.label.includes('OWASP'))
    expect(owaspStep?.detail).toContain('below the OWASP 2023 floor')
  })

  it('confirms iteration counts meeting the OWASP floor', () => {
    const steps = describePbkdf2Stages({
      passwordLength: 8,
      saltHex: 'aa',
      iterations: OWASP_MIN_ITERATIONS['SHA-256'],
      hash: 'SHA-256',
      keyLength: 32,
    })
    const owaspStep = steps.find((s) => s.label.includes('OWASP'))
    expect(owaspStep?.detail).toContain('meets or exceeds')
  })
})

describe('estimateOfflineCrackYears', () => {
  it('increases with iteration count for a fixed keyspace', () => {
    const low = estimateOfflineCrackYears(1_000, 2 ** 40)
    const high = estimateOfflineCrackYears(600_000, 2 ** 40)
    expect(high).toBeGreaterThan(low)
  })

  it('returns a finite non-negative number', () => {
    const years = estimateOfflineCrackYears(600_000, 2 ** 32)
    expect(Number.isFinite(years)).toBe(true)
    expect(years).toBeGreaterThanOrEqual(0)
  })
})
