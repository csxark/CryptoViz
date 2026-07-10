import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/hash/sha256'
import { CipherError } from '../../../lib/utils/errors'

describe('SHA-256 Hash Unit Tests', () => {
  it('passes standard test vectors (encrypt)', () => {
    for (const vector of TEST_VECTORS) {
      const result = encrypt(vector.input, vector.key)
      expect(result.output).toBe(vector.expected)
    }
  })

  it('throws on decrypt', () => {
    expect(() => decrypt('ba7816bf8f01cfea414140de5dae2ec73b00361bbef0469121e4364702f79d7b')).toThrowError(
      CipherError
    )
  })

  it('generates correct step count in instrumented mode', () => {
    const result = encrypt('abc', '', { instrument: true })
    // SHA-256 instrumented steps = 72
    expect(result.steps.length).toBe(72)
    expect(result.steps[0].label).toBe('Preprocessing - padding')
    expect(result.steps[1].label).toBe('Message schedule W[0..15]')
    expect(result.steps[5].label).toBe('Initialize working variables')
    expect(result.steps[70].label).toBe('Add to hash state')
    expect(result.steps[71].label).toBe('Final hash output')
  })

  // TODO: skipped — encrypt() doesn't validate >4096 byte input yet, tracked in #110
  it.skip('validates input limit (> 4096 bytes)', () => {
    const longInput = 'a'.repeat(4097)
    expect(() => encrypt(longInput)).toThrowError(CipherError)
  })
})
