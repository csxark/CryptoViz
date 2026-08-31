import { describe, expect, it } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/led'

describe('LED', () => {
  it('round trips LED-64', () => {
    const pt = '0001020304050607'
    const key = '0011223344556677' // 8 bytes
    const ct = encrypt(pt, key, { keySize: '64' })
    expect(decrypt(ct.output, key, { keySize: '64' }).output).toBe(pt)
  })

  it('round trips LED-128', () => {
    const pt = '0001020304050607'
    const key = '00112233445566778899aabbccddeeff' // 16 bytes
    const ct = encrypt(pt, key, { keySize: '128' })
    expect(decrypt(ct.output, key, { keySize: '128' }).output).toBe(pt)
  })

  it('rejects invalid key size', () => {
    expect(() => encrypt('0000000000000000', '0011', { keySize: '64' })).toThrow('INVALID_KEY_LENGTH')
  })
})
