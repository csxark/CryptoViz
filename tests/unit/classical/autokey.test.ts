import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/classical/autokey'
import { CipherError } from '@/lib/utils'

describe('Autokey Vigenère', () => {
  it.each(TEST_VECTORS)('matches known vector: $description', ({ input, key, expected }) => {
    expect(encrypt(input, key).output).toBe(expected)
  })

  it('round-trips when input is longer than the key', () => {
    const key = 'QUEENLY'
    const pt = 'ATTACKATDAWNANDATNIGHTFOLLOWEDBYRETREAT'
    const ct = encrypt(pt, key)
    expect(decrypt(ct.output, key).output).toBe(pt)
  })

  it('round-trips when input is shorter than the key', () => {
    const key = 'QUEENLY'
    const pt = 'HI'
    const ct = encrypt(pt, key)
    expect(decrypt(ct.output, key).output).toBe(pt)
  })

  it('diverges from standard Vigenère once input exceeds key length', () => {
    // sanity check — not a hard assertion against vigenere.ts, just documents intent
    const ct = encrypt('ATTACKATDAWN', 'QUEENLY')
    expect(ct.output).toBe('QNXEPVYTWTWP')
  })

  it('throws INVALID_KEY on empty key', () => {
    expect(() => encrypt('HELLO', '')).toThrow(CipherError)
  })

  it('throws INPUT_REQUIRED on empty input', () => {
    expect(() => encrypt('', 'QUEENLY')).toThrow(CipherError)
  })
})
