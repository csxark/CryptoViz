/**
 * Unit tests for the Cipher Identification Toolkit.
 *
 * Tests statistical analysis functions, classification rules,
 * and the end-to-end identification pipeline.
 */

import { describe, it, expect } from "vitest";
import {
  countFrequencies,
  buildFrequencyTable,
  computeIndexCoincidence,
  estimateKeyLengthFromIC,
  computeEntropy,
  computeChiSquared,
  kasiskiExamination,
  estimateKeyLengthFromKasiski,
  computeDigramScore,
  computeTrigramScore,
  analyzeText,
  identifyCipher,
  ENGLISH_FREQUENCIES,
} from "@/lib/cryptanalysis/cipherIdentifier";

// ─── countFrequencies ────────────────────────────────────────────────────────

describe("countFrequencies", () => {
  it("counts single characters correctly", () => {
    const counts = countFrequencies("AAB");
    expect(counts.get("A")).toBe(2);
    expect(counts.get("B")).toBe(1);
  });

  it("handles empty string", () => {
    const counts = countFrequencies("");
    expect(counts.size).toBe(0);
  });

  it("counts mixed case separately", () => {
    const counts = countFrequencies("aA");
    expect(counts.get("a")).toBe(1);
    expect(counts.get("A")).toBe(1);
  });

  it("counts spaces and special characters", () => {
    const counts = countFrequencies("A B!");
    expect(counts.get("A")).toBe(1);
    expect(counts.get(" ")).toBe(1);
    expect(counts.get("B")).toBe(1);
    expect(counts.get("!")).toBe(1);
  });
});

// ─── buildFrequencyTable ─────────────────────────────────────────────────────

describe("buildFrequencyTable", () => {
  it("returns sorted entries by count descending", () => {
    const table = buildFrequencyTable("AAABBC");
    expect(table[0].letter).toBe("A");
    expect(table[0].count).toBe(3);
    expect(table[1].letter).toBe("B");
    expect(table[1].count).toBe(2);
  });

  it("normalizes to uppercase", () => {
    const table = buildFrequencyTable("aAbB");
    const letters = table.map((e) => e.letter);
    expect(letters).toContain("A");
    expect(letters).toContain("B");
    expect(letters).not.toContain("a");
  });

  it("includes english frequency reference", () => {
    const table = buildFrequencyTable("HELLO");
    const entry = table.find((e) => e.letter === "E");
    expect(entry).toBeDefined();
    expect(entry!.englishFrequency).toBe(ENGLISH_FREQUENCIES["E"]);
  });
});

// ─── computeIndexCoincidence ─────────────────────────────────────────────────

describe("computeIndexCoincidence", () => {
  it("returns ~0.065 for English-like text", () => {
    const ic = computeIndexCoincidence(
      "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG"
    );
    expect(ic).toBeGreaterThan(0.04);
    expect(ic).toBeLessThan(0.1);
  });

  it("returns near 1 for single repeated character", () => {
    const ic = computeIndexCoincidence("AAAAAAAAAAAA");
    expect(ic).toBeCloseTo(1.0, 1);
  });

  it("returns ~0.038 for random-like text", () => {
    // Using alternating characters to simulate randomness
    const text = "ABCDEFGHIJKLMNOP";
    const ic = computeIndexCoincidence(text);
    expect(ic).toBeLessThan(0.08);
  });

  it("returns 0 for empty or single character", () => {
    expect(computeIndexCoincidence("")).toBe(0);
    expect(computeIndexCoincidence("A")).toBe(0);
  });

  it("ignores non-alphabetic characters", () => {
    const ic1 = computeIndexCoincidence("AAAA");
    const ic2 = computeIndexCoincidence("A1A2A3A4");
    expect(ic1).toBe(ic2);
  });
});

// ─── estimateKeyLengthFromIC ─────────────────────────────────────────────────

describe("estimateKeyLengthFromIC", () => {
  it("returns ~1 for English text (monoalphabetic)", () => {
    const ic = 0.065;
    const n = 100;
    const keyLen = estimateKeyLengthFromIC(ic, n);
    expect(keyLen).toBeGreaterThanOrEqual(1);
    expect(keyLen).toBeLessThanOrEqual(3);
  });

  it("returns larger values for lower IC", () => {
    const shortKey = estimateKeyLengthFromIC(0.06, 100);
    const longKey = estimateKeyLengthFromIC(0.045, 100);
    expect(longKey).toBeGreaterThan(shortKey);
  });

  it("returns 0 for edge cases", () => {
    expect(estimateKeyLengthFromIC(0, 100)).toBe(0);
    expect(estimateKeyLengthFromIC(0.05, 0)).toBe(0);
  });
});

