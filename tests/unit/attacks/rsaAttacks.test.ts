import { describe, expect, it } from "vitest";
import {
  RSA_ATTACK_PRESETS,
  RsaAttackError,
  commonModulusAttack,
  continuedFraction,
  convergents,
  crt,
  egcd,
  fermatFactor,
  hastadBroadcastAttack,
  integerNthRoot,
  integerSqrt,
  modInverse,
  modPow,
  parseBigIntInput,
  wienerAttack,
} from "../../../lib/attacks/rsaAttacks";

describe("RSA attack playground utilities", () => {
  it("verifies egcd Bézout identity and modular inverse", () => {
    const result = egcd(240n, 46n);
    expect(240n * result.x + 46n * result.y).toBe(result.g);
    expect(modInverse(7n, 40n)).toBe(23n);
  });

  it("computes modular exponentiation", () => {
    expect(modPow(42n, 7n, 3233n)).toBe(RSA_ATTACK_PRESETS.commonModulus.c1);
    expect(modPow(4n, -1n, 7n)).toBe(2n);
  });

  it("computes integer roots", () => {
    expect(integerSqrt(81n)).toBe(9n);
    expect(integerSqrt(82n)).toBe(9n);
    expect(integerNthRoot(74088n, 3n)).toEqual({ root: 42n, exact: true });
    expect(integerNthRoot(74089n, 3n)).toEqual({ root: 42n, exact: false });
  });

  it("factors close RSA primes with Fermat factorization", () => {
    const result = fermatFactor(RSA_ATTACK_PRESETS.fermat.n);

    expect(result.p * result.q).toBe(RSA_ATTACK_PRESETS.fermat.n);
    expect(result.primeGap).toBe(2n);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("rejects invalid Fermat inputs by error code", () => {
    expect(() => fermatFactor(100n)).toThrow(RsaAttackError);

    try {
      fermatFactor(100n);
    } catch (error) {
      expect((error as RsaAttackError).code).toBe("INVALID_KEY");
    }
  });

  it("builds continued fractions and convergents", () => {
    const terms = continuedFraction(415n, 93n);
    expect(terms).toEqual([4n, 2n, 6n, 7n]);
    expect(convergents(terms).at(-1)).toEqual({ numerator: 415n, denominator: 93n });
  });

it("recovers a small private exponent with Wiener's attack", () => {
  const preset = RSA_ATTACK_PRESETS.wiener;
  const result = wienerAttack(preset.e, preset.n);

  expect(preset.n).toBe(89n * 73n);
  expect(result.d).toBe(preset.d);
  expect(result.convergents.some((row) => row.accepted)).toBe(true);
});
  it("returns null when Wiener does not apply", () => {
    const result = wienerAttack(65537n, 99991n);

    expect(result.d).toBeNull();
    expect(result.convergents.length).toBeGreaterThan(0);
  });

  it("recovers plaintext using common modulus attack", () => {
    const preset = RSA_ATTACK_PRESETS.commonModulus;
    const result = commonModulusAttack(preset.n, preset.e1, preset.e2, preset.c1, preset.c2);

    expect(result.m).toBe(preset.m);
    expect(result.a * preset.e1 + result.b * preset.e2).toBe(1n);
  });

  it("rejects common modulus attack when exponents are not coprime", () => {
    try {
      commonModulusAttack(3233n, 6n, 12n, 1n, 1n);
    } catch (error) {
      expect((error as RsaAttackError).code).toBe("NOT_APPLICABLE");
    }
  });

  it("combines congruences with CRT", () => {
    expect(
      crt([
        { remainder: 2n, modulus: 3n },
        { remainder: 3n, modulus: 5n },
        { remainder: 2n, modulus: 7n },
      ]),
    ).toBe(23n);
  });

  it("recovers plaintext using Håstad broadcast attack", () => {
    const preset = RSA_ATTACK_PRESETS.hastad;
    const result = hastadBroadcastAttack(
      preset.e,
      preset.moduli.map((n, index) => ({ n, c: preset.ciphertexts[index] })),
    );

    expect(result.m).toBe(preset.m);
    expect(result.crtValue).toBe(preset.m ** preset.e);
  });

  it("rejects Håstad attack when too few congruences are provided", () => {
    try {
      hastadBroadcastAttack(3n, [{ c: 1n, n: 5n }]);
    } catch (error) {
      expect((error as RsaAttackError).code).toBe("INVALID_INPUT");
    }
  });

it("parses decimal bigint input", () => {
  expect(parseBigIntInput("42", "value")).toBe(42n);
  expect(parseBigIntInput("12345", "value")).toBe(12345n);

  try {
    parseBigIntInput("abc", "value");
  } catch (error) {
    expect((error as RsaAttackError).code).toBe("INVALID_INPUT");
  }
});});
