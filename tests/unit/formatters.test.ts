import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatDuration,
  formatMilliseconds,
  formatPercentage,
  formatNumber,
  formatOperationsPerSecond,
  formatThroughput,
} from "@/lib/formatters";

describe("formatters module", () => {
  describe("formatBytes", () => {
    it("formats 0 bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 B");
    });

    it("formats byte magnitudes correctly", () => {
      expect(formatBytes(1024)).toBe("1.00 KB");
      expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1.00 GB");
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe("1.00 TB");
    });

    it("formats decimal byte values", () => {
      expect(formatBytes(1536)).toBe("1.50 KB");
      expect(formatBytes(1536 * 1024)).toBe("1.50 MB");
    });

    it("handles negative bytes", () => {
      expect(formatBytes(-1024)).toBe("-1.00 KB");
    });

    it("handles undefined or invalid numbers with fallback", () => {
      expect(formatBytes(undefined)).toBe("Unavailable");
      expect(formatBytes(NaN, "N/A")).toBe("N/A");
    });
  });

  describe("formatDuration", () => {
    it("formats duration ranges correctly", () => {
      expect(formatDuration(0)).toBe("Instantaneous");
      expect(formatDuration(0.0005)).toBe("Less than 1 millisecond");
      expect(formatDuration(0.25)).toBe("250 milliseconds");
      expect(formatDuration(1.5)).toBe("1.5 seconds");
      expect(formatDuration(90)).toBe("1.5 minutes");
      expect(formatDuration(5400)).toBe("1.5 hours");
      expect(formatDuration(129600)).toBe("1.5 days");
      expect(formatDuration(47336400)).toBe("1.5 years");
      expect(formatDuration(Infinity)).toBe("Practically infinite");
    });

    it("formats large durations, universe lifetimes, and scientific notation correctly", () => {
      const YEAR = 31557600;
      const AGE_OF_UNIVERSE_YEARS = 1.38e10; // 13.8 billion years
      const AGE_OF_UNIVERSE = AGE_OF_UNIVERSE_YEARS * YEAR;

      // Sub-universe scales
      expect(formatDuration(500 * YEAR)).toBe("500 years");
      expect(formatDuration(1500 * YEAR)).toBe("1.5 thousand years");
      expect(formatDuration(1e6 * YEAR)).toBe("1 million years");
      expect(formatDuration(1.5e9 * YEAR)).toBe("1.5 billion years");

      // Universe lifetime scales (1 <= timesUniverse < 1000)
      expect(formatDuration(AGE_OF_UNIVERSE)).toBe("1 × Age of the Universe");
      expect(formatDuration(1.5 * AGE_OF_UNIVERSE)).toBe("1.5 × Age of the Universe");
      expect(formatDuration(14.2 * AGE_OF_UNIVERSE)).toBe("14.2 × Age of the Universe");
      expect(formatDuration(500 * AGE_OF_UNIVERSE)).toBe("500 × Age of the Universe");
      expect(formatDuration(999.9 * AGE_OF_UNIVERSE)).toBe("999.9 × Age of the Universe");

      // Astronomical / exponential notation scales (timesUniverse >= 1000 or years >= 1e13)
      expect(formatDuration(1000 * AGE_OF_UNIVERSE)).toBe("1.38e+13 years");
      expect(formatDuration(2000 * AGE_OF_UNIVERSE)).toBe("2.76e+13 years");
      expect(formatDuration(1e14 * YEAR)).toBe("1.00e+14 years");
      expect(formatDuration(1e20 * YEAR)).toBe("1.00e+20 years");
      expect(formatDuration(3.40e28 * YEAR)).toBe("3.40e+28 years");
    });

    it("handles boundary transitions across millisecond, second, minute, hour, day, and year spans", () => {
      expect(formatDuration(0.0001)).toBe("Less than 1 millisecond");
      expect(formatDuration(0.0009)).toBe("Less than 1 millisecond");
      expect(formatDuration(0.001)).toBe("1 millisecond");
      expect(formatDuration(0.002)).toBe("2 milliseconds");
      expect(formatDuration(0.999)).toBe("999 milliseconds");
      expect(formatDuration(1)).toBe("1 second");
      expect(formatDuration(2)).toBe("2 seconds");
      expect(formatDuration(59)).toBe("59 seconds");
      expect(formatDuration(60)).toBe("1 minute");
      expect(formatDuration(120)).toBe("2 minutes");
      expect(formatDuration(3599)).toBe("60 minutes");
      expect(formatDuration(3600)).toBe("1 hour");
      expect(formatDuration(7200)).toBe("2 hours");
      expect(formatDuration(86400)).toBe("1 day");
      expect(formatDuration(172800)).toBe("2 days");
      expect(formatDuration(31557600)).toBe("1 year");
      expect(formatDuration(2 * 31557600)).toBe("2 years");
      expect(formatDuration(99 * 31557600)).toBe("99 years");
      expect(formatDuration(100 * 31557600)).toBe("100 years");
      expect(formatDuration(999 * 31557600)).toBe("999 years");
      expect(formatDuration(1000 * 31557600)).toBe("1 thousand years");
      expect(formatDuration(999999 * 31557600)).toBe("1000 thousand years");
      expect(formatDuration(1000000 * 31557600)).toBe("1 million years");
      expect(formatDuration(1000000000 * 31557600)).toBe("1 billion years");
    });

    it("handles edge cases such as negative numbers and NaN correctly", () => {
      expect(formatDuration(-10)).toBe("Instantaneous");
      expect(formatDuration(-0.5)).toBe("Instantaneous");
      expect(formatDuration(NaN)).toBe("Unknown");
      expect(formatDuration(undefined as any)).toBe("Unknown");
    });
  });

  describe("formatPercentage", () => {
    it("formats percentage with default options", () => {
      expect(formatPercentage(12.345)).toBe("12.3%");
      expect(formatPercentage(-5.67)).toBe("-5.7%");
    });

    it("supports sign inclusion and custom precision", () => {
      expect(formatPercentage(12.345, 2, true)).toBe("+12.35%");
      expect(formatPercentage(-5.67, 2, true)).toBe("-5.67%");
    });

    it("handles fallback for undefined", () => {
      expect(formatPercentage(undefined)).toBe("N/A");
    });
  });

  describe("formatMilliseconds", () => {
    it("formats milliseconds with default and custom decimals", () => {
      expect(formatMilliseconds(1.23456)).toBe("1.2346 ms");
      expect(formatMilliseconds(1.23456, 2)).toBe("1.23 ms");
    });

    it("handles fallback for undefined", () => {
      expect(formatMilliseconds(undefined)).toBe("N/A");
    });
  });

  describe("formatNumber & formatOperationsPerSecond", () => {
    it("formats numbers with comma separators", () => {
      expect(formatNumber(1234567)).toBe("1,234,567");
      expect(formatOperationsPerSecond(1000000)).toBe("1,000,000");
    });

    it("handles fallbacks", () => {
      expect(formatNumber(undefined)).toBe("N/A");
      expect(formatOperationsPerSecond(NaN)).toBe("N/A");
    });
  });

  describe("formatThroughput", () => {
    it("formats byte rate per second", () => {
      expect(formatThroughput(1024 * 1024)).toBe("1.00 MB/s");
      expect(formatThroughput(500)).toBe("500 B/s");
      expect(formatThroughput(2048)).toBe("2.00 KB/s");
      expect(formatThroughput(1024 * 1024 * 1024)).toBe("1.00 GB/s");
      expect(formatThroughput(1024 * 1024 * 1024 * 1024)).toBe("1.00 TB/s");
    });

    it("handles fallback for undefined and invalid numbers", () => {
      expect(formatThroughput(undefined)).toBe("N/A");
      expect(formatThroughput(NaN)).toBe("N/A");
      expect(formatThroughput(Infinity)).toBe("N/A");
      expect(formatThroughput(undefined, "CustomFallback")).toBe("CustomFallback");
    });
  });

  describe("exhaustive boundary values and comprehensive formatting matrices", () => {
    it("formats byte sizes across the full binary magnitude spectrum", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(1)).toBe("1 B");
      expect(formatBytes(1023)).toBe("1023 B");
      expect(formatBytes(1024)).toBe("1.00 KB");
      expect(formatBytes(1024 * 1.5)).toBe("1.50 KB");
      expect(formatBytes(1024 * 1024 - 1)).toBe("1024.00 KB");
      expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1.00 GB");
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe("1.00 TB");
      expect(formatBytes(1024 * 1024 * 1024 * 1024 * 1024)).toBe("1024.00 TB");
    });

    it("formats negative byte sizes appropriately", () => {
      expect(formatBytes(-1)).toBe("-1 B");
      expect(formatBytes(-1024)).toBe("-1.00 KB");
      expect(formatBytes(-1048576)).toBe("-1.00 MB");
      expect(formatBytes(-1073741824)).toBe("-1.00 GB");
    });

    it("formats percentages with varying precision and signs", () => {
      expect(formatPercentage(0)).toBe("0.0%");
      expect(formatPercentage(0, 2)).toBe("0.00%");
      expect(formatPercentage(0, 0)).toBe("0%");
      expect(formatPercentage(100)).toBe("100.0%");
      expect(formatPercentage(99.999, 2)).toBe("100.00%");
      expect(formatPercentage(0.12345, 3)).toBe("0.123%");
      expect(formatPercentage(50, 1, true)).toBe("+50.0%");
      expect(formatPercentage(-50, 1, true)).toBe("-50.0%");
      expect(formatPercentage(0, 1, true)).toBe("0.0%");
    });

    it("formats numbers with locale thousands separators", () => {
      expect(formatNumber(0)).toBe("0");
      expect(formatNumber(100)).toBe("100");
      expect(formatNumber(1000)).toBe("1,000");
      expect(formatNumber(1000000)).toBe("1,000,000");
      expect(formatNumber(9876543210)).toBe("9,876,543,210");
      expect(formatNumber(-1234567)).toBe("-1,234,567");
    });

    it("formats duration scaling across multiple orders of magnitude", () => {
      const secInYear = 31557600;
      const ageOfUniverse = 1.38e10 * secInYear;

      // Seconds & minutes
      expect(formatDuration(0.00001)).toBe("Less than 1 millisecond");
      expect(formatDuration(0.0005)).toBe("Less than 1 millisecond");
      expect(formatDuration(0.001)).toBe("1 millisecond");
      expect(formatDuration(0.5)).toBe("500 milliseconds");
      expect(formatDuration(1.0)).toBe("1 second");
      expect(formatDuration(1.1)).toBe("1.1 seconds");
      expect(formatDuration(30)).toBe("30 seconds");
      expect(formatDuration(60)).toBe("1 minute");
      expect(formatDuration(90)).toBe("1.5 minutes");
      expect(formatDuration(3600)).toBe("1 hour");
      expect(formatDuration(5400)).toBe("1.5 hours");
      expect(formatDuration(86400)).toBe("1 day");
      expect(formatDuration(129600)).toBe("1.5 days");

      // Years
      expect(formatDuration(secInYear)).toBe("1 year");
      expect(formatDuration(secInYear * 1.5)).toBe("1.5 years");
      expect(formatDuration(secInYear * 25)).toBe("25 years");
      expect(formatDuration(secInYear * 250)).toBe("250 years");
      expect(formatDuration(secInYear * 2500)).toBe("2.5 thousand years");
      expect(formatDuration(secInYear * 2500000)).toBe("2.5 million years");
      expect(formatDuration(secInYear * 2500000000)).toBe("2.5 billion years");

      // Universe Lifetimes
      expect(formatDuration(ageOfUniverse * 1)).toBe("1 × Age of the Universe");
      expect(formatDuration(ageOfUniverse * 2.5)).toBe("2.5 × Age of the Universe");
      expect(formatDuration(ageOfUniverse * 999)).toBe("999 × Age of the Universe");
      expect(formatDuration(ageOfUniverse * 1000)).toBe("1.38e+13 years");
      expect(formatDuration(ageOfUniverse * 10000)).toBe("1.38e+14 years");
      expect(formatDuration(secInYear * 1e25)).toBe("1.00e+25 years");
      expect(formatDuration(secInYear * 1e100)).toBe("1.00e+100 years");
    });
  });

  describe("fuzz and invariant tests for formatters", () => {
    it("never throws for arbitrary numerical inputs in formatBytes", () => {
      const sampleInputs = [
        0, 1, -1, 1024, -1024, 0.5, -0.5, 1e15, -1e15, 1e-10,
        Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Infinity, -Infinity, NaN
      ];
      for (const val of sampleInputs) {
        expect(() => formatBytes(val)).not.toThrow();
        const formatted = formatBytes(val);
        expect(typeof formatted).toBe("string");
      }
    });

    it("never throws for arbitrary numerical inputs in formatDuration", () => {
      const sampleInputs = [
        0, 1, -1, 0.00001, 100, 1e6, 1e12, 1e20, 1e50, 1e300,
        Infinity, -Infinity, NaN, -100
      ];
      for (const val of sampleInputs) {
        expect(() => formatDuration(val)).not.toThrow();
        const formatted = formatDuration(val);
        expect(typeof formatted).toBe("string");
        expect(formatted.length).toBeGreaterThan(0);
      }
    });

    it("never throws for arbitrary inputs in formatPercentage", () => {
      const sampleInputs = [
        0, 100, -100, 0.001, 99.999, 12345.678, -54321.123,
        Infinity, -Infinity, NaN, undefined as any
      ];
      for (const val of sampleInputs) {
        expect(() => formatPercentage(val)).not.toThrow();
        const formatted = formatPercentage(val);
        expect(typeof formatted).toBe("string");
      }
    });

    it("never throws for arbitrary inputs in formatMilliseconds", () => {
      const sampleInputs = [
        0, 0.1, 1.23456, 1000, -50, Infinity, -Infinity, NaN, undefined as any
      ];
      for (const val of sampleInputs) {
        expect(() => formatMilliseconds(val)).not.toThrow();
        const formatted = formatMilliseconds(val);
        expect(typeof formatted).toBe("string");
      }
    });

    it("never throws for arbitrary inputs in formatThroughput", () => {
      const sampleInputs = [
        0, 512, 1024, 1048576, 1e9, 1e12, -1024, Infinity, -Infinity, NaN, undefined as any
      ];
      for (const val of sampleInputs) {
        expect(() => formatThroughput(val)).not.toThrow();
        const formatted = formatThroughput(val);
        expect(typeof formatted).toBe("string");
      }
    });
  });
});


