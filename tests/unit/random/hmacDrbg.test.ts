import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { HmacDrbg, toHex, MAX_BYTES_PER_REQUEST } from '../../../lib/random/hmacDrbg'

const hexToBytes = (hex: string): Uint8Array => {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

describe('HMAC_DRBG (SHA-256) — NIST SP 800-90A known-answer', () => {
  // NIST DRBGVS: HMAC_DRBG SHA-256, PredictionResistance=False, no reseed,
  // empty personalization / additional input. Two Generate calls; the second is
  // the ReturnedBits.
  const ENTROPY = 'ca851911349384bffe89de1cbdc46e6831e44d34a4fb935ee285dd14b71a7488'
  const NONCE = '659ba96c601dc69fc902940805ec0ca8'
  const RETURNED_BITS =
    'e528e9abf2dece54d47c7e75e5fe302149f817ea9fb4bee6f4199697d04d5b89' +
    'd54fbb978a15b5c443c9ec21036d2460b6f73ebad0dc2aba6e624abf07745bc1' +
    '07694bb7547bb0995f70de25d6b29e2d3011bb19d27676c07162c8b5ccde0668' +
    '961df86803482cb37ed6d5c0bb8d50cf1f50d476aa0458bdaba806f48be9dcb8'

  it('reproduces the NIST ReturnedBits from the second Generate call', () => {
    const drbg = new HmacDrbg(hexToBytes(ENTROPY), hexToBytes(NONCE))
    drbg.generate(128) // first call, discarded
    const out = drbg.generate(128)
    expect(toHex(out)).toBe(RETURNED_BITS)
  })
})

describe('HMAC_DRBG — behavior', () => {
  const entropy = hexToBytes('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff')
  const nonce = hexToBytes('0011223344556677')

  it('is deterministic: the same seed reproduces the same stream', () => {
    const a = new HmacDrbg(entropy, nonce)
    const b = new HmacDrbg(entropy, nonce)
    expect(toHex(a.generate(64))).toBe(toHex(b.generate(64)))
  })

  it('a different nonce yields a different stream', () => {
    const a = new HmacDrbg(entropy, hexToBytes('0000000000000000'))
    const b = new HmacDrbg(entropy, hexToBytes('1111111111111111'))
    expect(toHex(a.generate(32))).not.toBe(toHex(b.generate(32)))
  })

  it('reseeding changes the subsequent stream', () => {
    const a = new HmacDrbg(entropy, nonce)
    const b = new HmacDrbg(entropy, nonce)
    b.reseed(hexToBytes('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'))
    expect(toHex(a.generate(32))).not.toBe(toHex(b.generate(32)))
  })

  it('successive Generate calls produce different (advancing) output', () => {
    const drbg = new HmacDrbg(entropy, nonce)
    const first = toHex(drbg.generate(32))
    const second = toHex(drbg.generate(32))
    expect(first).not.toBe(second)
  })

  it('records a step trace including instantiate and generate transitions', () => {
    const drbg = new HmacDrbg(entropy, nonce)
    drbg.generate(16)
    expect(drbg.steps.length).toBeGreaterThanOrEqual(4)
    expect(drbg.steps[0].label).toMatch(/instantiate/i)
    expect(drbg.steps.every((s) => s.K.length === 64 && s.V.length === 64)).toBe(true)
  })

  it('property: output length always matches the request', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 512 }), (n) => {
        const drbg = new HmacDrbg(entropy, nonce)
        return drbg.generate(n).length === n
      }),
      { numRuns: 50 },
    )
  })

  it('rejects an over-large single request and non-positive requests', () => {
    const drbg = new HmacDrbg(entropy, nonce)
    expect(() => drbg.generate(MAX_BYTES_PER_REQUEST + 1)).toThrow(/exceed/i)
    expect(() => drbg.generate(0)).toThrow(/positive/i)
  })

  it('rejects too-little entropy at instantiation', () => {
    expect(() => new HmacDrbg(new Uint8Array(4), nonce)).toThrow(/entropy/i)
  })
})
