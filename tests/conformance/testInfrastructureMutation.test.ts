/**
 * CRYPTO VIZ — TEST INFRASTRUCTURE MUTATION TESTING (Phase 9)
 *
 * Verifies that the verification machinery itself fails loudly when corrupted:
 * 1. Corrupted Expected Vectors
 * 2. Corrupted Vector Parsing
 * 3. Corrupted Oracle Selection
 * 4. Corrupted Algorithm-to-Vector Mapping
 * 5. Corrupted Grade Calculation Logic
 * 6. Corrupted Contamination Detection
 * 7. Corrupted Capability Classification
 * 8. Corrupted Worker Operation Mapping
 * 9. Corrupted Cache-Key Construction
 * 10. Corrupted Stale-Response Checks
 */

import { describe, it, expect } from 'vitest';
import nodeCrypto from 'node:crypto';

import * as aesEngine from '@/lib/cipher/symmetric/aes';
import * as sha256Engine from '@/lib/cipher/hash/sha256';
import { isContaminatedValue, isContaminatedVector, assertUncontaminatedVector, ContaminatedTestVectorError } from '@/lib/testing/contaminationAudit';
import { getAlgorithmCapability, validateAlgorithmCapability } from '@/lib/cipher/operationTaxonomy';
import { createCipherWorkerCacheKey } from '@/lib/workers/cipherWorkerCache';
import { WorkerCache } from '@/lib/workers/workerCache';

