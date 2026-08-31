/**
 * Replays fast-check failures recorded by the property-based fuzzing suite
 * (see lib/testing/propertyFuzzFramework.ts) as deterministic regression
 * tests. Whenever a property in propertyFuzzHarness.test.ts finds a failing
 * input, its minimized counterexample and seed land in
 * tests/fixtures/property-regressions.json; this file re-runs each recorded
 * seed at numRuns=1 so the exact failing case is checked on every future
 * run, independent of the browser UI.
 *
 * To add a replayable mapping for a new property name, register it in
 * PROPERTY_BY_NAME below, using the same generators/predicate as in
 * propertyFuzzHarness.test.ts. Once a recorded regression is fixed and
 * confirmed, remove its entry from property-regressions.json (or promote it
 * into its own hand-written test).
 */
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CipherError } from '../../../lib/utils/errors';
import { loadRegressions, replayRegression } from '../../../lib/testing/propertyFuzzFramework';
import { cryptoArbitraries } from './fastCheckHelpers';

const PROPERTY_BY_NAME: Record<string, () => Promise<fc.IRawProperty<unknown[]>>> = {
  'symmetric-aes-roundtrip': async () => {
    const { encrypt, decrypt } = await import('../../../lib/cipher/symmetric/aes');
    return fc.asyncProperty(
      cryptoArbitraries.arbitraryBoundaryBytes
        .map(bytes => Array.from(bytes).map(b => String.fromCharCode(32 + (b % 95))).join(''))
        .filter(s => s.length > 0),
      cryptoArbitraries.arbitrary16ByteKey,
      async (input, key) => {
        try {
          const enc = encrypt(input, key);
          const dec = decrypt(enc.output, key);
          expect(dec.output).toBe(input);
        } catch (e) {
          if (e instanceof CipherError) return;
          throw e;
        }
      },
    ) as unknown as fc.IRawProperty<unknown[]>;
  },
};

describe('Recorded property-fuzzing regressions (#1635)', () => {
  const regressions = loadRegressions();

  if (regressions.length === 0) {
    it('has no currently-open recorded regressions', () => {
      expect(regressions).toHaveLength(0);
    });
    return;
  }

  for (const entry of regressions) {
    it(`replays "${entry.name}" at recorded seed=${entry.seed}`, async () => {
      const buildProperty = PROPERTY_BY_NAME[entry.name];
      if (!buildProperty) {
        throw new Error(
          `No replayable property registered for "${entry.name}" in PROPERTY_BY_NAME. ` +
          `Add one so this recorded failure can be verified as fixed.`,
        );
      }
      await replayRegression(entry, await buildProperty());
    });
  }
});