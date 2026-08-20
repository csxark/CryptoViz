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
    });

    it("handles fallback for undefined", () => {
      expect(formatThroughput(undefined)).toBe("N/A");
    });
  });
});
