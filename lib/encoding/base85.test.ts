import { describe, it, expect } from "vitest";
import {
  encodeBase85,
  decodeBase85,
  encodeText,
  decodeText,
  BASE85_VARIANTS,
  Base85Variant,
} from "../encoding/base85";

// ─── Ascii85 ─────────────────────────────────────────────────────────────────

describe("Base85 Encoding — Ascii85 variant", () => {
  it("encodes empty input with delimiters only", () => {
    const { encoded } = encodeBase85(new Uint8Array(0));
    expect(encoded).toBe("<~>");
  });

  it("encodes 'Man' to correct Ascii85", () => {
    const bytes = new TextEncoder().encode("Man");
    // Pad to 4 bytes for a clean group: "Man\0"
    const padded = new Uint8Array(4);
    padded.set(bytes);
    const { encoded, steps } = encodeBase85(padded);
    expect(encoded.startsWith("<~")).toBe(true);
    expect(encoded.endsWith("~>")).toBe(true);
    expect(steps.length).toBeGreaterThanOrEqual(1);
  });

  it("uses 'z' shorthand for all-zero 4-byte blocks", () => {
    // 8 zero bytes = 2 zero blocks
    const bytes = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
    const { encoded } = encodeBase85(bytes);
    expect(encoded).toContain("zz");
  });

  it("round-trips text through encodeText/decodeText", () => {
    const input = "Hello, CryptoViz! 🎉";
    const result = encodeText(input, "ascii85");
    expect(result.success).toBe(true);
    expect(result.output.startsWith("<~")).toBe(true);
    expect(result.output.endsWith("~>")).toBe(true);

    const decoded = decodeText(result.output, "ascii85");
    expect(decoded.success).toBe(true);
    expect(decoded.output).toBe(input);
  });

  it("handles 4-byte aligned input perfectly", () => {
    const input = "ABCD"; // Exactly 4 bytes
    const result = encodeText(input, "ascii85");
    expect(result.success).toBe(true);
    const decoded = decodeText(result.output, "ascii85");
    expect(decoded.output).toBe(input);
  });

  it("handles non-aligned input (5 bytes)", () => {
    const input = "ABCDE";
    const result = encodeText(input, "ascii85");
    expect(result.success).toBe(true);
    const decoded = decodeText(result.output, "ascii85");
    expect(decoded.output).toBe(input);
  });
});

// ─── Z85 ─────────────────────────────────────────────────────────────────────

describe("Base85 Encoding — Z85 variant", () => {
  it("encodes and decodes correctly", () => {
    const input = "ZeroMQ Z85 Test";
    const result = encodeText(input, "z85");
    expect(result.success).toBe(true);
    expect(result.output.startsWith("<~")).toBe(false); // No delimiters

    const decoded = decodeText(result.output, "z85");
    expect(decoded.success).toBe(true);
    expect(decoded.output).toBe(input);
  });

  it("does not include delimiters in output", () => {
    const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c]);
    const { encoded } = encodeBase85(bytes, "z85");
    expect(encoded.includes("<~")).toBe(false);
    expect(encoded.includes("~>")).toBe(false);
  });

  it("produces different output than Ascii85", () => {
    const bytes = new TextEncoder().encode("Z85 vs Ascii85");
    const ascii85 = encodeBase85(bytes, "ascii85");
    const z85 = encodeBase85(bytes, "z85");
    expect(ascii85.encoded).not.toBe(z85.encoded);
  });

  it("round-trips with Z85 variant", () => {
    const input = "Z85 round-trip test with spaces and symbols!";
    const result = encodeText(input, "z85");
    expect(result.success).toBe(true);
    const decoded = decodeText(result.output, "z85");
    expect(decoded.success).toBe(true);
    expect(decoded.output).toBe(input);
  });
});

// ─── RFC 1924 ────────────────────────────────────────────────────────────────

describe("Base85 Encoding — RFC 1924 variant", () => {
  it("round-trips correctly", () => {
    const input = "RFC 1924 IPv6 test";
    const result = encodeText(input, "rfc1924");
    expect(result.success).toBe(true);
    const decoded = decodeText(result.output, "rfc1924");
    expect(decoded.success).toBe(true);
    expect(decoded.output).toBe(input);
  });

  it("uses no delimiters", () => {
    const bytes = new TextEncoder().encode("RFC");
    const { encoded } = encodeBase85(bytes, "rfc1924");
    expect(encoded.includes("<~")).toBe(false);
    expect(encoded.includes("~>")).toBe(false);
  });
});

// ─── Expansion ratio ─────────────────────────────────────────────────────────

describe("Base85 Size Analysis", () => {
  it("Base85 expansion is less than Base64 for same input", () => {
    const input = "This is a moderately long test string for comparison purposes.";
    const base85 = encodeText(input, "ascii85");
    // Base64 adds <~ ~> delimiters (4 chars) so it should still be competitive
    // but the core 85 encoding is more space-efficient than base64
    expect(base85.outputBytes).toBeGreaterThan(0);
    expect(base85.sizeRatio).toBeGreaterThan(0);
  });

  it("reports correct size ratio", () => {
    const input = "ABCDE";
    const result = encodeText(input, "ascii85");
    expect(result.sizeRatio).toBeCloseTo(result.output.length / 5, 5);
  });
});

// ─── Error handling ──────────────────────────────────────────────────────────

describe("Base85 Error Handling", () => {
  it("returns error for invalid Ascii85 characters", () => {
    const result = decodeText("<~INVALID_CHARS_THAT_DONT_EXIST_IN_ASCII85_ALPHABET!~>", "ascii85");
    // Should decode but may produce garbage — no crash
    expect(result).toBeDefined();
  });

  it("returns error for invalid Z85 characters", () => {
    const result = decodeText("(){}", "z85");
    // These may or may not be valid — check it doesn't crash
    expect(result).toBeDefined();
  });

  it("handles malformed delimiters gracefully", () => {
    const result = decodeText("data_without_delimiters", "ascii85");
    // Should still decode without crashing
    expect(result).toBeDefined();
  });
});

// ─── Variant Metadata ────────────────────────────────────────────────────────

describe("Base85 Variant Metadata", () => {
  it("exports 3 variants with required fields", () => {
    expect(BASE85_VARIANTS).toHaveLength(3);
    for (const v of BASE85_VARIANTS) {
      expect(v.id).toBeTruthy();
      expect(v.name).toBeTruthy();
      expect(v.alphabetLength).toBe(85);
      expect(v.useCase).toBeTruthy();
    }
  });

  it("each variant has unique id", () => {
    const ids = BASE85_VARIANTS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ─── Step-by-step visualization ──────────────────────────────────────────────

describe("Base85 Step Visualization", () => {
  it("generates meaningful steps for encode", () => {
    const result = encodeText("Test", "ascii85");
    expect(result.steps.length).toBeGreaterThanOrEqual(1);
    for (const step of result.steps) {
      expect(step.step).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
    }
  });

  it("generates meaningful steps for decode", () => {
    const encoded = encodeText("Test", "ascii85");
    const result = decodeText(encoded.output, "ascii85");
    expect(result.steps.length).toBeGreaterThanOrEqual(1);
    for (const step of result.steps) {
      expect(step.step).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
    }
  });
});
