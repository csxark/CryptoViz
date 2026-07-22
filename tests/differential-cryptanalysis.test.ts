// tests/differential-cryptanalysis.test.ts
import { describe, it, expect } from "vitest";
import {
  generateDDT,
  encryptSPN,
  generateDifferentialPairs,
  DEFAULT_SBOX,
} from "@/lib/attacks/differential-cryptanalysis";

describe("Differential Cryptanalysis Engine", () => {
  it("should generate a valid 16x16 Difference Distribution Table (DDT)", () => {
    const ddt = generateDDT(DEFAULT_SBOX);

    expect(ddt.length).toBe(16);
    expect(ddt[0].length).toBe(16);

    // Trivial case: ΔX = 0 always gives ΔY = 0 with probability 1.0 (count = 16)
    expect(ddt[0][0].count).toBe(16);
    expect(ddt[0][0].probability).toBe(1.0);
  });

  it("should produce deterministic SPN encryption outputs", () => {
    const roundKeys = [0x1234, 0x5678, 0x9abc, 0xdef0, 0x1111];
    const plaintext = 0xabcd;

    const cipher1 = encryptSPN(plaintext, roundKeys, DEFAULT_SBOX);
    const cipher2 = encryptSPN(plaintext, roundKeys, DEFAULT_SBOX);

    expect(cipher1).toBe(cipher2);
  });

  it("should generate requested number of differential pair samples", () => {
    const roundKeys = [0x1234, 0x5678, 0x9abc, 0xdef0, 0x1111];
    const inputDiff = 0x000f;
    const count = 10;

    const pairs = generateDifferentialPairs(count, inputDiff, roundKeys, DEFAULT_SBOX);

    expect(pairs.length).toBe(count);
    pairs.forEach((pair) => {
      expect(pair.p1 ^ pair.p2).toBe(inputDiff);
    });
  });
});