import { describe, it, expect } from 'vitest'
import { bech32Polymod, decodeBech32 } from '@/lib/validation/bech32'

describe('decodeBech32 — valid', () => {
  it('decodes a minimal bech32 string, case-insensitively', () => {
    const upper = decodeBech32('A12UEL5L')
    const lower = decodeBech32('a12uel5l')
    expect(upper).not.toBeNull()
    expect(upper?.hrp).toBe('a')
    expect(upper?.spec).toBe('bech32')
    expect(lower).toEqual(upper)
  })

  it('decodes a longer bech32 string with data words', () => {
    const r = decodeBech32('abcdef1qpzry9x8gf2tvdw0s3jn54khce6mua7lmqqqxw')
    expect(r).not.toBeNull()
    expect(r?.hrp).toBe('abcdef')
    expect(r?.spec).toBe('bech32')
    expect(r!.words.length).toBeGreaterThan(0)
  })

  it('recognizes bech32m by its distinct checksum constant', () => {
    const r = decodeBech32('A1LQFN3A')
    expect(r?.spec).toBe('bech32m')
  })

  it('distinguishes a v0 SegWit address (bech32) from v1 (bech32m)', () => {
    expect(decodeBech32('BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4')?.spec).toBe(
      'bech32'
    )
    expect(
      decodeBech32(
        'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0'
      )?.spec
    ).toBe('bech32m')
  })
})

describe('decodeBech32 — invalid', () => {
  it('rejects mixed case', () => {
    expect(decodeBech32('A12UeL5L')).toBeNull()
  })

  it('rejects a missing separator', () => {
    expect(decodeBech32('abcdefghij')).toBeNull()
  })

  it('rejects an empty HRP or too-short data', () => {
    expect(decodeBech32('1qqqqqq')).toBeNull()
    expect(decodeBech32('a1qqq')).toBeNull()
  })

  it('rejects a character outside the charset', () => {
    // 'b' is not in the bech32 charset
    expect(decodeBech32('a1bqqqqq')).toBeNull()
  })

  it('rejects a one-character checksum mutation', () => {
    expect(decodeBech32('A12UEL5M')).toBeNull()
  })

  it('rejects an overlong (>90 char) string', () => {
    expect(decodeBech32('a1' + 'q'.repeat(95))).toBeNull()
  })
})

describe('bech32Polymod', () => {
  it('is deterministic and returns 1 for the empty sequence', () => {
    expect(bech32Polymod([])).toBe(1)
    expect(bech32Polymod([1, 2, 3])).toBe(bech32Polymod([1, 2, 3]))
  })
})
