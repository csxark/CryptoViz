import { describe, it, expect } from 'vitest';
import {
  PAIRING_CURVE,
  pointAdd,
  scalarMultiply,
  computeBilinearPairing,
  verifyBilinearityProperty,
  traceMillerAlgorithm,
  ibeSetup,
  ibeExtract,
  ibeEncrypt,
  ibeDecrypt,
} from '@/lib/math/pairing';

describe('Bilinear Pairings & IBE Mathematical Engine (#1043)', () => {
  describe('Elliptic Curve Point Operations', () => {
    it('handles point doubling correctly', () => {
      const P = PAIRING_CURVE.G1_gen;
      const P2 = pointAdd(P, P);
      expect(P2.isInfinity).toBeFalsy();
      expect(P2.x).toBeGreaterThan(0n);
      expect(P2.y).toBeGreaterThan(0n);
    });

    it('handles scalar multiplication accurately', () => {
      const P = PAIRING_CURVE.G1_gen;
      const P3 = scalarMultiply(3n, P);
      const P1_plus_P2 = pointAdd(P, pointAdd(P, P));
      expect(P3.x).toBe(P1_plus_P2.x);
      expect(P3.y).toBe(P1_plus_P2.y);
    });
  });

  describe('Bilinearity Equation: e(aP, bQ) == e(P, Q)^(ab)', () => {
    it('verifies bilinearity identity for a=3, b=4', () => {
      const result = verifyBilinearityProperty(3n, 4n);
      expect(result.isEqual).toBe(true);
      expect(result.pairing_aP_bQ).toBe(result.pairing_P_Q_pow_ab);
      expect(result.pairing_aP_bQ).toBeGreaterThan(0n);
    });

    it('verifies bilinearity identity for a=5, b=2', () => {
      const result = verifyBilinearityProperty(5n, 2n);
      expect(result.isEqual).toBe(true);
      expect(result.pairing_aP_bQ).toBe(result.pairing_P_Q_pow_ab);
    });

    it('verifies bilinearity identity for a=7, b=3', () => {
      const result = verifyBilinearityProperty(7n, 3n);
      expect(result.isEqual).toBe(true);
      expect(result.pairing_aP_bQ).toBe(result.pairing_P_Q_pow_ab);
    });
  });

  describe("Miller's Algorithm Trace", () => {
    it('generates line functions and accumulator updates for loop bound r=6', () => {
      const steps = traceMillerAlgorithm(PAIRING_CURVE.G1_gen, PAIRING_CURVE.G2_gen, 6);
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0].operation).toBe('DOUBLE');
      expect(steps[0].slope).toContain('λ');
      expect(steps[0].accumulatorF).toContain('f =');
    });

    it('supports higher loop bound bounds like r=10', () => {
      const steps = traceMillerAlgorithm(PAIRING_CURVE.G1_gen, PAIRING_CURVE.G2_gen, 10);
      expect(steps.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Boneh-Franklin Identity-Based Encryption (IBE)', () => {
    it('successfully encrypts and decrypts with recipient identity', () => {
      const setup = ibeSetup(7n);
      const identity = 'alice@example.com';
      const userKey = ibeExtract(identity, setup);

      const plaintext = 'Secret pairing message';
      const ciphertext = ibeEncrypt(identity, plaintext, setup, 5n);
      const decrypted = ibeDecrypt(ciphertext, userKey, setup);

      expect(decrypted.pairingMatches).toBe(true);
      expect(decrypted.recoveredPlaintext).toBe(plaintext);
    });

    it('fails to decrypt if decrypted with a different identity private key', () => {
      const setup = ibeSetup(7n);
      const aliceIdentity = 'alice@example.com';
      const bobIdentity = 'bob@example.com';

      const bobKey = ibeExtract(bobIdentity, setup);
      const plaintext = 'Confidential for Alice only';

      const ciphertext = ibeEncrypt(aliceIdentity, plaintext, setup, 5n);
      const decryptedWithBobKey = ibeDecrypt(ciphertext, bobKey, setup);

      expect(decryptedWithBobKey.pairingMatches).toBe(false);
      expect(decryptedWithBobKey.recoveredPlaintext).not.toBe(plaintext);
    });
  });
});
