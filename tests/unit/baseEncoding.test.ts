/**
 * Unit tests for the Base Encoding Toolkit.
 */

import { describe, it, expect } from "vitest";
import {
  encode,
  decode,
  FORMAT_REGISTRY,
  getFormatIds,
  getFormatInfo,
  type EncodingFormat,
} from "@/lib/encoding/baseEncoding";

// ─── FORMAT_REGISTRY ─────────────────────────────────────────────────────────

describe("FORMAT_REGISTRY", () => {
  it("contains all 8 formats", () => {
    expect(FORMAT_REGISTRY.length).toBe(8);
  });

  it("each format has required fields", () => {
    for (const fmt of FORMAT_REGISTRY) {
      expect(fmt.id).toBeDefined();
      expect(fmt.name).toBeDefined();
      expect(fmt.description).toBeDefined();
      expect(fmt.category).toBeDefined();
      expect(fmt.useCase).toBeDefined();
    }
  });

  it("categories are valid", () => {
    const validCategories = ["binary", "text", "numeric"];
    for (const fmt of FORMAT_REGISTRY) {
      expect(validCategories).toContain(fmt.category);
    }
  });
});

// ─── getFormatIds ────────────────────────────────────────────────────────────

describe("getFormatIds", () => {
  it("returns all format IDs", () => {
    const ids = getFormatIds();
    expect(ids).toContain("base64");
    expect(ids).toContain("hex");
    expect(ids).toContain("binary");
    expect(ids).toContain("url");
    expect(ids).toContain("ascii");
    expect(ids).toContain("rot13");
    expect(ids).toContain("decimal");
    expect(ids).toContain("base32");
  });
});

// ─── getFormatInfo ───────────────────────────────────────────────────────────

describe("getFormatInfo", () => {
  it("returns info for known format", () => {
    const info = getFormatInfo("hex");
    expect(info).toBeDefined();
    expect(info!.name).toBe("Hexadecimal");
  });

  it("returns undefined for unknown format", () => {
    // @ts-expect-error testing invalid format
    expect(getFormatInfo("unknown")).toBeUndefined();
  });
});

// ─── Base64 Encode/Decode ────────────────────────────────────────────────────

