import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/classical/nihilist'
import { CipherError } from '../../../lib/utils/errors'

describe('Nihilist Cipher', () => {
  it('matches known test vectors', () => {
    for (const v of TEST_VECTORS) {
      expect(encrypt(v.input, v.key).output).toBe(v.expected)
    }
  })

  it('round-trips encrypt -> decrypt', () => {
    const { output } = encrypt('HELLOWORLD', 'RUSSIAN,KEY')
    expect(decrypt(output, 'RUSSIAN,KEY').output).toBe('HELLOWORLD')
  })

  it('throws INPUT_REQUIRED on empty input', () => {
    try {
      encrypt('', ',KEY')
      expect.unreachable()
    } catch (e) {
      expect((e as CipherError).code).toBe('INPUT_REQUIRED')
    }
  })

  it('throws INVALID_KEY when no numeric keyword is supplied', () => {
    try {
      encrypt('HELLO', '')
      expect.unreachable()
    } catch (e) {
      expect((e as CipherError).code).toBe('INVALID_KEY')
    }
  })

  it('throws INVALID_INPUT for malformed decrypt input', () => {
    try {
      decrypt('not numbers', ',KEY')
      expect.unreachable()
    } catch (e) {
      expect((e as CipherError).code).toBe('INVALID_INPUT')
    }
  })

  it('produces instrumented steps when requested', () => {
    const result = encrypt('HELLO', ',KEY', { instrument: true })
    expect(result.steps.length).toBeGreaterThan(0)
  })

  it('rejects invalid Polybius coordinates with col === 0 with INVALID_CIPHERTEXT', () => {
    // Key ',A' has keyStream [11]. Ciphertexts 21, 31, 41, 51, 61 subtract 11 to give p = 10, 20, 30, 40, 50 (col === 0).
    const invalidCiphertexts = ['21', '31', '41', '51', '61']
    for (const ciphertext of invalidCiphertexts) {
      let err: any = null
      try {
        decrypt(ciphertext, ',A')
      } catch (e) {
        err = e
      }
      expect(err).toBeInstanceOf(CipherError)
      expect(err?.code).toBe('INVALID_CIPHERTEXT')
    }
  })

  it('rejects invalid Polybius coordinates with col > 5 with INVALID_CIPHERTEXT', () => {
    // Key ',A' has keyStream [11]. Ciphertexts 27, 37, 47, 57, 67 subtract 11 to give p = 16, 26, 36, 46, 56 (col > 5).
    const invalidCiphertexts = ['27', '37', '47', '57', '67']
    for (const ciphertext of invalidCiphertexts) {
      let err: any = null
      try {
        decrypt(ciphertext, ',A')
      } catch (e) {
        err = e
      }
      expect(err).toBeInstanceOf(CipherError)
      expect(err?.code).toBe('INVALID_CIPHERTEXT')
    }
  })

  it('rejects invalid Polybius coordinates with row > 5 with INVALID_CIPHERTEXT', () => {
    // Key ',A' has keyStream [11]. Ciphertexts 71, 72, 81, 110 subtract 11 to give p = 60, 61, 70, 99 (row > 5).
    const invalidCiphertexts = ['71', '72', '81', '110']
    for (const ciphertext of invalidCiphertexts) {
      let err: any = null
      try {
        decrypt(ciphertext, ',A')
      } catch (e) {
        err = e
      }
      expect(err).toBeInstanceOf(CipherError)
      expect(err?.code).toBe('INVALID_CIPHERTEXT')
    }
  })

  it('correctly handles valid 5x5 Polybius coordinates', () => {
    // Valid representative 5x5 coordinates after subtracting key stream
    const testPlaintext = 'ABIKTVZ'
    const enc = encrypt(testPlaintext, 'KEYWORD,KEY')
    const dec = decrypt(enc.output, 'KEYWORD,KEY')
    expect(dec.output).toBe(testPlaintext)
  })
})
