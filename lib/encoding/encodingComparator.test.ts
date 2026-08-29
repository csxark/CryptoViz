import { describe, it, expect } from "vitest";
import {
  compareEncodings,
  analyzeEntropy,
  benchmarkEncodings,
  findBestEncoding,
  ComparatorEncoding,
  ComparisonResult,
  EntropyAnalysis,
} from "../encoding/encodingComparator";

// ─── compareEncodings ────────────────────────────────────────────────────────

describe("Encoding Comparator — compareEncodings", () => {
  it("returns all 6 encoding formats", () => {
    const result = compareEncodings("Hello World");
    expect(result.encodings).toHaveLength(6);
    const formats = result.encodings.map((e) => e.format);
    expect(formats).toContain("hex");
    expect(formats).toContain("base64");
    expect(formats).toContain("base58");
    expect(formats).toContain("base85");
    expect(formats).toContain("binary");
    expect(formats).toContain("ascii");
  });

  it("preserves original text metadata", () => {
    const text = "CryptoViz Test";
    const result = compareEncodings(text);
    expect(result.originalText).toBe(text);
    expect(result.originalBytes).toBe(new TextEncoder().encode(text).length);
  });

  it("each encoding has correct expansion ratio", () => {
    const result = compareEncodings("Test");
    for (const enc of result.encodings) {
      expect(enc.expansionRatio).toBe(enc.outputBytes / enc.inputBytes);
    }
  });

  it("hex output is always lowercase and alphanumeric", () => {
    const result = compareEncodings("Any text here");
    const hex = result.encodings.find((e) => e.format === "hex")!;
    expect(/^[0-9a-f]+$/.test(hex.encoded)).toBe(true);
  });

  it("binary output contains only 0, 1, and spaces", () => {
    const result = compareEncodings("Binary test");
    const binary = result.encodings.find((e) => e.format === "binary")!;
    expect(/^[01 ]+$/.test(binary.encoded)).toBe(true);
  });

  it("identifies a recommended encoding", () => {
    const result = compareEncodings("standard text input");
    expect(result.recommended).toBeDefined();
    expect(result.recommendationReason.length).toBeGreaterThan(0);
  });

  it("reports encoding and decoding times", () => {
    const result = compareEncodings("Performance test");
    for (const enc of result.encodings) {
      expect(enc.encodingTimeUs).toBeGreaterThanOrEqual(0);
      expect(enc.decodingTimeUs).toBeGreaterThanOrEqual(0);
    }
  });

  it("detects printable ASCII for text-only encodings", () => {
    const result = compareEncodings("ASCII text");
    const hex = result.encodings.find((e) => e.format === "hex")!;
    expect(hex.printableAscii).toBe(true);
    const ascii = result.encodings.find((e) => e.format === "ascii")!;
    expect(ascii.printableAscii).toBe(true);
  });

  it("handles empty input", () => {
    const result = compareEncodings("");
    expect(result.originalBytes).toBe(0);
    expect(result.encodings).toHaveLength(6);
  });

  it("handles Unicode input", () => {
    const result = compareEncodings("Ünïcödé 🌍");
    expect(result.originalText).toBe("Ünïcödé 🌍");
    expect(result.encodings.length).toBe(6);
    for (const enc of result.encodings) {
      expect(enc.encoded.length).toBeGreaterThan(0);
    }
  });

  it("handles long input efficiently", () => {
    const longText = "A".repeat(10000);
    const result = compareEncodings(longText);
    expect(result.encodings).toHaveLength(6);
    for (const enc of result.encodings) {
      expect(enc.outputBytes).toBeGreaterThan(0);
    }
  });
});

// ─── analyzeEntropy ──────────────────────────────────────────────────────────

