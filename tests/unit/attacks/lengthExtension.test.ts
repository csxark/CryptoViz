import { describe, it, expect } from 'vitest'
import { sha256Hex, computeMdPadding, VulnerableMac, forgeLengthExtension } from '@/lib/attacks/lengthExtension'

const enc = (s: string) => new TextEncoder().encode(s)

describe('sha256Hex (internal core)', () => {
  it('matches NIST vector for "abc"', () => {
    expect(sha256Hex(enc('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    )
  })

  it('matches NIST vector for empty input', () => {
    expect(sha256Hex(enc(''))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    )
  })

  it('matches for a multi-block input (>55 bytes triggers extra padding block)', () => {
    const msg = 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'
    expect(sha256Hex(enc(msg))).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'
    )
  })
})

describe('computeMdPadding', () => {
  it('produces a total length that is a multiple of 64 bytes', () => {
    for (const len of [0, 1, 55, 56, 57, 63, 64, 65, 119, 120, 121, 1000]) {
      const padding = computeMdPadding(len)
      expect((len + padding.length) % 64).toBe(0)
    }
  })

  it('starts with 0x80 and ends with the 64-bit big-endian bit length', () => {
    const padding = computeMdPadding(3)
    expect(padding[0]).toBe(0x80)
    const bitLen = padding.slice(-8)
    expect(Array.from(bitLen)).toEqual([0, 0, 0, 0, 0, 0, 0, 24])
  })
})

describe('VulnerableMac', () => {
  it('verifies its own signatures', () => {
    const mac = new VulnerableMac(enc('sup3r-s3cr3t'))
    const msg = enc('amount=10&to=alice')
    const sig = mac.sign(msg)
    expect(mac.verify(msg, sig)).toBe(true)
    expect(mac.verify(enc('amount=9999&to=eve'), sig)).toBe(false)
  })
})

describe('forgeLengthExtension', () => {
  it('produces a forged message the vulnerable oracle accepts, without ever seeing the secret', () => {
    const secret = enc('sup3r-s3cr3t') // 12 bytes — attacker only *guesses* this length
    const oracle = new VulnerableMac(secret)
    const message = enc('amount=10&to=alice')
    const leakedMac = oracle.sign(message)

    const appendData = enc('&admin=true')
    const { forgedMessage, forgedHashHex } = forgeLengthExtension(
      leakedMac,
      secret.length,
      message,
      appendData
    )

    expect(oracle.verify(forgedMessage, forgedHashHex)).toBe(true)

    const text = new TextDecoder().decode(forgedMessage)
    expect(text.startsWith('amount=10&to=alice')).toBe(true)
    expect(text.endsWith('&admin=true')).toBe(true)
  })

  it('fails to verify against the real oracle when the secret-length guess is wrong', () => {
    const secret = enc('sup3r-s3cr3t')
    const oracle = new VulnerableMac(secret)
    const message = enc('amount=10&to=alice')
    const leakedMac = oracle.sign(message)

    const { forgedMessage, forgedHashHex } = forgeLengthExtension(
      leakedMac,
      secret.length + 3, // wrong guess
      message,
      enc('&admin=true')
    )

    expect(oracle.verify(forgedMessage, forgedHashHex)).toBe(false)
  })

  it('rejects a malformed MAC hex string', () => {
    expect(() =>
      forgeLengthExtension('not-hex', 12, enc('a'), enc('b'))
    ).toThrowError(/64 hex/)
  })
})
