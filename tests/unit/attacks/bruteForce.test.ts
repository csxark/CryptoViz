import { describe, expect, it } from "vitest";
import {
  calculateKeyspace,
  calculateEntropy,
  calculateEstimatedTime,
  formatDuration,
  getStrengthIndicator,
} from "../../../lib/attacks/bruteForce";

describe("brute force time estimator math & helpers", () => {
  it("calculates keyspace size correctly", () => {
    // 26^8 = 208827064576
    expect(calculateKeyspace(8, 26)).toBe(208827064576n);
    // 10^5 = 100000
    expect(calculateKeyspace(5, 10)).toBe(100000n);

    // edge cases
    expect(calculateKeyspace(0, 26)).toBe(0n);
    expect(calculateKeyspace(8, 0)).toBe(0n);
    expect(calculateKeyspace(-1, 10)).toBe(0n);
  });

  it("calculates entropy in bits correctly", () => {
    // 8 chars * log2(26) (approx 4.7) = 37.6
    expect(calculateEntropy(8, 26)).toBeCloseTo(37.6, 1);
    // 10 chars * log2(10) (approx 3.32) = 33.2
    expect(calculateEntropy(10, 10)).toBeCloseTo(33.2, 1);

    // edge cases
    expect(calculateEntropy(0, 26)).toBe(0);
    expect(calculateEntropy(8, 0)).toBe(0);
  });

  it("estimates crack times based on keyspace and speed", () => {
    const keyspace = calculateKeyspace(8, 10); // 10^8 = 100,000,000
    const speed = 100_000; // 100k attempts/sec

    const times = calculateEstimatedTime(keyspace, speed);
    // worst case: 100,000,000 / 100,000 = 1000 sec
    expect(times.worstSec).toBe(1000);
    // average case: 1000 / 2 = 500 sec
    expect(times.averageSec).toBe(500);

    // zero speed handles division by zero
    const zeroSpeedTimes = calculateEstimatedTime(keyspace, 0);
    expect(zeroSpeedTimes.worstSec).toBe(Infinity);
    expect(zeroSpeedTimes.averageSec).toBe(Infinity);
  });

  it("formats durations into human-readable ranges", () => {
    expect(formatDuration(0)).toBe("Instantaneous");
    expect(formatDuration(0.0005)).toBe("Less than 1 millisecond");
    expect(formatDuration(0.25)).toBe("250 milliseconds");
    expect(formatDuration(1.5)).toBe("1.5 seconds");
    expect(formatDuration(90)).toBe("1.5 minutes");
    expect(formatDuration(5400)).toBe("1.5 hours");
    expect(formatDuration(129600)).toBe("1.5 days");
    expect(formatDuration(47336400)).toBe("1.5 years");

    // Century level / Millennia level / Large age of the universe level
    const YEAR = 31557600;
    const AGE_OF_UNIVERSE_YEARS = 13.8e9;
    const AGE_OF_UNIVERSE = AGE_OF_UNIVERSE_YEARS * YEAR;

    expect(formatDuration(500 * YEAR)).toBe("500 years");
    expect(formatDuration(1500 * YEAR)).toBe("1.5 thousand years");
    expect(formatDuration(1e6 * YEAR)).toBe("1 million years");
    expect(formatDuration(1.5e9 * YEAR)).toBe("1.5 billion years");

    // Age of the universe ratios (1 to 1000 universe lifetimes)
    expect(formatDuration(AGE_OF_UNIVERSE)).toBe("1 × Age of the Universe");
    expect(formatDuration(1.5 * AGE_OF_UNIVERSE)).toBe("1.5 × Age of the Universe");
    expect(formatDuration(14.2 * AGE_OF_UNIVERSE)).toBe("14.2 × Age of the Universe");
    expect(formatDuration(999 * AGE_OF_UNIVERSE)).toBe("999 × Age of the Universe");

    // Fallback to exponential/scientific notation for durations exceeding 1,000 universe lifetimes / massive intervals
    expect(formatDuration(1000 * AGE_OF_UNIVERSE)).toBe("1.38e+13 years");
    expect(formatDuration(2000 * AGE_OF_UNIVERSE)).toBe("2.76e+13 years");
    expect(formatDuration(1e20 * YEAR)).toBe("1.00e+20 years");
    expect(formatDuration(3.40e28 * YEAR)).toBe("3.40e+28 years");
    expect(formatDuration(Infinity)).toBe("Practically infinite");
  });

  it("classifies password strength thresholds correctly", () => {
    // Very Weak: < 28 bits
    expect(getStrengthIndicator(20).label).toBe("Very Weak");
    expect(getStrengthIndicator(20).score).toBe(0);

    // Weak: 28 to < 36 bits
    expect(getStrengthIndicator(30).label).toBe("Weak");
    expect(getStrengthIndicator(30).score).toBe(1);

    // Reasonable: 36 to < 60 bits
    expect(getStrengthIndicator(45).label).toBe("Reasonable");
    expect(getStrengthIndicator(45).score).toBe(2);

    // Strong: 60 to < 128 bits
    expect(getStrengthIndicator(80).label).toBe("Strong");
    expect(getStrengthIndicator(80).score).toBe(3);

    // Very Strong: >= 128 bits
    expect(getStrengthIndicator(130).label).toBe("Very Strong");
    expect(getStrengthIndicator(130).score).toBe(4);
  });

  describe("speed presets and character sets metadata validation", () => {
    it("has valid non-empty speed presets with strictly positive rates", async () => {
      const { SPEED_PRESETS } = await import("../../../lib/attacks/bruteForce");
      expect(SPEED_PRESETS.length).toBeGreaterThanOrEqual(5);
      for (const preset of SPEED_PRESETS) {
        expect(preset.id).toBeTruthy();
        expect(preset.name).toBeTruthy();
        expect(preset.speed).toBeGreaterThan(0);
        expect(preset.description).toBeTruthy();
      }
    });

    it("has valid non-empty character sets with correct character counts", async () => {
      const { CHARACTER_SETS } = await import("../../../lib/attacks/bruteForce");
      expect(CHARACTER_SETS.length).toBeGreaterThanOrEqual(4);
      for (const cs of CHARACTER_SETS) {
        expect(cs.id).toBeTruthy();
        expect(cs.name).toBeTruthy();
        expect(cs.size).toBe(cs.characters.length);
        expect(cs.example).toBeTruthy();
      }
    });
  });

  describe("exhaustive duration and keyspace scenario tests", () => {
    it("evaluates realistic password search spaces accurately", () => {
      // 8-character numeric PIN: 10^8 = 100,000,000 combinations
      const pinKeyspace = calculateKeyspace(8, 10);
      const onlineSpeed = 10; // 10 attempts/sec
      const pinTime = calculateEstimatedTime(pinKeyspace, onlineSpeed);
      expect(pinTime.worstSec).toBe(10_000_000);
      expect(pinTime.averageSec).toBe(5_000_000);
      expect(formatDuration(pinTime.averageSec)).toBe("57.9 days");

      // 12-character alphanumeric: 62^12 combinations
      const alphanumKeyspace = calculateKeyspace(12, 62);
      const gpuRigSpeed = 1_000_000_000; // 1 GH/s
      const alphanumTime = calculateEstimatedTime(alphanumKeyspace, gpuRigSpeed);
      expect(alphanumTime.averageSec).toBeGreaterThan(0);
      expect(typeof formatDuration(alphanumTime.averageSec)).toBe("string");
    });

    it("evaluates cryptographic key scales (DES 56-bit, AES-128, AES-256)", () => {
      const YEAR = 31557600;
      const AGE_OF_UNIVERSE_YEARS = 1.38e10;
      const AGE_OF_UNIVERSE = AGE_OF_UNIVERSE_YEARS * YEAR;

      // 56-bit DES keyspace: 2^56 = 72,057,594,037,927,936
      const desKeyspace = 2n ** 56n;
      const supercomputerSpeed = 100_000_000_000; // 100 GH/s
      const desTime = calculateEstimatedTime(desKeyspace, supercomputerSpeed);
      expect(desTime.worstSec).toBeCloseTo(720575.94, 1);
      expect(formatDuration(desTime.worstSec)).toBe("8.3 days");

      // 128-bit key search space at 100 GH/s: ~1.07e29 seconds ≈ 3.4e21 years
      const aes128Years = 3.4e21;
      expect(formatDuration(aes128Years * YEAR)).toBe("3.40e+21 years");

      // 256-bit key search space at 100 GH/s: ~3.67e59 years
      const aes256Years = 3.67e59;
      expect(formatDuration(aes256Years * YEAR)).toBe("3.67e+59 years");

      // Moderate universe scales (1x to 999x)
      expect(formatDuration(1 * AGE_OF_UNIVERSE)).toBe("1 × Age of the Universe");
      expect(formatDuration(10 * AGE_OF_UNIVERSE)).toBe("10 × Age of the Universe");
      expect(formatDuration(100 * AGE_OF_UNIVERSE)).toBe("100 × Age of the Universe");
      expect(formatDuration(999.9 * AGE_OF_UNIVERSE)).toBe("999.9 × Age of the Universe");
    });

    it("handles edge cases in keyspace and entropy calculation", () => {
      expect(calculateKeyspace(0, 0)).toBe(0n);
      expect(calculateKeyspace(-5, 26)).toBe(0n);
      expect(calculateKeyspace(5, -10)).toBe(0n);
      expect(calculateEntropy(0, 0)).toBe(0);
      expect(calculateEntropy(-5, 26)).toBe(0);
      expect(calculateEntropy(5, -10)).toBe(0);
    });

    it("verifies consistency between bruteForce re-exported formatDuration and formatters.ts", async () => {
      const formattersModule = await import("../../../lib/formatters");
      const bruteForceModule = await import("../../../lib/attacks/bruteForce");
      expect(bruteForceModule.formatDuration).toBe(formattersModule.formatDuration);

      const testValues = [0, 0.0005, 0.5, 10, 3600, 86400, 31557600 * 10, 31557600 * 1e15, Infinity];
      for (const val of testValues) {
        expect(bruteForceModule.formatDuration(val)).toBe(formattersModule.formatDuration(val));
      }
    });

    it("verifies strength indicators for full entropy boundary values", () => {
      // < 28 bits: Very Weak
      expect(getStrengthIndicator(0).score).toBe(0);
      expect(getStrengthIndicator(27.9).score).toBe(0);
      expect(getStrengthIndicator(27.9).label).toBe("Very Weak");

      // 28 to < 36 bits: Weak
      expect(getStrengthIndicator(28).score).toBe(1);
      expect(getStrengthIndicator(35.9).score).toBe(1);
      expect(getStrengthIndicator(28).label).toBe("Weak");

      // 36 to < 60 bits: Reasonable
      expect(getStrengthIndicator(36).score).toBe(2);
      expect(getStrengthIndicator(59.9).score).toBe(2);
      expect(getStrengthIndicator(36).label).toBe("Reasonable");

      // 60 to < 128 bits: Strong
      expect(getStrengthIndicator(60).score).toBe(3);
      expect(getStrengthIndicator(127.9).score).toBe(3);
      expect(getStrengthIndicator(60).label).toBe("Strong");

      // >= 128 bits: Very Strong
      expect(getStrengthIndicator(128).score).toBe(4);
      expect(getStrengthIndicator(256).score).toBe(4);
      expect(getStrengthIndicator(512).label).toBe("Very Strong");
    });
  });
});


