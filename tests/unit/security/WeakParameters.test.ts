import { describe, expect, it } from 'vitest'
import { detectWeakParameters } from '../../../lib/security/weakParameters'

const base = (cipherId: string, key: string, options: Record<string, unknown> = {}) =>
  detectWeakParameters({ cipherId, key, options, history: [] })

describe('WeakParameterDetector', () => {
  it('detects all four DES weak keys', () => {
    for (const key of [
      '0101010101010101',
      'FEFEFEFEFEFEFEFE',
      'E0E0E0E0F1F1F1F1',
      '1F1F1F1F0E0E0E0E',
    ]) {
      expect(base('des', key).map((f) => f.id)).toContain('des-weak-key')
    }
  })

  it('detects DES semi-weak keys', () => {
    expect(base('des', '01FE01FE01FE01FE').map((f) => f.id)).toContain('des-semi-weak-key')
    expect(base('des', 'FEE0FEE0FEF1FEF1').map((f) => f.id)).toContain('des-semi-weak-key')
  })

  it('detects 3DES single-key and adjacent-key degradation', () => {
    expect(base('3des', '01010101010101010101010101010101').map((f) => f.id)).toContain('3des-single-key')
    expect(base('3des', '01010101010101010202020202020202').map((f) => f.id)).toContain('3des-key-equivalence')
  })

  it('detects insecure and risky RSA exponents', () => {
    expect(base('rsa', '3233,1').map((f) => f.id)).toContain('rsa-insecure-exponent')
    expect(base('rsa', '3233,3').map((f) => f.id)).toContain('rsa-small-e')
    expect(base('rsa', '3233,4').map((f) => f.id)).toContain('rsa-even-exponent')
  })

  it('detects an all-zero ChaCha20-Poly1305 key', () => {
    const key = `${'00'.repeat(32)}|070000004041424344454647`
    expect(base('chacha20-poly1305', key).map((f) => f.id)).toContain('zero-stream-key')
  })

  it('detects AES-GCM key/IV reuse in session history', () => {
    const key = '000102030405060708090a0b0c0d0e0f'
    const finding = detectWeakParameters({
      cipherId: 'aes-gcm',
      key,
      options: { iv: '000000000000000000000000' },
      history: [{
        id: '1', cipherId: 'aes-gcm', input: 'a', key, action: 'encrypt', output: 'b',
        timestamp: 'now', parameters: { iv: '000000000000000000000000' },
      }],
    })
    expect(finding.map((f) => f.id)).toContain('aead-nonce-reuse')
  })

  it('does not flag a fresh AEAD nonce', () => {
    const finding = detectWeakParameters({
      cipherId: 'chacha20-poly1305',
      key: `${'01'.repeat(32)}|070000004041424344454647`,
      history: [{
        id: '1', cipherId: 'chacha20-poly1305', input: 'a', key: `${'01'.repeat(32)}|080000004041424344454647`, action: 'encrypt', output: 'b',
        timestamp: 'now', parameters: { nonce: '080000004041424344454647' },
      }],
    })
    expect(finding.map((f) => f.id)).not.toContain('aead-nonce-reuse')
  })
})
