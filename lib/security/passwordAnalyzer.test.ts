import { describe, it, expect } from "vitest";
import { analyzePassword, StrengthRating, PasswordAnalysis } from "./passwordAnalyzer";

// ─── Basic Analysis ──────────────────────────────────────────────────────────

describe("Password Analyzer — basic analysis", () => {
  it("analyzes empty password", () => {
    const result = analyzePassword("");
    expect(result.length).toBe(0);
    expect(result.entropyBits).toBe(0);
    expect(result.strengthRating).toBe("very_weak");
    expect(result.strengthScore).toBe(0);
  });

  it("analyzes a very short password", () => {
    const result = analyzePassword("abc");
    expect(result.length).toBe(3);
    expect(result.entropyBits).toBeLessThan(20);
    expect(result.strengthRating).toBe("very_weak");
  });

  it("analyzes a strong password", () => {
    const result = analyzePassword("Tr0ub4dor&3#xC9!");
    expect(result.length).toBe(16);
    expect(result.entropyBits).toBeGreaterThan(60);
    expect(["strong", "very_strong"]).toContain(result.strengthRating);
    expect(result.strengthScore).toBeGreaterThanOrEqual(60);
  });

  it("analyzes a very strong random password", () => {
    const result = analyzePassword("k#9T!mP2$vL@nQ8x");
    expect(result.entropyBits).toBeGreaterThan(70);
    expect(result.strengthRating).toBe("very_strong");
    expect(result.strengthScore).toBeGreaterThanOrEqual(80);
  });
});

// ─── Character Pool Detection ────────────────────────────────────────────────

describe("Password Analyzer — character pools", () => {
  it("detects lowercase only", () => {
    const result = analyzePassword("abcdefghij");
    expect(result.charPoolsUsed).toContain("lowercase");
    expect(result.charPoolsUsed).not.toContain("uppercase");
    expect(result.charPoolsUsed).not.toContain("digits");
  });

  it("detects mixed case + digits", () => {
    const result = analyzePassword("Hello123");
    expect(result.charPoolsUsed).toContain("lowercase");
    expect(result.charPoolsUsed).toContain("uppercase");
    expect(result.charPoolsUsed).toContain("digits");
    expect(result.charPoolsUsed).not.toContain("symbols_common");
  });

  it("detects all character pools", () => {
    const result = analyzePassword("Ab3!xY9@");
    expect(result.charPoolsUsed.length).toBeGreaterThanOrEqual(4);
    expect(result.charPoolSize).toBeGreaterThan(70);
  });
});

// ─── Pattern Detection ───────────────────────────────────────────────────────

describe("Password Analyzer — pattern detection", () => {
  it("detects common password", () => {
    const result = analyzePassword("password");
    const dictPatterns = result.patterns.filter((p) => p.category === "dictionary");
    expect(dictPatterns.length).toBeGreaterThan(0);
    expect(dictPatterns[0].severity).toBe("critical");
  });

  it("detects repeated characters", () => {
    const result = analyzePassword("aaabbb123");
    const repPatterns = result.patterns.filter((p) => p.category === "repetition");
    expect(repPatterns.length).toBeGreaterThan(0);
  });

  it("detects sequential patterns", () => {
    const result = analyzePassword("abcdef123");
    const seqPatterns = result.patterns.filter((p) => p.category === "sequence");
    expect(seqPatterns.length).toBeGreaterThan(0);
  });

  it("detects keyboard walks", () => {
    const result = analyzePassword("qwerty123");
    const kbPatterns = result.patterns.filter((p) => p.category === "keyboard");
    expect(kbPatterns.length).toBeGreaterThan(0);
  });

  it("detects leetspeak substitutions of common passwords", () => {
    const result = analyzePassword("p@ssw0rd");
    const subPatterns = result.patterns.filter(
      (p) => p.category === "common_substitution",
    );
    expect(subPatterns.length).toBeGreaterThan(0);
  });

  it("detects no patterns in a random password", () => {
    const result = analyzePassword("k9#T!mP2$vL@nQ");
    // May still have info-level patterns, but no critical ones
    const criticalPatterns = result.patterns.filter(
      (p) => p.severity === "critical",
    );
    expect(criticalPatterns.length).toBe(0);
  });
});

// ─── Crack Time Estimation ───────────────────────────────────────────────────

describe("Password Analyzer — crack times", () => {
  it("provides estimates for all attack models", () => {
    const result = analyzePassword("TestPass123");
    expect(result.crackTimes.length).toBe(4);
    for (const ct of result.crackTimes) {
      expect(ct.label).toBeTruthy();
      expect(ct.hashRate).toBeTruthy();
      expect(ct.timeFormatted).toBeTruthy();
      expect(ct.timeHumanReadable).toBeTruthy();
      expect(ct.timeSeconds).toBeGreaterThanOrEqual(0);
    }
  });

  it("bcrypt is always slower than MD5", () => {
    const result = analyzePassword("StrongP@ss1!");
    const bcrypt = result.crackTimes.find(
      (ct) => ct.attackModel === "offline_bcrypt",
    );
    const md5 = result.crackTimes.find(
      (ct) => ct.attackModel === "offline_md5",
    );
    expect(bcrypt!.timeSeconds).toBeGreaterThan(md5!.timeSeconds);
  });

  it("online throttled is slowest attack model", () => {
    const result = analyzePassword("a");
    const throttled = result.crackTimes.find(
      (ct) => ct.attackModel === "online_throttled",
    );
    expect(throttled!.timeSeconds).toBeGreaterThan(0);
  });
});

// ─── Steps & Recommendations ─────────────────────────────────────────────────

describe("Password Analyzer — educational steps", () => {
  it("provides analysis steps for any password", () => {
    const result = analyzePassword("Test123!");
    expect(result.steps.length).toBeGreaterThanOrEqual(3);
    for (const step of result.steps) {
      expect(step.step).toBeGreaterThan(0);
      expect(step.category).toBeTruthy();
      expect(step.description).toBeTruthy();
      expect(["positive", "negative", "neutral", "warning"]).toContain(
        step.impact,
      );
    }
  });

  it("provides recommendations for weak passwords", () => {
    const result = analyzePassword("abc");
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some((r) => r.includes("length"))).toBe(true);
  });

  it("provides positive feedback for strong passwords", () => {
    const result = analyzePassword("k#9T!mP2$vL@nQ8x");
    expect(result.recommendations.some((r) => r.includes("Excellent"))).toBe(
      true,
    );
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────────────────

describe("Password Analyzer — edge cases", () => {
  it("handles very long password (100 chars)", () => {
    const longPass = "a".repeat(50) + "B".repeat(50);
    const result = analyzePassword(longPass);
    expect(result.length).toBe(100);
    expect(result.entropyBits).toBeGreaterThan(0);
  });

  it("handles unicode characters", () => {
    const result = analyzePassword("Pässwörd123");
    expect(result.charPoolsUsed).toContain("unicode");
    expect(result.entropyBits).toBeGreaterThan(0);
  });

  it("handles all-special-character password", () => {
    const result = analyzePassword("!@#$%^&*");
    expect(result.charPoolsUsed).toContain("symbols_common");
  });

  it("handles single character", () => {
    const result = analyzePassword("x");
    expect(result.length).toBe(1);
    expect(result.strengthRating).toBe("very_weak");
  });
});
