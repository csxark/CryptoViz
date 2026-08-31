import { describe, expect, it } from "vitest";
import {
  calculateCollisionProbability,
  calculate50PercentThreshold,
  formatHash,
} from "../../../lib/attacks/birthdayAttack";

describe("birthday attack simulator logic & paradox math", () => {
  it("calculates collision probability correctly for small sample sizes", () => {
    // Standard birthday paradox exponential approximation: k = 23, N = 365 yields ~50.0%
    expect(calculateCollisionProbability(23, 365)).toBeCloseTo(0.50, 2);

    // No samples or 1 sample should have 0% chance of collision
    expect(calculateCollisionProbability(0, 365)).toBe(0);
    expect(calculateCollisionProbability(1, 365)).toBe(0);

    // If sample size is greater than space size, collision probability is 100% (pigeonhole principle)
    expect(calculateCollisionProbability(10, 8)).toBe(1.0);
  });

  it("calculates collision probability correctly for larger sample sizes (approximation)", () => {
    // 8-bit hash space (N=256), k = 30 -> p approx 1 - exp(-30*29 / 512) = 1 - exp(-1.699) = 0.817
    expect(calculateCollisionProbability(30, 256)).toBeCloseTo(0.817, 2);

    // 16-bit hash space (N=65536), k = 300 -> p approx 1 - exp(-300*299 / 131072) = 1 - exp(-0.684) = 0.495
    expect(calculateCollisionProbability(300, 65536)).toBeCloseTo(0.495, 2);
  });

  it("ensures collision probability is numerically stable and monotonically increasing with k", () => {
    const N = 2 ** 32;
    let prev = 0;
    for (let k = 2; k <= 150; k += 10) {
      const prob = calculateCollisionProbability(k, N);
      expect(prob).toBeGreaterThan(prev);
      expect(prob).toBeGreaterThan(0);
      expect(prob).toBeLessThan(1.0);
      prev = prob;
    }
  });

  it("calculates the 50% probability threshold accurately", () => {
    // 8-bit space (N = 256) -> k_50% approx 1.1774 * 16 = 19
    expect(calculate50PercentThreshold(256)).toBe(19);

    // 16-bit space (N = 65536) -> k_50% approx 1.1774 * 256 = 301
    expect(calculate50PercentThreshold(65536)).toBe(301);

    // 32-bit space (N = 2^32) -> k_50% approx 1.1774 * 65536 = 77163
    expect(calculate50PercentThreshold(2 ** 32)).toBe(77163);

    // edge case
    expect(calculate50PercentThreshold(0)).toBe(0);
  });

  it("formats hash values into padded hex strings based on output bits", () => {
    // 8 bits = 2 hex chars
    expect(formatHash(15, 8)).toBe("0F");
    expect(formatHash(255, 8)).toBe("FF");

    // 16 bits = 4 hex chars
    expect(formatHash(15, 16)).toBe("000F");
    expect(formatHash(4096, 16)).toBe("1000");

    // 24 bits = 6 hex chars
    expect(formatHash(100000, 24)).toBe("0186A0");

    // 32 bits = 8 hex chars - verified fix for bitshift overflow
    expect(formatHash(0x12345678, 32)).toBe("12345678");
    expect(formatHash(4294967295, 32)).toBe("FFFFFFFF");

    // Clamp boundary checks
    expect(formatHash(-10, 8)).toBe("00");
    expect(formatHash(500, 8)).toBe("FF"); // clamped to 255 (max 8-bit)
  });
});
