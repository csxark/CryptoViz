import { describe, it, expect } from 'vitest'
import {
  generateCertificateHash,
  verifyCertificateHash,
  getCertificateId,
} from '../../../lib/utils/certificate'

describe('Certificate Cryptographic Utilities', () => {
  const name = 'Alice Cryptographer'
  const pathId = 'cryptography-fundamentals'
  const date = '2026-08-13'

  it('generates a consistent, deterministic hash', () => {
    const hash1 = generateCertificateHash(name, pathId, date)
    const hash2 = generateCertificateHash(name, pathId, date)
    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64)
  })

  it('verifies a valid certificate hash successfully', () => {
    const hash = generateCertificateHash(name, pathId, date)
    const isValid = verifyCertificateHash(name, pathId, date, hash)
    expect(isValid).toBe(true)
  })

  it('fails verification if name is modified', () => {
    const hash = generateCertificateHash(name, pathId, date)
    const isValid = verifyCertificateHash('Eve', pathId, date, hash)
    expect(isValid).toBe(false)
  })

  it('fails verification if pathId is modified', () => {
    const hash = generateCertificateHash(name, pathId, date)
    const isValid = verifyCertificateHash(name, 'classical-ciphers', date, hash)
    expect(isValid).toBe(false)
  })

  it('fails verification if date is modified', () => {
    const hash = generateCertificateHash(name, pathId, date)
    const isValid = verifyCertificateHash(name, pathId, '2026-08-14', hash)
    expect(isValid).toBe(false)
  })

  it('generates a readable certificate serial ID', () => {
    const hash = generateCertificateHash(name, pathId, date)
    const serial = getCertificateId(pathId, hash)
    expect(serial).toMatch(/^CV-CF-[0-9A-F]{8}$/)
  })
})