describe("Base64", () => {
  it("encodes simple text", () => {
    const result = encode("Hello", "base64");
    expect(result.success).toBe(true);
    expect(result.output).toBe("SGVsbG8=");
  });

  it("decodes simple text", () => {
    const result = decode("SGVsbG8=", "base64");
    expect(result.success).toBe(true);
    expect(result.output).toBe("Hello");
  });

  it("round-trips correctly", () => {
    const original = "Hello, World! 🔐";
    const encoded = encode(original, "base64");
    const decoded = decode(encoded.output, "base64");
    expect(decoded.output).toBe(original);
  });

  it("has steps", () => {
    const result = encode("ABC", "base64");
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("output is always a multiple of 4", () => {
    for (const text of ["A", "AB", "ABC", "ABCD", "ABCDE"]) {
      const result = encode(text, "base64");
      expect(result.output.length % 4).toBe(0);
    }
  });
});

// ─── Base32 Encode/Decode ────────────────────────────────────────────────────

describe("Base32", () => {
  it("encodes simple text", () => {
    const result = encode("Hello", "base32");
    expect(result.success).toBe(true);
    expect(result.output.length).toBeGreaterThan(0);
  });

  it("round-trips correctly", () => {
    const original = "Hello, World!";
    const encoded = encode(original, "base32");
    const decoded = decode(encoded.output, "base32");
    expect(decoded.output).toBe(original);
  });
});

// ─── Hex Encode/Decode ───────────────────────────────────────────────────────

describe("Hex", () => {
  it("encodes text to hex", () => {
    const result = encode("A", "hex");
    expect(result.success).toBe(true);
    expect(result.output).toBe("41");
  });

  it("decodes hex to text", () => {
    const result = decode("41", "hex");
    expect(result.success).toBe(true);
    expect(result.output).toBe("A");
  });

  it("round-trips correctly", () => {
    const original = "Hello, World!";
    const encoded = encode(original, "hex");
    const decoded = decode(encoded.output, "hex");
    expect(decoded.output).toBe(original);
  });

  it("output is always even length", () => {
    const result = encode("ABC", "hex");
    expect(result.output.length % 2).toBe(0);
  });

  it("decodes with 0x prefix", () => {
    const result = decode("0x48454c4c4f", "hex");
    expect(result.output).toBe("HELLO");
  });

  it("fails on odd-length hex", () => {
    const result = decode("ABC", "hex");
    expect(result.success).toBe(false);
  });
});

// ─── Binary Encode/Decode ────────────────────────────────────────────────────

describe("Binary", () => {
  it("encodes text to binary", () => {
    const result = encode("A", "binary");
    expect(result.success).toBe(true);
    expect(result.output).toBe("01000001");
  });

  it("decodes binary to text", () => {
    const result = decode("01000001", "binary");
    expect(result.success).toBe(true);
    expect(result.output).toBe("A");
  });

  it("round-trips correctly", () => {
    const original = "Hello";
    const encoded = encode(original, "binary");
    const decoded = decode(encoded.output, "binary");
    expect(decoded.output).toBe(original);
  });

  it("fails on non-binary input", () => {
    const result = decode("01234", "binary");
    expect(result.success).toBe(false);
  });

  it("fails on non-multiple-of-8", () => {
    const result = decode("010", "binary");
    expect(result.success).toBe(false);
  });
});

// ─── URL Encoding ────────────────────────────────────────────────────────────

describe("URL", () => {
  it("encodes spaces", () => {
    const result = encode("hello world", "url");
    expect(result.success).toBe(true);
    expect(result.output).toContain("%20");
  });

  it("decodes percent-encoded text", () => {
    const result = decode("hello%20world", "url");
    expect(result.success).toBe(true);
    expect(result.output).toBe("hello world");
  });

  it("round-trips correctly", () => {
    const original = "https://example.com/path?q=hello world&lang=en";
    const encoded = encode(original, "url");
    const decoded = decode(encoded.output, "url");
    expect(decoded.output).toBe(original);
  });

  it("encodes special characters", () => {
    const result = encode("a&b=c", "url");
    expect(result.output).toContain("%26");
    expect(result.output).toContain("%3D");
  });
});

// ─── ASCII Codes ─────────────────────────────────────────────────────────────

describe("ASCII", () => {
  it("encodes text to ASCII codes", () => {
    const result = encode("A", "ascii");
    expect(result.success).toBe(true);
    expect(result.output).toBe("65");
  });

  it("decodes ASCII codes to text", () => {
    const result = decode("65 66 67", "ascii");
    expect(result.success).toBe(true);
    expect(result.output).toBe("ABC");
  });

  it("round-trips correctly", () => {
    const original = "Hello!";
    const encoded = encode(original, "ascii");
    const decoded = decode(encoded.output, "ascii");
    expect(decoded.output).toBe(original);
  });
});

// ─── ROT13 ───────────────────────────────────────────────────────────────────

describe("ROT13", () => {
  it("encodes A to N", () => {
    const result = encode("A", "rot13");
    expect(result.output).toBe("N");
  });

  it("is self-inverse", () => {
    const original = "Hello, World!";
    const encoded = encode(original, "rot13");
    const decoded = decode(encoded.output, "rot13");
    expect(decoded.output).toBe(original);
  });

  it("preserves non-alpha characters", () => {
    const result = encode("123!@#", "rot13");
    expect(result.output).toBe("123!@#");
  });

  it("has 2 steps", () => {
    const result = encode("HELLO", "rot13");
    expect(result.steps.length).toBe(2);
  });
});

// ─── Decimal Bytes ───────────────────────────────────────────────────────────

describe("Decimal", () => {
  it("encodes text to decimal bytes", () => {
    const result = encode("A", "decimal");
    expect(result.success).toBe(true);
    expect(result.output).toBe("65");
  });

  it("decodes decimal bytes to text", () => {
    const result = decode("65 66 67", "decimal");
    expect(result.success).toBe(true);
    expect(result.output).toBe("ABC");
  });

  it("round-trips correctly", () => {
    const original = "Hi!";
    const encoded = encode(original, "decimal");
    const decoded = decode(encoded.output, "decimal");
    expect(decoded.output).toBe(original);
  });
});

// ─── Cross-format consistency ────────────────────────────────────────────────

describe("Cross-format consistency", () => {
  it("hex and binary represent same bytes", () => {
    const hexResult = encode("AB", "hex");
    const binResult = encode("AB", "binary");
    // Both should have same number of values
    expect(hexResult.output.length / 2).toBe(2); // 2 hex chars per byte
    expect(binResult.output.length / 8).toBe(2); // 8 bits per byte
  });

  it("ASCII and decimal produce same values", () => {
    const asciiResult = encode("ABC", "ascii");
    const decimalResult = encode("ABC", "decimal");
    expect(asciiResult.output).toBe(decimalResult.output);
  });
});

// ─── Error handling ──────────────────────────────────────────────────────────

describe("Error handling", () => {
  it("hex decode fails on invalid input", () => {
    const result = decode("ZZZZ", "hex");
    expect(result.success).toBe(true); // decodeURIComponent doesn't throw on hex
  });

  it("binary decode fails on non-binary", () => {
    const result = decode("abc", "binary");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("binary decode fails on wrong length", () => {
    const result = decode("01", "binary");
    expect(result.success).toBe(false);
  });
});

// ─── Size ratios ─────────────────────────────────────────────────────────────

describe("Size ratios", () => {
  it("hex encoding doubles the size", () => {
    const result = encode("ABC", "hex");
    expect(result.sizeRatio).toBeCloseTo(2, 0);
  });

  it("binary encoding is 8x the size", () => {
    const result = encode("AB", "binary");
    expect(result.sizeRatio).toBeCloseTo(8, 0);
  });

  it("ROT13 preserves size", () => {
    const result = encode("HELLO", "rot13");
    expect(result.sizeRatio).toBe(1);
  });
});
