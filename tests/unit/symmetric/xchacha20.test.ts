import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/xchacha20'

describe('XChaCha20', () => {
  const key = '808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e'
  const nonce = '404142434445464748494a4b4c4d4e4f5051525354555657'.slice(0, 48)
  const keyStr = `${key}|${nonce}`

  it('round-trips: decrypt(encrypt(x)) === x', () => {
    const plaintext = '4c6164696573'
    const enc = encrypt(plaintext, keyStr)
    const dec = decrypt(enc.output, keyStr)
    expect(dec.output).toBe(plaintext)
  })

  it('different nonces (same key) produce unrelated keystreams', () => {
    const zero = '00'.repeat(32)
    const otherNonce = '01'.repeat(24)
    const a = encrypt(zero, keyStr).output
    const b = encrypt(zero, `${key}|${otherNonce}`).output
    expect(a).not.toBe(b)
  })

  it('rejects a nonce that is not 192 bits', () => {
    expect(() => encrypt('00112233', `${key}|0011`)).toThrow(/192-bit/)
  })

  it('rejects a key that is not 256 bits', () => {
    expect(() => encrypt('00112233', `00|${nonce}`)).toThrow(/256-bit key/)
  })
})