// ─── computeEntropy ──────────────────────────────────────────────────────────

describe("computeEntropy", () => {
  it("returns 0 for empty string", () => {
    expect(computeEntropy("")).toBe(0);
  });

  it("returns 0 for single repeated character", () => {
    expect(computeEntropy("AAAA")).toBe(0);
  });

  it("returns log2(n) for uniform distribution", () => {
    const entropy = computeEntropy("ABCDE");
    expect(entropy).toBeCloseTo(Math.log2(5), 1);
  });

  it("English text has entropy around 4-5 bits", () => {
    const entropy = computeEntropy(
      "The quick brown fox jumps over the lazy dog"
    );
    expect(entropy).toBeGreaterThan(3);
    expect(entropy).toBeLessThan(5.5);
  });
});

// ─── computeChiSquared ───────────────────────────────────────────────────────

describe("computeChiSquared", () => {
  it("returns low value for English-like text", () => {
    const chiSq = computeChiSquared(
      "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG"
    );
    expect(chiSq).toBeLessThan(200);
  });

  it("returns high value for uniform random text", () => {
    // All letters equally distributed
    const text = "ABCDEFGHIJKLMNOP".repeat(5);
    const chiSq = computeChiSquared(text);
    expect(chiSq).toBeGreaterThan(50);
  });

  it("returns Infinity for empty alphabetic text", () => {
    expect(computeChiSquared("12345")).toBe(Infinity);
  });
});

// ─── kasiskiExamination ──────────────────────────────────────────────────────

describe("kasiskiExamination", () => {
  it("finds repeated sequences and returns distances", () => {
    const text = "ABCABCABC"
    const distances = kasiskiExamination(text)
    expect(distances.length).toBeGreaterThan(0)
  });

  it("returns empty for text with no repeats", () => {
    const text = "ABCDEFGHIJKLMNOP"
    const distances = kasiskiExamination(text)
    expect(distances.length).toBe(0)
  });

  it("handles short text gracefully", () => {
    const distances = kasiskiExamination("AB")
    expect(distances.length).toBe(0)
  });
});

// ─── estimateKeyLengthFromKasiski ────────────────────────────────────────────

describe("estimateKeyLengthFromKasiski", () => {
  it("returns 0 for empty distances", () => {
    expect(estimateKeyLengthFromKasiski([])).toBe(0);
  });

  it("finds the most common factor", () => {
    const distances = [6, 9, 12, 15, 18]; // all divisible by 3
    expect(estimateKeyLengthFromKasiski(distances)).toBe(3);
  });

  it("finds factor of 2 for even distances", () => {
    const distances = [4, 8, 12, 16];
    expect(estimateKeyLengthFromKasiski(distances)).toBe(2);
  });
});

// ─── computeDigramScore ──────────────────────────────────────────────────────

describe("computeDigramScore", () => {
  it("returns high score for English text", () => {
    const score = computeDigramScore(
      "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG"
    );
    expect(score).toBeGreaterThan(0.3);
  });

  it("returns low score for random text", () => {
    const score = computeDigramScore("XKJQWZBVMP");
    expect(score).toBeLessThan(0.5);
  });

  it("returns 0 for very short text", () => {
    expect(computeDigramScore("A")).toBe(0);
  });
});

// ─── computeTrigramScore ─────────────────────────────────────────────────────

describe("computeTrigramScore", () => {
  it("returns higher score for English text", () => {
    const englishScore = computeTrigramScore(
      "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG"
    );
    const randomScore = computeTrigramScore("XKJQWZBVMPQR");
    expect(englishScore).toBeGreaterThanOrEqual(randomScore);
  });

  it("returns 0 for text shorter than 3 characters", () => {
    expect(computeTrigramScore("AB")).toBe(0);
  });
});

// ─── analyzeText ─────────────────────────────────────────────────────────────