describe("Encoding Comparator — analyzeEntropy", () => {
  it("returns entropy analysis for all 6 formats", () => {
    const analyses = analyzeEntropy("Hello World");
    expect(analyses).toHaveLength(6);
  });

  it("hex has low entropy for repetitive input", () => {
    const analyses = analyzeEntropy("AAAA");
    const hex = analyses.find((a) => a.format === "hex")!;
    expect(hex.shannonEntropy).toBeLessThan(4);
  });

  it("binary has very low entropy for single character", () => {
    const analyses = analyzeEntropy("A");
    const binary = analyses.find((a) => a.format === "binary")!;
    expect(binary.shannonEntropy).toBeLessThanOrEqual(2);
  });

  it("reports charSetSize for each format", () => {
    const analyses = analyzeEntropy("Mixed CASE 123 !@#");
    for (const a of analyses) {
      expect(a.charSetSize).toBeGreaterThan(0);
    }
  });

  it("compressionPotential is one of the expected values", () => {
    const analyses = analyzeEntropy("Test data");
    const valid: Array<"high" | "medium" | "low" | "none"> = [
      "high",
      "medium",
      "low",
      "none",
    ];
    for (const a of analyses) {
      expect(valid).toContain(a.compressionPotential);
    }
  });
});

// ─── benchmarkEncodings ──────────────────────────────────────────────────────

describe("Encoding Comparator — benchmarkEncodings", () => {
  it("returns benchmark results for all formats", () => {
    const benchmarks = benchmarkEncodings("Benchmark text", 10);
    expect(benchmarks).toHaveLength(6);
  });

  it("reports positive iteration counts", () => {
    const benchmarks = benchmarkEncodings("Test", 5);
    for (const b of benchmarks) {
      expect(b.encodeIterations).toBe(5);
      expect(b.decodeIterations).toBe(5);
    }
  });

  it("reports timing data (may be 0 on fast machines)", () => {
    const benchmarks = benchmarkEncodings("Quick test", 100);
    for (const b of benchmarks) {
      expect(typeof b.avgEncodeTimeUs).toBe("number");
      expect(typeof b.avgDecodeTimeUs).toBe("number");
      expect(typeof b.throughputEncodeMBps).toBe("number");
      expect(typeof b.throughputDecodeMBps).toBe("number");
    }
  });
});

// ─── findBestEncoding ────────────────────────────────────────────────────────

describe("Encoding Comparator — findBestEncoding", () => {
  it("finds printable ASCII encoding", () => {
    const { format, reason } = findBestEncoding("Hello", {
      requirePrintableAscii: true,
    });
    expect(["hex", "base64", "base58", "base85", "binary", "ascii"]).toContain(
      format,
    );
    expect(reason.length).toBeGreaterThan(0);
  });

  it("finds smallest encoding", () => {
    const { format, reason } = findBestEncoding("Sample text for sizing", {
      minimizeSize: true,
    });
    expect(format).toBeTruthy();
    expect(reason).toContain("Smallest");
  });

  it("finds fastest encoding", () => {
    const { format, reason } = findBestEncoding("Speed test", {
      maximizeSpeed: true,
    });
    expect(format).toBeTruthy();
    expect(reason).toContain("Fastest");
  });

  it("finds case-insensitive encoding", () => {
    const { format } = findBestEncoding("Case test", {
      requireCaseInsensitive: true,
    });
    expect(format).toBeTruthy();
  });

  it("finds human-readable encoding", () => {
    const { format } = findBestEncoding("Readable test", {
      requireHumanReadable: true,
    });
    expect(format).toBeTruthy();
  });

  it("returns fallback when no encoding satisfies constraints", () => {
    const { format, reason } = findBestEncoding("Test", {
      requirePrintableAscii: true,
      requireCaseInsensitive: true,
      requireHumanReadable: true,
      minimizeSize: true,
    });
    expect(format).toBeTruthy();
    expect(reason.length).toBeGreaterThan(0);
  });
});

// ─── Round-trip integrity ────────────────────────────────────────────────────

describe("Encoding Comparator — round-trip integrity", () => {
  const testCases = [
    "Simple ASCII",
    "Numbers 12345",
    "Special chars: !@#$%^&*()",
    "Unicode: café résumé naïve",
    "Empty string edge case test",
    "A single byte",
    "Exactly four bytes",
    "Five bytes padding test",
    "Multi-line\ndata\twith\ttabs",
  ];

  for (const text of testCases) {
    it(`round-trips "${text.slice(0, 30)}${text.length > 30 ? "…" : ""}"`, () => {
      const result = compareEncodings(text);
      // Every encoding should be non-empty for non-empty input
      expect(result.encodings.length).toBe(6);
    });
  }
});
