import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/hash/siphash'
import { CipherError } from '../../../lib/utils/errors'

describe('SipHash PRF Unit Tests', () => {
  it('passes standard test vectors (encrypt)', () => {
    for (const vector of TEST_VECTORS) {
      const result = encrypt(vector.input, vector.key)
      expect(result.output).toBe(vector.expected)
    }
  })

  it('throws on decrypt', () => {
    expect(() => decrypt('310e0edd47db6f72')).toThrowError(CipherError)
  })

  it('generates correct step count in instrumented mode', () => {
    // Empty input: 1 initialization step + 1 padding/chunking step + 1 block v3 XOR + 2 rounds + 1 block v0 XOR + 1 finalization setup step + 4 final rounds + 1 final tag step = 12 steps
    const result = encrypt('', '000102030405060708090a0b0c0d0e0f', { instrument: true })
    expect(result.steps.length).toBe(12)
    expect(result.steps[0].label).toBe('State Initialization')
    expect(result.steps[1].label).toBe('Padding & Chunking')
    expect(result.steps[2].label).toBe('Block m_0 — Inject to v3')
    expect(result.steps[3].label).toBe('Block m_0 — SipRound 1/2')
    expect(result.steps[4].label).toBe('Block m_0 — SipRound 2/2')
    expect(result.steps[5].label).toBe('Block m_0 — Inject to v0')
    expect(result.steps[6].label).toBe('Finalization Setup')
    expect(result.steps[7].label).toBe('Finalization — SipRound 1/4')
    expect(result.steps[11].label).toBe('Final Tag Generation')
  })

  it('validates key length', () => {
    // Key is less than 16 bytes
    expect(() => encrypt('abc', 'short')).toThrowError(CipherError)
    // Key is more than 16 bytes
    expect(() => encrypt('abc', '000102030405060708090a0b0c0d0e0f10')).toThrowError(CipherError)
  })

  it('validates input limit (> 2 MB shared limit)', () => {
    const longInput = 'a'.repeat(2 * 1024 * 1024 + 1)
    expect(() => encrypt(longInput, '000102030405060708090a0b0c0d0e0f')).toThrowError(CipherError)
  })
})
