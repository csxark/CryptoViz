import { describe, it, expect } from 'vitest'
import { encrypt as hkdfEncrypt, decrypt as hkdfDecrypt, TEST_VECTORS } from '../../../lib/cipher/hash/hkdf'
import { CipherError } from '../../../lib/utils/errors'

describe('HKDF Cipher Engine (RFC 5869)', () => {
  it('passes RFC 5869 Test Case 1 (SHA-256)', () => {
    const vector = TEST_VECTORS[0]
    const res = hkdfEncrypt(vector.input, vector.key, {
      hash: 'SHA-256',
      keyLength: 42,
      info: 'f0f1f2f3f4f5f6f7f8f9',
    })
    expect(res.output).toBe(vector.expected)
  })

  it('passes RFC 5869 Test Case 2 (SHA-256 long inputs)', () => {
    const vector = TEST_VECTORS[1]
    const res = hkdfEncrypt(vector.input, vector.key, {
      hash: 'SHA-256',
      keyLength: 82,
      info: 'b0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f',
    })
    expect(res.output).toBe(vector.expected)
  })

  it('passes RFC 5869 Test Case 3 (SHA-256 zero-salt)', () => {
    const vector = TEST_VECTORS[2]
    const res = hkdfEncrypt(vector.input, vector.key, {
      hash: 'SHA-256',
      keyLength: 42,
      info: '',
    })
    expect(res.output).toBe(vector.expected)
  })

  it('derives correctly with SHA-512', () => {
    const res = hkdfEncrypt('secret-ikm', 'salt-value', {
      hash: 'SHA-512',
      keyLength: 64,
      info: 'custom-info',
    })
    expect(res.output).toHaveLength(128) // 64 bytes hex
  })

  it('derives correctly with SHA-1', () => {
    const res = hkdfEncrypt('secret-ikm', 'salt-value', {
      hash: 'SHA-1',
      keyLength: 20,
      info: 'custom-info',
    })
    expect(res.output).toHaveLength(40) // 20 bytes hex
  })

  it('populates instrumented trace steps when instrument=true', () => {
    const res = hkdfEncrypt('secret-ikm', 'salt-value', {
      hash: 'SHA-256',
      keyLength: 42,
      info: 'context-info',
      instrument: true,
    })

    expect(res.steps.length).toBeGreaterThan(0)
    expect(res.steps[0].label).toContain('Input & Salt')
    expect(res.steps[1].label).toContain('HKDF-Extract')
    expect(res.steps[2].label).toContain('HKDF-Expand Setup')
    expect(res.steps[res.steps.length - 1].label).toContain('OKM Truncation')
  })

  it('throws CipherError for invalid key lengths', () => {
    expect(() =>
      hkdfEncrypt('ikm', 'salt', { keyLength: 0 })
    ).toThrow(CipherError)

    expect(() =>
      hkdfEncrypt('ikm', 'salt', { keyLength: 255 * 32 + 1 })
    ).toThrow(CipherError)
  })

  it('throws CipherError on decrypt call', () => {
    expect(() => hkdfDecrypt()).toThrow(CipherError)
  })
})
