import { describe, expect, it } from "vitest";
import {
  calculateKeyspace,
  calculateEntropy,
  calculateEstimatedTime,
  formatDuration,
  getStrengthIndicator,
  SPEED_PRESETS,
  CHARACTER_SETS,
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

    // Age of the universe ratios
    expect(formatDuration(AGE_OF_UNIVERSE)).toBe("1 × Age of the Universe");
    expect(formatDuration(1.5 * AGE_OF_UNIVERSE)).toBe("1.5 × Age of the Universe");
    expect(formatDuration(2000 * AGE_OF_UNIVERSE)).toBe("2 thousand × Age of the Universe");

    // fallback to exponential format for massive intervals
    expect(formatDuration(1e20 * YEAR)).toBe("1.00e+20 years");
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
});
