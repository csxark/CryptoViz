import { describe, expect, it } from "vitest";
import {
  TEST_VECTORS,
  encrypt,
  decrypt,
  xxh32Hex,
} from "../../../../lib/cipher/hash/xxhash";

describe("XXHash32 visualization", () => {
  it("matches known XXH32 vectors", () => {
    for (const vector of TEST_VECTORS) {
      const result = encrypt(vector.input, vector.key);
      expect(result.output).toBe(vector.expected);
      expect(result.outputEncoding).toBe("hex");
    }
  });

  it("supports direct byte hashing helper", () => {
    expect(xxh32Hex(new TextEncoder().encode("abc"), 0)).toBe("32d153ff");
    expect(xxh32Hex(new TextEncoder().encode("Hello, World!"), 1)).toBe(
      "56185396",
    );
  });

  it("creates educational instrumentation steps", () => {
    const result = encrypt("The quick brown fox jumps over the lazy dog", "1", {
      instrument: true,
    });

    expect(result.output).toBe("234f8471");
    expect(result.metadata.name).toBe("XXHash32");
    expect(result.metadata.securityStatus).toBe("deprecated");
    expect(result.steps.length).toBeGreaterThan(6);
    expect(result.steps.map((step) => step.label)).toContain(
      "Avalanche finalization",
    );
    expect(result.steps.some((step) => step.isMilestone)).toBe(true);
  });

  it("accepts hexadecimal seeds", () => {
    expect(encrypt("Hello, World!", "0x1").output).toBe("56185396");
  });

  it("rejects invalid seeds", () => {
    expect(() => encrypt("abc", "not-a-seed")).toThrow(
      /seed must be a decimal integer/i,
    );
  });

  it("does not support decryption", () => {
    expect(() => decrypt()).toThrow(/does not support decryption/i);
  });
});
