import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, homomorphicAdd, TEST_VECTORS } from '@/lib/cipher/asymmetric/paillier'

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

  it('rejects a plaintext outside [0, n)', () => {
    expect(() => encrypt('9999', '221,222,7')).toThrow(/0 <= m < n/)
  })

  it('derives keys from p,q form', () => {
    const dec = decrypt('4613', '13,17')
    expect(dec.output).toBe('15')
  })
})
