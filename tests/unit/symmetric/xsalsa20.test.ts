import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/xsalsa20'

describe('XSalsa20', () => {
  const key = '1b27556473e985d462cd51197a9a46c76009549eac6474f206c4ee0844f68389'.slice(0, 64)
  const nonce = '69696ee955b62b73cd62bda875fc73d68219e0036b7a0b37'.slice(0, 48)
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
