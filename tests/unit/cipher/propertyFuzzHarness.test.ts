/**
 * Universal Property-Based Cipher Fuzzing Suite (#1635)
 *
 * Reusable, boundary-aware property/fuzz testing layer built on top of
 * lib/testing/propertyFuzzFramework.ts. Unlike the fixed-seed suite in
 * propertyBasedCrypto.test.ts (#1324), this suite:
 *   - draws message lengths and key sizes from boundary-aware arbitraries
 *     (empty / block-boundary / oversized inputs),
 *   - checks state-machine invariants on step traces (every trace reaches a
 *     terminal state and survives a serialize/replay round trip), and
 *   - on any property failure, persists the minimized counterexample and
 *     fast-check seed to tests/fixtures/property-regressions.json so it can
 *     be replayed deterministically by propertyRegressions.test.ts.
 *
 * NOTE: The previous version of this file iterated `CIPHER_REGISTRY.symmetric`
 * / `.classical` / `.hash`, but CIPHER_REGISTRY (lib/cipher/registry.ts) is a
 * flat array of metadata, not a category-keyed object of cipher engines — so
 * every `if` guard was false and this suite silently ran zero assertions.
 * It now imports real, callable cipher implementations directly, the same
 * way propertyBasedCrypto.test.ts does.
 */

import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CipherError } from '../../../lib/utils/errors';
import { cryptoArbitraries } from './fastCheckHelpers';
import {
  runFuzzProperty,
  assertValidTrace,
  assertTraceSerializationRoundTrip,
} from '../../../lib/testing/propertyFuzzFramework';

// ─── Symmetric & hash implementations, fuzzed via the shared framework ───────

const SYMMETRIC_CIPHERS = [
  { name: 'aes', module: () => import('../../../lib/cipher/symmetric/aes'), keySize: 16 },
  { name: 'des', module: () => import('../../../lib/cipher/symmetric/des'), keySize: 8 },
] as const;

const HASH_FUNCTIONS = [
  { name: 'sha256', module: () => import('../../../lib/cipher/hash/sha256'), digestHexLength: 64 },
  { name: 'sha512', module: () => import('../../../lib/cipher/hash/sha512'), digestHexLength: 128 },
] as const;

function fixedKeyArbitrary(byteLength: number) {
  return fc.string({ minLength: byteLength, maxLength: byteLength }).map(s => {
    let key = '';
    for (let i = 0; i < byteLength; i++) key += String.fromCharCode(32 + (s.charCodeAt(i) % 95));
    return key;
  });
}

describe('Universal Property-Based Cipher Fuzzing Suite (#1635)', () => {
  describe('Symmetric ciphers — round-trip & determinism over boundary-sized inputs', () => {
    for (const { name, module, keySize } of SYMMETRIC_CIPHERS) {
      it(`${name}: decrypt(encrypt(x,k),k) === x, deterministic, no unhandled errors`, async () => {
        const { encrypt, decrypt } = await module();
        await runFuzzProperty(
          `symmetric-${name}-roundtrip`,
          fc.asyncProperty(
            cryptoArbitraries.arbitraryBoundaryBytes
              .map(bytes => Array.from(bytes).map(b => String.fromCharCode(32 + (b % 95))).join(''))
              .filter(s => s.length > 0),
            fixedKeyArbitrary(keySize),
            async (input, key) => {
              try {
                const enc1 = encrypt(input, key);
                const enc2 = encrypt(input, key);
                expect(enc2.output).toBe(enc1.output); // determinism invariant

                const dec = decrypt(enc1.output, key);
                expect(dec.output).toBe(input); // round-trip invariant
              } catch (e) {
                if (e instanceof CipherError) return; // rejected invalid input — acceptable
                throw e;
              }
            },
          ),
          { numRuns: 150 },
        );
      });
    }
  });

  describe('Hash functions — determinism & fixed digest length over boundary-sized inputs', () => {
    for (const { name, module, digestHexLength } of HASH_FUNCTIONS) {
      it(`${name}: deterministic, fixed-length hex digest for any input length`, async () => {
        const { encrypt } = await module();
        await runFuzzProperty(
          `hash-${name}-digest`,
          fc.asyncProperty(
            cryptoArbitraries.arbitraryBoundaryBytes
              .map(bytes => Array.from(bytes).map(b => String.fromCharCode(b % 256)).join('')),
            async (input) => {
              const h1 = encrypt(input, '');
              const h2 = encrypt(input, '');
              expect(h1.output).toBe(h2.output);
              expect(h1.output).toHaveLength(digestHexLength);
              expect(h1.output).toMatch(/^[0-9a-f]+$/i);
            },
          ),
          { numRuns: 150 },
        );
      });
    }
  });

  describe('Key-size boundary validation — invalid sizes are rejected, not left malformed', () => {
    it('AES: only 16-byte keys are accepted; all other boundary-adjacent sizes reject cleanly', async () => {
      const { encrypt } = await import('../../../lib/cipher/symmetric/aes');
      await runFuzzProperty(
        'symmetric-aes-key-size-validation',
        fc.asyncProperty(
          cryptoArbitraries.arbitraryKeySizeBytes,
          fc.integer({ min: -1, max: 1 }),
          fc.string({ minLength: 1, maxLength: 32 }),
          async (baseSize, delta, input) => {
            const size = baseSize + delta;
            if (size === 16) return; // valid size, covered by the round-trip suite above
            const badKey = 'k'.repeat(Math.max(size, 0));
            try {
              encrypt(input, badKey);
              throw new Error(`Expected key of length ${size} to be rejected`);
            } catch (e) {
              expect(e).toBeInstanceOf(CipherError);
            }
          },
        ),
        { numRuns: 60 },
      );
    });
  });
});

describe('State-machine invariants — Kalyna engine step traces (#1635)', () => {
  it('every generated INSTRUMENTED trace reaches a terminal state and survives serialize/replay', async () => {
    const { KalynaEngine } = await import('../../../lib/cipher/kalyna/kalynaEngine');
    const { InstrumentedPipeline } = await import('../../../lib/cipher/instrumentedPipeline');

    await runFuzzProperty(
      'kalyna-instrumented-trace-invariants',
      fc.asyncProperty(
        cryptoArbitraries.arbitraryBoundaryBytes,
        fc.uint8Array({ minLength: 1, maxLength: 32 }),
        async (plaintext, keyBytes) => {
          const cipher = new KalynaEngine();
          cipher.setKey(keyBytes);
          try {
            const pipeline = new InstrumentedPipeline(cipher, 'INSTRUMENTED');
            const { result, traces } = await pipeline.execute(plaintext);

            assertValidTrace(traces);
            assertTraceSerializationRoundTrip(traces!);

            // Worker-independent execution must terminate, and the cipher's
            // own round trip must still hold for every generated valid input.
            const decrypted = await cipher.decrypt(result);
            expect(Array.from(decrypted)).toEqual(Array.from(plaintext));
          } finally {
            cipher.destroy();
          }
        },
      ),
      { numRuns: 150 },
    );
  });
});