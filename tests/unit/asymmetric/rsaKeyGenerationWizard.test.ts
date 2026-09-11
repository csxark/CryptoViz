import { describe, expect, it } from "vitest";
import {
  DEFAULT_RSA_WIZARD_INPUT,
  buildRsaWizardManualChecklist,
  gcd,
  generateRsaWizard,
  getRecommendedPublicExponents,
  isPrime,
  modInverse,
  validateRsaWizardInput,
} from "../../../lib/asymmetric/rsaKeyGenerationWizard";

describe("RSA key generation wizard utilities", () => {
  it("identifies prime numbers", () => {
    expect(isPrime(2)).toBe(true);
    expect(isPrime(61)).toBe(true);
    expect(isPrime(53)).toBe(true);
    expect(isPrime(1)).toBe(false);
    expect(isPrime(21)).toBe(false);
  });

  it("computes gcd and modular inverse", () => {
    expect(gcd(17, 3120)).toBe(1);
    expect(modInverse(17, 3120)).toBe(2753);
  });

  it("generates the classic toy RSA keypair", () => {
    const result = generateRsaWizard(DEFAULT_RSA_WIZARD_INPUT);

    expect(result.modulus).toBe(3233);
    expect(result.totient).toBe(3120);
    expect(result.privateExponent).toBe(413);
    expect(result.publicKey).toBe("(3233, 17)");
    expect(result.privateKey).toBe("(3233, 413)");
    expect(result.steps).toHaveLength(6);
  });

  it("rejects non-prime and duplicate prime inputs", () => {
    expect(() =>
      validateRsaWizardInput({ primeP: 60, primeQ: 53, publicExponent: 17 }),
    ).toThrow(/p must be a prime/i);

    expect(() =>
      validateRsaWizardInput({ primeP: 53, primeQ: 53, publicExponent: 17 }),
    ).toThrow(/different primes/i);
  });

  it("rejects invalid public exponents", () => {
    expect(() =>
      validateRsaWizardInput({ primeP: 61, primeQ: 53, publicExponent: 3120 }),
    ).toThrow(/smaller than/i);

    expect(() =>
      validateRsaWizardInput({ primeP: 61, primeQ: 53, publicExponent: 12 }),
    ).toThrow(/coprime with/i);
  });

  it("suggests valid public exponents", () => {
    expect(getRecommendedPublicExponents(3120)).toEqual([17, 257]);
  });

  it("includes φ(n) vs Carmichael λ(n) explanation and RFC 8017 security note", () => {
    const result = generateRsaWizard(DEFAULT_RSA_WIZARD_INPUT);
    const totientStep = result.steps.find((s) => s.id === "compute-totient");
    expect(totientStep?.explanation).toMatch(/Carmichael's lambda/i);
    expect(totientStep?.explanation).toMatch(/RFC 8017/i);

    const hasLambdaNote = result.securityNotes.some(
      (note) => note.includes("RFC 8017")
    );
    expect(hasLambdaNote).toBe(true);
  });
});

