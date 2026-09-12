import { describe, it, test, expect } from "vitest";
import {
  calculateShannonEntropy,
  calculateMinEntropy,
  calculateUnicityDistance,
} from "@/lib/utils/entropy";

describe("Entropy & Information-Theoretic Utilities", () => {
  test("calculates uniform Shannon entropy correctly", () => {
    const dist = [0.25, 0.25, 0.25, 0.25];
    expect(calculateShannonEntropy(dist)).toBeCloseTo(2.0, 5);
  });

  test("calculates Min-Entropy correctly", () => {
    const dist = [0.5, 0.25, 0.125, 0.125];
    expect(calculateMinEntropy(dist)).toBeCloseTo(1.0, 5);
  });

  test("calculates Unicity Distance correctly", () => {
    expect(calculateUnicityDistance(128, 3.2)).toBe(40);
    expect(calculateUnicityDistance(128, 0)).toBe(Infinity);
  });

  it("calculates correct Shannon entropy for binary uniform distribution", () => {
    const entropy = calculateShannonEntropy([0.5, 0.5]);
    expect(entropy).toBeCloseTo(1.0);
  });

  it("calculates correct Min-Entropy for skewed distribution", () => {
    const minEntropy = calculateMinEntropy([0.8, 0.2]);
    expect(minEntropy).toBeCloseTo(-Math.log2(0.8));
  });

  it("calculates correct Unicity Distance for 25-key space", () => {
    const unicity = calculateUnicityDistance(25, 3.2);
    expect(unicity).toBeCloseTo(7.81, 1);
  });
});
