import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/asymmetric/rabin'

describe('Rabin cryptosystem', () => {
  it('matches the verified encrypt test vector', () => {
    const v = TEST_VECTORS[0]
    expect(encrypt(v.input, v.key).output).toBe(v.expected)
  })

  it('matches the verified decrypt test vector (all four roots)', () => {
    const v = TEST_VECTORS[1]
    expect(decrypt(v.input, v.key).output).toBe(v.expected)
  })

  it('round trip: original plaintext is among the four decrypted roots', () => {
    const m = '66'
    const enc = encrypt(m, '437')
    const roots = decrypt(enc.output, '19,23').output.split(',')
    expect(roots).toContain(m)
    expect(roots).toHaveLength(4)
  })

  it('rejects p not congruent to 3 mod 4', () => {
    expect(() => decrypt('423', '17,23')).toThrow(/≡ 3 \(mod 4\)/)
  })

  it('rejects q not congruent to 3 mod 4', () => {
    expect(() => decrypt('423', '19,29')).toThrow(/≡ 3 \(mod 4\)/)
  })

  it('rejects a plaintext outside [0, n)', () => {
    expect(() => encrypt('9999', '437')).toThrow(/0 <= m < n/)
  })
})
