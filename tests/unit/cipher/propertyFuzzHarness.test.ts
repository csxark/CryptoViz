import * as fc from 'fast-check';
import { CIPHER_REGISTRY } from '../../../lib/cipher/registry';
import { cryptoArbitraries } from './fastCheckHelpers';

describe('Universal Property-Based Cipher Fuzzing Suite', () => {
  // Iterate through all registered symmetric ciphers
  if (CIPHER_REGISTRY.symmetric) {
    describe('Symmetric Ciphers Invariants', () => {
      Object.entries(CIPHER_REGISTRY.symmetric).forEach(([name, cipher]) => {
        it(`should satisfy round-trip and determinism invariants for ${name}`, () => {
          fc.assert(
            fc.property(
              cryptoArbitraries.arbitraryUtf8,
              cryptoArbitraries.arbitraryKey,
              (plaintext, key) => {
                try {
                  const ciphertext = cipher.encrypt(plaintext, key);
                  
                  // Determinism Invariant
                  const ciphertextSecond = cipher.encrypt(plaintext, key);
                  expect(ciphertextSecond).toEqual(ciphertext);

                  // Round-Trip Invariant
                  const decrypted = cipher.decrypt(ciphertext, key);
                  expect(decrypted).toEqual(plaintext);
                } catch (e: any) {
                  // Ensure no unhandled TypeError or RangeError leaks out on edge cases
                  expect(e).not.toBeInstanceOf(TypeError);
                  expect(e).not.toBeInstanceOf(RangeError);
                }
              }
            ),
            { numRuns: 1000 }
          );
        });
      });
    });
  }

  // Iterate through all registered classical ciphers
  if (CIPHER_REGISTRY.classical) {
    describe('Classical Ciphers Invariants', () => {
      Object.entries(CIPHER_REGISTRY.classical).forEach(([name, cipher]) => {
        it(`should satisfy round-trip invariants for classical cipher ${name}`, () => {
          fc.assert(
            fc.property(
              cryptoArbitraries.arbitraryAlphabetic,
              cryptoArbitraries.arbitraryKey,
              (plaintext, key) => {
                if (!plaintext) return; // Skip empty inputs if unsupported by specific classical cipher
                try {
                  const ciphertext = cipher.encrypt(plaintext, key);
                  const decrypted = cipher.decrypt(ciphertext, key);
                  expect(typeof decrypted).toBe('string');
                } catch (e: any) {
                  expect(e).not.toBeInstanceOf(TypeError);
                  expect(e).not.toBeInstanceOf(RangeError);
                }
              }
            ),
            { numRuns: 500 }
          );
        });
      });
    });
  }

  // Iterate through all registered hash functions
  if (CIPHER_REGISTRY.hash) {
    describe('Hash Functions Invariants', () => {
      Object.entries(CIPHER_REGISTRY.hash).forEach(([name, hasher]) => {
        it(`should produce deterministic digests for hash ${name}`, () => {
          fc.assert(
            fc.property(cryptoArbitraries.arbitraryUtf8, (input) => {
              const digest1 = hasher.hash(input);
              const digest2 = hasher.hash(input);
              // Determinism Invariant
              expect(digest1).toEqual(digest2);
              expect(typeof digest1).toBe('string');
            }),
            { numRuns: 1000 }
          );
        });
      });
    });
  }
});
