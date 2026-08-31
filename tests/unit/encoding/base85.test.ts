import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { toBase85, fromBase85 } from '@/lib/encoding/base85'

const enc = (s: string) => new TextEncoder().encode(s)
const dec = (b: Uint8Array) => new TextDecoder().decode(b)

describe('toBase85', () => {
  it('encodes the canonical "Man " vector', () => {
    expect(toBase85(enc('Man '))).toBe('9jqo^')
  })

  it('encodes empty input as an empty string', () => {
    expect(toBase85(new Uint8Array(0))).toBe('')
  })
})

describe('fromBase85', () => {
  it('decodes the canonical vector back to "Man "', () => {
    expect(dec(fromBase85('9jqo^'))).toBe('Man ')
  })

  it('decodes an empty string to zero bytes', () => {
    expect(fromBase85('')).toHaveLength(0)
  })

  it('ignores interior and trailing whitespace', () => {
    expect(fromBase85('9jq o^\n')).toEqual(fromBase85('9jqo^'))
  })

  it('throws on an out-of-range character', () => {
    expect(() => fromBase85('9jqo~')).toThrow()
  })

  it('throws on a truncated single trailing character', () => {
    expect(() => fromBase85('9')).toThrow()
  })
})

describe('round-trip', () => {
  it.each(['M', 'Ma', 'Man'])('preserves byte length for partial group %j', (s) => {
    // Array.from normalizes both sides: TextEncoder output is not deep-equal to
    // a plain Uint8Array under vitest even with identical bytes.
    expect(Array.from(fromBase85(toBase85(enc(s))))).toEqual(Array.from(enc(s)))
  })

  it('round-trips arbitrary byte arrays (property)', () => {
    fc.assert(
      fc.property(fc.uint8Array(), (bytes) => {
        expect(fromBase85(toBase85(bytes))).toEqual(bytes)
      })
    )
  })
})