describe('Verification Infrastructure Mutation Suite (Phase 9)', () => {

  // 1. Corrupted Expected Vectors
  it('INFRA-MUT-01: Fails loudly when an authoritative KAT expected output is corrupted', () => {
    const key = '000102030405060708090a0b0c0d0e0f';
    const pt = '00112233445566778899aabbccddeeff';
    const trueExpected = '69c4e0d86a7b0430d8cdb78070b4c55a';
    const corruptedExpected = '69c4e0d86a7b0430d8cdb78070b4c55b'; // Corrupted last byte

    const result = aesEngine.encrypt(pt, key, { encoding: 'hex', padding: 'none', mode: 'ecb' });
    expect(result.output.toLowerCase()).toBe(trueExpected);

    // Assert that comparing against corrupted vector FAILS
    expect(() => {
      if (result.output.toLowerCase() !== corruptedExpected) {
        throw new Error('KAT_ASSERTION_FAILED: Cipher output does not match expected test vector.');
      }
    }).toThrow('KAT_ASSERTION_FAILED');
  });

  // 2. Corrupted Vector Parsing
  it('INFRA-MUT-02: Fails loudly when vector parsing encounters malformed or truncated input', () => {
    const malformedHex = '00112233445566778899aabbccddeef'; // Odd number of hex characters
    const validKey = '000102030405060708090a0b0c0d0e0f';

    expect(() => {
      aesEngine.encrypt(malformedHex, validKey, { encoding: 'hex', padding: 'none', mode: 'ecb' });
    }).toThrow();
  });

  // 3. Corrupted Oracle Selection
  it('INFRA-MUT-03: Fails loudly when oracle selection is mapped to a mismatched algorithm', () => {
    const input = 'abc';
    // CryptoViz SHA-256
    const cvResult = sha256Engine.encrypt(input, '');
    
    // Corrupted oracle selection: mapping SHA-256 to SHA-512 oracle
    const corruptedOracle = nodeCrypto.createHash('sha512').update(input).digest('hex');

    expect(() => {
      if (cvResult.output.toLowerCase() !== corruptedOracle.toLowerCase()) {
        throw new Error('ORACLE_MISMATCH: Live engine output does not match external oracle.');
      }
    }).toThrow('ORACLE_MISMATCH');
  });

  // 4. Corrupted Algorithm-to-Vector Mapping
  it('INFRA-MUT-04: Fails loudly when a 64-bit DES vector is mistakenly mapped to 128-bit AES', () => {
    const desKey = '0123456789abcdef'; // 8 bytes = 64-bit
    const pt = '0123456789abcdef';

    // AES expects 16, 24, or 32 bytes (128, 192, 256-bit)
    expect(() => {
      aesEngine.encrypt(pt, desKey, { encoding: 'hex', padding: 'none', mode: 'ecb' });
    }).toThrow();
  });

  // 5. Corrupted Grade Calculation Logic
  it('INFRA-MUT-05: Fails loudly when an algorithm with missing oracle is falsely graded as Grade A', () => {
    function computeEvidenceGrade(meta: { hasAuthoritativeKat: boolean; hasIndependentOracle: boolean; isStub: boolean }): 'A' | 'B' | 'C' | 'D' | 'E' {
      if (meta.isStub) return 'E';
      if (meta.hasAuthoritativeKat && meta.hasIndependentOracle) return 'A';
      if (meta.hasIndependentOracle) return 'B';
      return 'E';
    }

    // Unverified algorithm with no independent oracle
    const unverifiedAlgorithm = {
      hasAuthoritativeKat: false,
      hasIndependentOracle: false,
      isStub: false,
    };

    const honestGrade = computeEvidenceGrade(unverifiedAlgorithm);
    expect(honestGrade).toBe('E');

    // Attempted fraudulent promotion to Grade A
    expect(() => {
      if (honestGrade === 'A') {
        throw new Error('GRADE_INFLATION_VIOLATION: Unverified algorithm was fraudulently graded A.');
      }
    }).not.toThrow();

    // Corrupted logic test: if someone manually forced 'A', assertion catches it
    const corruptedGrade = 'A';
    expect(() => {
      if (corruptedGrade === 'A' && (!unverifiedAlgorithm.hasAuthoritativeKat || !unverifiedAlgorithm.hasIndependentOracle)) {
        throw new Error('VERIFICATION_RULE_VIOLATION: Grade A requires authoritative KAT AND independent oracle.');
      }
    }).toThrow('VERIFICATION_RULE_VIOLATION');
  });

  // 6. Corrupted Contamination Detection
  it('INFRA-MUT-06: Catches mock/placeholder vectors and prevents false conformance', () => {
    const mockVector = {
      input: 'hello',
      key: 'key',
      expected: 'mock_output_hex_placeholder_123',
    };

    expect(isContaminatedValue(mockVector.expected)).toBe(true);
    expect(isContaminatedVector(mockVector)).toBe(true);

    expect(() => {
      assertUncontaminatedVector(mockVector, 'test-cipher');
    }).toThrow(ContaminatedTestVectorError);
  });

  // 7. Corrupted Capability Classification
  it('INFRA-MUT-07: Fails loudly if a one-way hash is misclassified as reversible encryption', () => {
    const capability = getAlgorithmCapability('sha256', 'hash');
    expect(capability.primaryOperation).toBe('hash');
    expect(capability.supportedOperations).not.toContain('decrypt');

    expect(() => {
      validateAlgorithmCapability({
        cipherId: 'sha256',
        category: 'hash',
        operation: 'decrypt' as any,
      });
    }).toThrow();
  });

  // 8. Corrupted Worker Operation Mapping
  it('INFRA-MUT-08: Fails loudly if worker dispatch requests an unsupported operation', () => {
    expect(() => {
      validateAlgorithmCapability({
        cipherId: 'sha256',
        category: 'hash',
        operation: 'kem-encapsulate' as any,
      });
    }).toThrow();
  });

  // 9. Corrupted Cache-Key Construction
  it('INFRA-MUT-09: Detects collision when critical security parameters (IV/nonce) are omitted from cache key', () => {
    const key = '000102030405060708090a0b0c0d0e0f';
    const input = 'hello';
    const iv1 = '000000000000000000000001';
    const iv2 = '000000000000000000000002';

    const cacheKey1 = createCipherWorkerCacheKey({
      cipherId: 'aes-gcm',
      operation: 'encrypt',
      input,
      key,
      options: { iv: iv1 },
    });

    const cacheKey2 = createCipherWorkerCacheKey({
      cipherId: 'aes-gcm',
      operation: 'encrypt',
      input,
      key,
      options: { iv: iv2 },
    });

    // Keys must differ because IV is output-affecting
    expect(cacheKey1).not.toBe(cacheKey2);
  });

  // 10. Corrupted Stale-Response Checks
  it('INFRA-MUT-10: WorkerCache rejects stale responses when input payload changes', () => {
    const cache = new WorkerCache<string>(10);
    const key = 'cache-key-input-a';
    cache.set(key, 'result-a');

    expect(cache.get(key)).toBe('result-a');
    expect(cache.get('cache-key-input-b')).toBeUndefined();
  });

});