describe("analyzeText", () => {
  it("computes all metrics for English text", () => {
    const result = analyzeText("HELLO WORLD");
    expect(result.totalChars).toBe(11);
    expect(result.indexCoincidence).toBeGreaterThan(0);
    expect(result.entropy).toBeGreaterThan(0);
    expect(result.chiSquared).toBeGreaterThan(0);
    expect(result.frequencies.length).toBeGreaterThan(0);
    expect(result.uniqueChars).toBeGreaterThan(0);
  });

  it("detects hex encoding correctly", () => {
    const result = analyzeText("48656c6c6f");
    expect(result.hexRatio).toBeGreaterThan(0.9);
    expect(result.alphaRatio).toBeLessThan(0.5);
  });

  it("detects binary encoding", () => {
    const result = analyzeText("01001000 01100101");
    expect(result.uniqueChars).toBe(2);
  });

  it("handles empty text", () => {
    const result = analyzeText("");
    expect(result.totalChars).toBe(0);
    expect(result.entropy).toBe(0);
  });

  it("computes upperRatio correctly", () => {
    const result = analyzeText("ABCabc");
    expect(result.upperRatio).toBeCloseTo(0.5, 1);
  });
});

// ─── identifyCipher ──────────────────────────────────────────────────────────

describe("identifyCipher", () => {
  it("identifies Caesar cipher", () => {
    const report = identifyCipher("KHOOR ZRUOG");
    expect(report.candidates.length).toBeGreaterThan(0);
    const top = report.candidates[0];
    expect(["caesar", "rot13"]).toContain(top.cipherType);
    expect(top.confidence).toBeGreaterThan(30);
  });

  it("identifies hex encoding", () => {
    const report = identifyCipher("48656c6c6f20576f726c64");
    const hexCandidate = report.candidates.find(
      (c) => c.cipherType === "hex"
    );
    expect(hexCandidate).toBeDefined();
    expect(hexCandidate!.confidence).toBeGreaterThan(50);
  });

  it("identifies base64 encoding", () => {
    const report = identifyCipher("SGVsbG8gV29ybGQh");
    const b64Candidate = report.candidates.find(
      (c) => c.cipherType === "base64"
    );
    expect(b64Candidate).toBeDefined();
    expect(b64Candidate!.confidence).toBeGreaterThan(40);
  });

  it("identifies binary encoding", () => {
    const report = identifyCipher(
      "01001000 01100101 01101100 01101100 01101111"
    );
    const binCandidate = report.candidates.find(
      (c) => c.cipherType === "binary"
    );
    expect(binCandidate).toBeDefined();
    expect(binCandidate!.confidence).toBeGreaterThan(50);
  });

  it("returns empty candidates for empty input", () => {
    const report = identifyCipher("");
    expect(report.candidates.length).toBe(0);
  });

  it("returns analysis object for any input", () => {
    const report = identifyCipher("test");
    expect(report.analysis).toBeDefined();
    expect(report.analysis.totalChars).toBe(4);
  });

  it("provides recommended actions for top candidate", () => {
    const report = identifyCipher("KHOOR ZRUOG");
    expect(report.candidates[0].recommendedActions.length).toBeGreaterThan(0);
  });

  it("candidates are sorted by confidence descending", () => {
    const report = identifyCipher("HELLO WORLD");
    for (let i = 1; i < report.candidates.length; i++) {
      expect(report.candidates[i].confidence).toBeLessThanOrEqual(
        report.candidates[i - 1].confidence
      );
    }
  });

  it("identifies Vigenère cipher characteristics", () => {
    const report = identifyCipher("LXFOPVEFRNHR");
    const vigCandidate = report.candidates.find(
      (c) => c.cipherType === "vigenere"
    );
    // Should at least appear as a candidate
    expect(vigCandidate).toBeDefined();
  });
});

// ─── ENGLISH_FREQUENCIES sanity check ────────────────────────────────────────

describe("ENGLISH_FREQUENCIES", () => {
  it("has all 26 letters", () => {
    expect(Object.keys(ENGLISH_FREQUENCIES).length).toBe(26);
  });

  it("sums to approximately 1.0", () => {
    const sum = Object.values(ENGLISH_FREQUENCIES).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 2);
  });

  it("E is the most frequent letter", () => {
    const sorted = Object.entries(ENGLISH_FREQUENCIES).sort(
      (a, b) => b[1] - a[1]
    );
    expect(sorted[0][0]).toBe("E");
  });
});
