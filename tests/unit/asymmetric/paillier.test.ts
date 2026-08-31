import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, homomorphicAdd, homomorphicScalarMul, TEST_VECTORS } from '@/lib/cipher/asymmetric/paillier'

describe('Paillier cryptosystem', () => {
  it('matches the verified encrypt test vector', () => {
    const v = TEST_VECTORS[0]
    expect(encrypt(v.input, v.key).output).toBe(v.expected)
  })

  it('matches the verified decrypt test vector', () => {
    const v = TEST_VECTORS[1]
    expect(decrypt(v.input, v.key).output).toBe(v.expected)
  })

  it('round-trips with a random (non-fixed) r', () => {
    const enc = encrypt('42', '221,222')
    const dec = decrypt(enc.output, '221,48,198')
    expect(dec.output).toBe('42')
  })

  it('demonstrates homomorphic addition: Dec(Enc(a)*Enc(b) mod n²) === a+b mod n', () => {
    const c1 = encrypt('15', '221,222,7').output // = 4613
    const c2 = encrypt('8', '221,222,11').output // = 30947
    const sum = homomorphicAdd(c1, c2, '221,222')
    expect(sum).toBe('45109')
    expect(decrypt(sum, '221,48,198').output).toBe('23') // 15 + 8 mod 221
  })

  it('demonstrates homomorphic scalar multiplication: Dec(Enc(a)^k mod n²) === k*a mod n', () => {
    const c1 = encrypt('15', '221,222,7').output // = 4613
    const scaled = homomorphicScalarMul(c1, '3', '221,222')
    expect(decrypt(scaled, '221,48,198').output).toBe('45') // 3 * 15 mod 221
  })

  it('rejects a negative scalar multiplier', () => {
    const c1 = encrypt('15', '221,222,7').output
    expect(() => homomorphicScalarMul(c1, '-1', '221,222')).toThrow(/non-negative/)
  })

  it('rejects a plaintext outside [0, n)', () => {
    expect(() => encrypt('9999', '221,222,7')).toThrow(/0 <= m < n/)
  })

  it('derives keys from p,q form', () => {
    const dec = decrypt('4613', '13,17')
    expect(dec.output).toBe('15')
  })

  it('verifies round-trip decryption decrypt(encrypt(m, pub), priv) === m for multiple values', () => {
    const pubKey = '221,222'
    const privKey = '221,48,198'
    const testValues = ['0', '1', '42', '100', '220']
    for (const val of testValues) {
      const encrypted = encrypt(val, pubKey)
      const decrypted = decrypt(encrypted.output, privKey)
      expect(decrypted.output).toBe(val)
    }
  })
})
