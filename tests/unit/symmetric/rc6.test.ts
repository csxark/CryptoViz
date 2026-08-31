import { describe, it, expect } from 'vitest'
import {
  encrypt,
  decrypt,
  encryptRc6,
  decryptRc6,
  rc6,
  encryptRc6Block,
  decryptRc6Block,
  traceRc6Encryption,
  assertHexLength,
  generateRc6Subkeys,
  rc6ImplementationNotes,
  TEST_VECTORS,
} from '@/lib/cipher/symmetric/rc6'
import { isCryptoVizError, CipherError } from '@/lib/utils/errors'

describe('RC6-32/20/16', () => {
  it('matches the published test vector', () => {
    const v = TEST_VECTORS[0]
    const result = encrypt(v.input, v.key)
    expect(result.output).toBe(v.expected)
  })

  it('round-trips arbitrary 16-byte-aligned input', () => {
    const key = '000102030405060708090a0b0c0d0e0f'
    const plaintext = '48656c6c6f20776f726c6421202020202020202020202020202020'.slice(0, 32)
    const enc = encrypt(plaintext, key)
    const dec = decrypt(enc.output, key)
    expect(dec.output).toBe(plaintext)
  })

  it('rejects a key that is not 128 bits with CipherError', () => {
    try {
      encrypt('00000000000000000000000000000000'.slice(0, 32), '00'.repeat(8))
      expect.fail('Should have thrown')
    } catch (err) {
      expect(isCryptoVizError(err)).toBe(true)
      expect(err).toBeInstanceOf(CipherError)
      if (err instanceof CipherError) {
        expect(err.code).toBe('INVALID_KEY')
        expect(err.message).toMatch(/128-bit key/)
      }
    }
  })

  it('rejects input that is missing with CipherError', () => {
    try {
      encrypt('', '000102030405060708090a0b0c0d0e0f')
      expect.fail('Should have thrown')
    } catch (err) {
      expect(isCryptoVizError(err)).toBe(true)
      expect(err).toBeInstanceOf(CipherError)
      if (err instanceof CipherError) {
        expect(err.code).toBe('INPUT_REQUIRED')
      }
    }
  })

  it('rejects input that is not a multiple of 16 bytes with CipherError', () => {
    try {
      encrypt('00112233', '000102030405060708090a0b0c0d0e0f')
      expect.fail('Should have thrown')
    } catch (err) {
      expect(isCryptoVizError(err)).toBe(true)
      expect(err).toBeInstanceOf(CipherError)
      if (err instanceof CipherError) {
        expect(err.code).toBe('INVALID_INPUT')
        expect(err.message).toMatch(/32 hexadecimal/)
      }
    }
  })

  it('rejects non-hex input with CipherError', () => {
    try {
      encrypt('zz'.repeat(16), '000102030405060708090a0b0c0d0e0f')
      expect.fail('Should have thrown')
    } catch (err) {
      expect(isCryptoVizError(err)).toBe(true)
      expect(err).toBeInstanceOf(CipherError)
      if (err instanceof CipherError) {
        expect(err.code).toBe('INVALID_INPUT')
      }
    }
  })

  it('verifies CipherError on decrypt validation errors', () => {
    try {
      decrypt('', '000102030405060708090a0b0c0d0e0f')
    } catch (err) {
      expect(isCryptoVizError(err)).toBe(true)
      expect((err as CipherError).code).toBe('INPUT_REQUIRED')
    }

    try {
      decrypt('00000000000000000000000000000000', 'invalidkey')
    } catch (err) {
      expect(isCryptoVizError(err)).toBe(true)
      expect((err as CipherError).code).toBe('INVALID_KEY')
    }

    try {
      decrypt('invalidhexblock', '000102030405060708090a0b0c0d0e0f')
    } catch (err) {
      expect(isCryptoVizError(err)).toBe(true)
      expect((err as CipherError).code).toBe('INVALID_INPUT')
    }
  })

  it('verifies CipherError across internal helper assertion functions', () => {
    try {
      assertHexLength('', 32, 'RC6 block')
    } catch (err) {
      expect(isCryptoVizError(err)).toBe(true)
      expect((err as CipherError).code).toBe('INPUT_REQUIRED')
    }

    try {
      assertHexLength('1234567890ABCDEF1234567890ABCDEG', 32, 'RC6 block')
    } catch (err) {
      expect(isCryptoVizError(err)).toBe(true)
      expect((err as CipherError).code).toBe('INVALID_INPUT')
    }

    try {
      assertHexLength('1234', 32, 'RC6 block')
    } catch (err) {
      expect(isCryptoVizError(err)).toBe(true)
      expect((err as CipherError).code).toBe('INVALID_INPUT')
    }
  })

  it('verifies CipherError in encryptRc6 and decryptRc6 APIs', () => {
    try {
      encryptRc6('00000000000000000000000000000000')
    } catch (err) {
      expect(isCryptoVizError(err)).toBe(true)
      expect((err as CipherError).code).toBe('INVALID_KEY')
    }

    try {
      decryptRc6({ key: '000102030405060708090a0b0c0d0e0f' })
    } catch (err) {
      expect(isCryptoVizError(err)).toBe(true)
      expect((err as CipherError).code).toBe('INPUT_REQUIRED')
    }

    try {
      rc6({ key: '000102030405060708090a0b0c0d0e0f', mode: 'encrypt' })
    } catch (err) {
      expect(isCryptoVizError(err)).toBe(true)
      expect((err as CipherError).code).toBe('INPUT_REQUIRED')
    }
  })

  it('produces an instrumented trace with per-block steps', () => {
    const key = '000102030405060708090a0b0c0d0e0f'
    const result = encrypt('00000000000000000000000000000000'.slice(0, 32), key, { instrument: true })
    expect(result.steps.length).toBeGreaterThan(1)
    expect(result.steps[0].label).toMatch(/Round 1/)
  })

  it('handles block level functions and subkey generation correctly', () => {
    const key = '00000000000000000000000000000000'
    const pt = '00000000000000000000000000000000'
    const subkeys = generateRc6Subkeys(key, 20)
    expect(subkeys.length).toBe(44)

    const ct = encryptRc6Block(pt, key, { rounds: 20 })
    expect(ct).toBe('8FC3A53656B1F778C129DF4E9848A41E')

    const recovered = decryptRc6Block(ct, key, { rounds: 20 })
    expect(recovered).toBe(pt)

    const trace = traceRc6Encryption(pt, key, { rounds: 20 })
    expect(trace.roundTrace.length).toBe(20)
    expect(trace.ciphertextHex).toBe('8FC3A53656B1F778C129DF4E9848A41E')

    const notes = rc6ImplementationNotes()
    expect(notes.length).toBeGreaterThan(0)
  })
})