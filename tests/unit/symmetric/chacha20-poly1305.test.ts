import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/chacha20-poly1305'

describe('ChaCha20-Poly1305 AEAD', () => {
  const key = '808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f'
  const nonce = '070000004041424344454647'
  const keyStr = `${key}|${nonce}`

  it('round-trips a message', () => {
    const plaintext = '4c6164696573'
    const enc = encrypt(plaintext, keyStr)
    const dec = decrypt(enc.output, keyStr)
    expect(dec.output).toBe(plaintext)
  })

  it('detects a tampered ciphertext', () => {
    const enc = encrypt('4c6164696573', keyStr)
    const [ct, tag] = enc.output.split('|')
    const tamperedCt = ct.slice(0, -2) + (ct.slice(-2) === '00' ? '01' : '00')
    expect(() => decrypt(`${tamperedCt}|${tag}`, keyStr)).toThrow(/tag verification failed/)
  })

  it('detects a tampered associated data', () => {
    const aad = '50515253c0c1c2c3c4c5c6c7'
    const enc = encrypt('4c6164696573', `${keyStr}|${aad}`)
    expect(() => decrypt(enc.output, `${keyStr}|50515253c0c1c2c3c4c5c6c8`)).toThrow(/tag verification failed/)
  })

  it('matches the RFC 8439 Section 2.8.2 official test vector', () => {
    const v = TEST_VECTORS[0]
    const res = encrypt(v.input, v.key)
    expect(res.output).toBe(v.expected)
  })

  it('produces an instrumented trace with milestones', () => {
    const result = encrypt('4c6164696573', keyStr, { instrument: true })
    expect(result.steps.length).toBeGreaterThan(0)
    expect(result.steps.some(s => s.isMilestone)).toBe(true)
    expect(result.steps[0].label).toContain('Poly1305 key')
  })
})
