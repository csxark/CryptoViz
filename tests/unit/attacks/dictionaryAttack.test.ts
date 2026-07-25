import { describe, expect, it } from "vitest";
import {
  DEFAULT_DICTIONARY,
  buildDemoTarget,
  estimateDictionaryRisk,
  hashCandidate,
  normalizeHash,
  parseDictionaryText,
  runDictionaryAttack,
} from "../../../lib/attacks/dictionaryAttack";

describe("dictionary attack simulator utilities", () => {
  it("hashes candidates deterministically", () => {
    expect(hashCandidate("password123", "fnv1a32")).toBe(
      hashCandidate("password123", "fnv1a32"),
    );
    expect(hashCandidate("password123", "djb2")).toBe(
      hashCandidate("password123", "djb2"),
    );
    expect(hashCandidate("password123", "checksum16")).toMatch(/^[a-f0-9]{4}$/);
  });

  it("parses newline and comma separated dictionaries with de-duplication", () => {
    expect(parseDictionaryText("admin\npassword, admin\nstudent")).toEqual([
      "admin",
      "password",
      "student",
    ]);
  });

  it("finds a password from the default dictionary", () => {
    const targetHash = buildDemoTarget("password123", "fnv1a32");
    const result = runDictionaryAttack({
      targetHash,
      candidates: DEFAULT_DICTIONARY,
      algorithm: "fnv1a32",
    });

    expect(result.found).toBe(true);
    expect(result.matchedPassword).toBe("password123");
    expect(result.attempts.at(-1)?.matched).toBe(true);
  });

  it("returns no match when the candidate is absent", () => {
    const targetHash = buildDemoTarget("not-in-list", "djb2");
    const result = runDictionaryAttack({
      targetHash,
      candidates: ["alpha", "beta", "gamma"],
      algorithm: "djb2",
    });

    expect(result.found).toBe(false);
    expect(result.matchedPassword).toBeNull();
    expect(result.attempts).toHaveLength(3);
  });

  it("normalizes hexadecimal target hashes", () => {
    expect(normalizeHash("  0xABCD1234  ")).toBe("abcd1234");
  });

  it("rejects empty and non-hex target hashes", () => {
    expect(() =>
      runDictionaryAttack({
        targetHash: "",
        candidates: ["password"],
        algorithm: "fnv1a32",
      }),
    ).toThrow(/target hash is required/i);

    expect(() =>
      runDictionaryAttack({
        targetHash: "not-a-hex-hash",
        candidates: ["password"],
        algorithm: "fnv1a32",
      }),
    ).toThrow(/hexadecimal/i);
  });

  it("rejects empty dictionaries and oversized dictionaries", () => {
    expect(() =>
      runDictionaryAttack({
        targetHash: "abcd",
        candidates: [],
        algorithm: "checksum16",
      }),
    ).toThrow(/at least one dictionary candidate/i);

    expect(() =>
      runDictionaryAttack({
        targetHash: "abcd",
        candidates: Array.from({ length: 2001 }, (_, index) => `word-${index}`),
        algorithm: "checksum16",
      }),
    ).toThrow(/dictionary is too large/i);
  });

  it("estimates risk based on how quickly the match appears", () => {
    expect(estimateDictionaryRisk(true, 0, 10)).toBe("high");
    expect(estimateDictionaryRisk(true, 5, 10)).toBe("medium");
    expect(estimateDictionaryRisk(true, 9, 10)).toBe("low");
    expect(estimateDictionaryRisk(false, -1, 10)).toBe("low");
  });
});
