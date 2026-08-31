import { describe, it, expect } from "vitest";
import {
  generatePassword,
  generatePasswordCandidates,
  getRecommendedOptions,
  GeneratedPassword,
} from "./passwordGenerator";

// ─── Basic Generation ────────────────────────────────────────────────────────

describe("Password Generator — basic generation", () => {
  it("generates a password with default options", () => {
    const result = generatePassword();
    expect(result.password).toBeTruthy();
    expect(result.length).toBe(16);
    expect(result.password).toHaveLength(16);
    expect(result.entropyBits).toBeGreaterThan(0);
  });

  it("generates password with specified length", () => {
    const result = generatePassword({ length: 32 });
    expect(result.password).toHaveLength(32);
    expect(result.length).toBe(32);
  });

  it("generates password with length 1", () => {
    const result = generatePassword({ length: 1 });
    expect(result.password).toHaveLength(1);
  });

  it("generates different passwords each time", () => {
    const results = Array.from({ length: 10 }, () => generatePassword());
    const passwords = new Set(results.map((r) => r.password));
    expect(passwords.size).toBeGreaterThan(1);
  });
});

// ─── Character Pool Constraints ──────────────────────────────────────────────

describe("Password Generator — character pools", () => {
  it("generates lowercase only", () => {
    const result = generatePassword({
      includeLowercase: true,
      includeUppercase: false,
      includeDigits: false,
      includeSymbols: false,
    });
    expect(result.password).toMatch(/^[a-z]+$/);
    expect(result.charPoolSize).toBe(26);
  });

  it("generates uppercase only", () => {
    const result = generatePassword({
      includeLowercase: false,
      includeUppercase: true,
      includeDigits: false,
      includeSymbols: false,
    });
    expect(result.password).toMatch(/^[A-Z]+$/);
  });

  it("generates digits only", () => {
    const result = generatePassword({
      includeLowercase: false,
      includeUppercase: false,
      includeDigits: true,
      includeSymbols: false,
    });
    expect(result.password).toMatch(/^[0-9]+$/);
  });

  it("generates symbols only", () => {
    const result = generatePassword({
      includeLowercase: false,
      includeUppercase: false,
      includeDigits: false,
      includeSymbols: true,
    });
    expect(result.password).toMatch(/^[!@#$%^&*()_+\-=\[\]{}|;:,.<>/?~`]+$/);
  });

  it("generates mixed characters", () => {
    const result = generatePassword({
      includeLowercase: true,
      includeUppercase: true,
      includeDigits: true,
      includeSymbols: true,
      length: 100,
    });
    expect(result.password).toHaveLength(100);
    expect(/[a-z]/.test(result.password)).toBe(true);
    expect(/[A-Z]/.test(result.password)).toBe(true);
    expect(/[0-9]/.test(result.password)).toBe(true);
  });
});

// ─── Category Guarantees ─────────────────────────────────────────────────────

describe("Password Generator — category guarantees", () => {
  it("includes at least one of each enabled category", () => {
    const result = generatePassword({
      includeLowercase: true,
      includeUppercase: true,
      includeDigits: true,
      includeSymbols: true,
      requireEachCategory: true,
    });
    expect(/[a-z]/.test(result.password)).toBe(true);
    expect(/[A-Z]/.test(result.password)).toBe(true);
    expect(/[0-9]/.test(result.password)).toBe(true);
    expect(/[^a-zA-Z0-9]/.test(result.password)).toBe(true);
  });

  it("guarantees work across multiple generations", () => {
    for (let i = 0; i < 20; i++) {
      const result = generatePassword({
        includeLowercase: true,
        includeUppercase: true,
        includeDigits: true,
        requireEachCategory: true,
      });
      expect(/[a-z]/.test(result.password)).toBe(true);
      expect(/[A-Z]/.test(result.password)).toBe(true);
      expect(/[0-9]/.test(result.password)).toBe(true);
    }
  });
});

// ─── Exclusion Rules ─────────────────────────────────────────────────────────

describe("Password Generator — exclusions", () => {
  it("excludes ambiguous characters when enabled", () => {
    const result = generatePassword({
      excludeAmbiguous: true,
      length: 100,
      includeUppercase: true,
      includeLowercase: true,
      includeDigits: true,
      includeSymbols: false,
    });
    expect(result.password).not.toMatch(/[il1Lo0O]/);
  });

  it("excludes custom characters", () => {
    const result = generatePassword({
      excludeChars: "abcXYZ",
      includeLowercase: true,
      includeUppercase: true,
      includeDigits: false,
      includeSymbols: false,
      length: 100,
    });
    expect(result.password).not.toMatch(/[abcXYZ]/);
  });
});

// ─── Custom Alphabet ─────────────────────────────────────────────────────────

describe("Password Generator — custom alphabet", () => {
  it("uses custom alphabet when provided", () => {
    const result = generatePassword({
      customAlphabet: "ABC123",
      length: 10,
    });
    expect(result.password).toHaveLength(10);
    expect(result.password).toMatch(/^[ABC123]+$/);
    expect(result.charPoolSize).toBe(6);
  });
});

// ─── Entropy Calculation ─────────────────────────────────────────────────────

describe("Password Generator — entropy", () => {
  it("reports correct entropy for lowercase only (26 chars)", () => {
    const result = generatePassword({
      length: 16,
      includeLowercase: true,
      includeUppercase: false,
      includeDigits: false,
      includeSymbols: false,
    });
    // 16 * log2(26) ≈ 75.1
    expect(result.entropyBits).toBe(75);
  });

  it("reports higher entropy for larger character pool", () => {
    const small = generatePassword({
      length: 16,
      includeLowercase: true,
      includeUppercase: false,
      includeDigits: false,
      includeSymbols: false,
    });
    const large = generatePassword({
      length: 16,
      includeLowercase: true,
      includeUppercase: true,
      includeDigits: true,
      includeSymbols: true,
    });
    expect(large.entropyBits).toBeGreaterThan(small.entropyBits);
  });
});

// ─── Generation Steps ────────────────────────────────────────────────────────

describe("Password Generator — steps", () => {
  it("provides generation steps", () => {
    const result = generatePassword();
    expect(result.generationSteps.length).toBeGreaterThanOrEqual(2);
    for (const step of result.generationSteps) {
      expect(step.step).toBeGreaterThan(0);
      expect(step.description).toBeTruthy();
      expect(step.detail).toBeTruthy();
    }
  });

  it("provides char breakdown", () => {
    const result = generatePassword({ length: 8 });
    expect(result.charBreakdown).toHaveLength(8);
    for (const item of result.charBreakdown) {
      expect(item.index).toBeGreaterThanOrEqual(0);
      expect(item.char).toBeTruthy();
      expect(item.category).toBeTruthy();
      expect(item.hexCode).toBeTruthy();
    }
  });
});

// ─── Multiple Generation ─────────────────────────────────────────────────────

describe("Password Generator — multiple candidates", () => {
  it("generates multiple unique candidates", () => {
    const candidates = generatePasswordCandidates(5);
    expect(candidates).toHaveLength(5);
    const passwords = new Set(candidates.map((c) => c.password));
    expect(passwords.size).toBe(5);
  });

  it("each candidate has valid structure", () => {
    const candidates = generatePasswordCandidates(3);
    for (const c of candidates) {
      expect(c.password.length).toBe(c.length);
      expect(c.entropyBits).toBeGreaterThan(0);
      expect(c.charBreakdown.length).toBe(c.length);
    }
  });
});

// ─── Recommended Options ─────────────────────────────────────────────────────

describe("Password Generator — recommended options", () => {
  it("basic level has 8 chars, no symbols", () => {
    const opts = getRecommendedOptions("basic");
    expect(opts.length).toBe(8);
    expect(opts.includeSymbols).toBe(false);
  });

  it("standard level has 16 chars with symbols", () => {
    const opts = getRecommendedOptions("standard");
    expect(opts.length).toBe(16);
    expect(opts.includeSymbols).toBe(true);
  });

  it("high level excludes ambiguous chars", () => {
    const opts = getRecommendedOptions("high");
    expect(opts.length).toBe(24);
    expect(opts.excludeAmbiguous).toBe(true);
  });

  it("paranoid level is 32 chars", () => {
    const opts = getRecommendedOptions("paranoid");
    expect(opts.length).toBe(32);
    expect(opts.includeSymbols).toBe(true);
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────────────────

describe("Password Generator — edge cases", () => {
  it("returns empty when no categories enabled", () => {
    const result = generatePassword({
      includeLowercase: false,
      includeUppercase: false,
      includeDigits: false,
      includeSymbols: false,
    });
    expect(result.password).toBe("");
    expect(result.charPoolSize).toBe(0);
  });

  it("handles very long generation (200 chars)", () => {
    const result = generatePassword({ length: 200 });
    expect(result.password).toHaveLength(200);
  });
});
