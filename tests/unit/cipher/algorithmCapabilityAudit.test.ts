/**
 * Algorithm Capability Audit Test Suite (Phase 6)
 *
 * Verifies that algorithms are classified with their true cryptographic operations:
 * - Ed25519: sign / verify (RFC 8032)
 * - SPHINCS+: sign / verify (FIPS 205)
 * - Falcon: sign / verify
 * - Lamport/WOTS: sign / verify (One-time signature)
 * - LMS: sign / verify (RFC 8554)
 * - ML-KEM: kem-encapsulate / kem-decapsulate (FIPS 203)
 * - X25519: key-agreement (RFC 7748)
 * - HKDF: kdf (RFC 5869)
 * - scrypt: kdf (RFC 7914)
 * - Shamir Secret Sharing: split / combine
 */

import { describe, it, expect } from 'vitest'
import { getAlgorithmCapability, ALGORITHM_CAPABILITIES } from '../../../lib/cipher/operationTaxonomy'
import { CIPHER_REGISTRY } from '../../../lib/cipher/registry'

describe('Algorithm Capability & Semantic Operation Audit (Phase 6)', () => {
  const REQUIRED_AUDIT_IDS = [
    { id: 'ed25519', expectedOp: 'sign', expectedOps: ['sign', 'verify'] },
    { id: 'sphincs-plus', expectedOp: 'sign', expectedOps: ['sign', 'verify'] },
    { id: 'falcon', expectedOp: 'sign', expectedOps: ['sign', 'verify'] },
    { id: 'lamport', expectedOp: 'sign', expectedOps: ['sign', 'verify'] },
    { id: 'wots', expectedOp: 'sign', expectedOps: ['sign', 'verify'] },
    { id: 'lms', expectedOp: 'sign', expectedOps: ['sign', 'verify'] },
    { id: 'ml-kem', expectedOp: 'kem-encapsulate', expectedOps: ['kem-encapsulate', 'kem-decapsulate'] },
    { id: 'x25519', expectedOp: 'key-agreement', expectedOps: ['key-agreement'] },
    { id: 'hkdf', expectedOp: 'kdf', expectedOps: ['kdf'] },
    { id: 'scrypt', expectedOp: 'kdf', expectedOps: ['kdf'] },
    { id: 'shamir-secret-sharing', expectedOp: 'split', expectedOps: ['split', 'combine'] },
  ]

  for (const { id, expectedOp, expectedOps } of REQUIRED_AUDIT_IDS) {
    it(`correctly classifies ${id} as ${expectedOp} (not generic encrypt/decrypt)`, () => {
      const cap = getAlgorithmCapability(id, 'asymmetric')
      expect(cap.primaryOperation, `${id} primary operation must be ${expectedOp}`).toBe(expectedOp)

      for (const op of expectedOps) {
        expect(cap.supportedOperations, `${id} must support operation ${op}`).toContain(op)
      }

      // Assert that signatures and KEMs are NOT classified as encrypt
      if (expectedOp !== 'encrypt') {
        expect(cap.primaryOperation).not.toBe('encrypt')
      }
    })
  }

  it('audits all CIPHER_REGISTRY entries to ensure no unclassified or missing operations', () => {
    for (const cipher of CIPHER_REGISTRY) {
      const cap = getAlgorithmCapability(cipher.id, cipher.category)
      expect(cap, `Cipher ${cipher.id} must have a valid capability entry`).toBeDefined()
      expect(cap.primaryOperation, `Cipher ${cipher.id} must define a primaryOperation`).toBeTruthy()
      expect(Array.isArray(cap.supportedOperations), `Cipher ${cipher.id} supportedOperations must be an array`).toBe(true)
      expect(cap.supportedOperations.length, `Cipher ${cipher.id} must support at least 1 operation`).toBeGreaterThan(0)
    }
  })
})
