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
    expect(result.privateExponent).toBe(2753);
    expect(result.publicKey).toBe("(3233, 17)");
    expect(result.privateKey).toBe("(3233, 2753)");
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
    ).toThrow(/smaller than φ\(n\)/i);

    expect(() =>
      validateRsaWizardInput({ primeP: 61, primeQ: 53, publicExponent: 12 }),
    ).toThrow(/coprime with φ\(n\)/i);
  });

  it("suggests valid public exponents", () => {
    expect(getRecommendedPublicExponents(3120)).toEqual([17, 257]);
  });

  it("builds manual testing checklist", () => {
    const checklist = buildRsaWizardManualChecklist();

    expect(checklist[0]).toMatch(/open the rsa key generation wizard/i);
    expect(checklist).toContain(
      "Confirm the default p=61, q=53, e=17 example generates n=3233 and d=2753.",
    );
  });
});
