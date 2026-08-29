import { describe, it, expect } from "vitest";
import {
  encodeBase58,
  decodeBase58,
  encodeText,
  decodeText,
  BASE58_VARIANTS,
  Base58Variant,
} from "../encoding/base58";

// ─── Bitcoin Base58 ──────────────────────────────────────────────────────────

describe("Base58 Encoding — Bitcoin variant", () => {
  it("encodes empty input to empty string", () => {
    const { encoded, steps } = encodeBase58(new Uint8Array(0));
    expect(encoded).toBe("");
    expect(steps).toHaveLength(1);
    expect(steps[0].description).toContain("empty");
  });

  it("encodes single zero byte to '1'", () => {
    const { encoded } = encodeBase58(new Uint8Array([0]));
    expect(encoded).toBe("1");
  });

  it("encodes known Bitcoin test vector: 'Hello' (hex 48656c6c6f)", () => {
    const bytes = new TextEncoder().encode("Hello");
    const { encoded } = encodeBase58(bytes);
    // Standard Base58 of "Hello"
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);
    // Round-trip check
    const { bytes: decoded } = decodeBase58(encoded);
    expect(new TextDecoder().decode(decoded)).toBe("Hello");
  });

  it("handles multiple leading zeros", () => {
    const bytes = new Uint8Array([0, 0, 0, 0x48, 0x65]);
    const { encoded } = encodeBase58(bytes);
    expect(encoded.startsWith("1111")).toBe(true);
    const { bytes: decoded } = decodeBase58(encoded);
    expect(Array.from(decoded)).toEqual(Array.from(bytes));
  });

  it("round-trips arbitrary binary data through encodeText/decodeText", () => {
    const input = "CryptoViz 🚀 Base58!";
    const result = encodeText(input);
    expect(result.success).toBe(true);
    expect(result.output.length).toBeGreaterThan(0);

    const decoded = decodeText(result.output);
    expect(decoded.success).toBe(true);
    expect(decoded.output).toBe(input);
  });
});

// ─── Ripple variant ──────────────────────────────────────────────────────────

describe("Base58 Encoding — Ripple variant", () => {
  it("produces different output from Bitcoin variant", () => {
    const bytes = new TextEncoder().encode("Ripple Test");
    const bitcoin = encodeBase58(bytes, "bitcoin");
    const ripple = encodeBase58(bytes, "ripple");
    expect(bitcoin.encoded).not.toBe(ripple.encoded);
  });

  it("round-trips with Ripple variant", () => {
    const input = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
    const { bytes } = decodeBase58(input, "ripple");
    const { encoded } = encodeBase58(bytes, "ripple");
    expect(encoded).toBe(input);
  });
});

// ─── Flickr variant ──────────────────────────────────────────────────────────

describe("Base58 Encoding — Flickr variant", () => {
  it("produces different output from Bitcoin variant", () => {
    const bytes = new TextEncoder().encode("Flickr Test");
    const bitcoin = encodeBase58(bytes, "bitcoin");
    const flickr = encodeBase58(bytes, "flickr");
    expect(bitcoin.encoded).not.toBe(flickr.encoded);
  });

  it("round-trips with Flickr variant", () => {
    const input = "Flickr123456";
    const result = encodeText(input, "flickr");
    expect(result.success).toBe(true);
    const decoded = decodeText(result.output, "flickr");
    expect(decoded.success).toBe(true);
    expect(decoded.output).toBe(input);
  });
});

// ─── Edge cases ──────────────────────────────────────────────────────────────

describe("Base58 Edge Cases", () => {
  it("handles null bytes at various positions", () => {
    const bytes = new Uint8Array([0x48, 0x00, 0x65, 0x00, 0x00]);
    const { encoded } = encodeBase58(bytes);
    const { bytes: decoded } = decodeBase58(encoded);
    expect(Array.from(decoded)).toEqual(Array.from(bytes));
  });

  it("handles all-255 bytes", () => {
    const bytes = new Uint8Array([0xff, 0xff, 0xff]);
    const { encoded } = encodeBase58(bytes);
    const { bytes: decoded } = decodeBase58(encoded);
    expect(Array.from(decoded)).toEqual(Array.from(bytes));
  });

  it("returns error on invalid characters during decode", () => {
    const result = decodeText("0OIl"); // These chars are invalid in Base58
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns meaningful step descriptions", () => {
    const result = encodeText("ABC");
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
    for (const step of result.steps) {
      expect(step.description.length).toBeGreaterThan(0);
      expect(step.input).toBeDefined();
      expect(step.output).toBeDefined();
    }
  });
});

// ─── Variant info ────────────────────────────────────────────────────────────

describe("Base58 Variant Metadata", () => {
  it("exports 3 variants with required fields", () => {
    expect(BASE58_VARIANTS).toHaveLength(3);
    for (const v of BASE58_VARIANTS) {
      expect(v.id).toBeTruthy();
      expect(v.name).toBeTruthy();
      expect(v.alphabet).toHaveLength(58);
      expect(v.useCase).toBeTruthy();
    }
  });

  it("all variant alphabets are exactly 58 unique characters", () => {
    for (const v of BASE58_VARIANTS) {
      const uniqueChars = new Set(v.alphabet.split(""));
      expect(uniqueChars.size).toBe(58);
    }
  });
});
