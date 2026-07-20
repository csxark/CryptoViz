import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/classical/four-square'

describe('Four-Square Cipher', () => {
  it.each(TEST_VECTORS)('round-trips: $description', ({ input, key, expected }) => {
    const enc = encrypt(input, key)
    expect(enc.output).toBe(expected)
  })

  it('decrypts back to the padded plaintext', () => {
    const enc = encrypt('HELPMEOBIWANKENOB', 'EXAMPLE,KEYWORD')
    const dec = decrypt(enc.output, 'EXAMPLE,KEYWORD')
    expect(dec.output).toBe('HELPMEOBIWANKENOBX')
  })

  it('pads odd-length input with X', () => {
    const enc = encrypt('HELLO', 'EXAMPLE,KEYWORD')
    expect(enc.output.length).toBe(6) // 5 letters padded to 6
  })

  it('merges J into I per the standard convention', () => {
    const enc = encrypt('JELLY', 'EXAMPLE,KEYWORD')
    const encWithI = encrypt('IELLY', 'EXAMPLE,KEYWORD')
    expect(enc.output).toBe(encWithI.output)
  })

  it('throws INVALID_KEY on malformed key (missing comma)', () => {
    expect(() => encrypt('HELLO', 'EXAMPLE')).toThrow()
  })
})
