import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/aes-ccm'

describe('AES-CCM', () => {
  const key = '2b7e151628aed2a6abf7158809cf4f3c'
  const nonce = '000102030405060708090a0b'
  const keyWithNonce = `${key}|${nonce}`

  it('round-trips a message', () => {
    const plaintext = '48656c6c6f2c20574f524c4421' // "Hello, WORLD!"
    const enc = encrypt(plaintext, keyWithNonce)
    const dec = decrypt(enc.output, keyWithNonce)
    expect(dec.output).toBe(plaintext)
  })

  it('detects tampering in the ciphertext', () => {
    const plaintext = '48656c6c6f2c20574f524c4421'
    const enc = encrypt(plaintext, keyWithNonce)
    const tampered = enc.output.slice(0, -2) + (enc.output.slice(-2) === '00' ? '01' : '00')
    expect(() => decrypt(tampered, keyWithNonce)).toThrow(/VERIFICATION_FAILED/)
  })

  it('detects tampering in associated data', () => {
    const plaintext = '48656c6c6f'
    const aad = '0102030405'
    const enc = encrypt(plaintext, `${keyWithNonce}|${aad}`)
    expect(() => decrypt(enc.output, `${keyWithNonce}|0602030405`)).toThrow(/VERIFICATION_FAILED/)
  })

  it('rejects a nonce that is not 12 bytes', () => {
    expect(() => encrypt('001122', `${key}|0001`)).toThrow(/12-byte nonce/)
  })
})
