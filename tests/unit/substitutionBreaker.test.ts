/**
 * Unit tests for the Substitution Cipher Breaker.
 */

import { describe, it, expect } from "vitest";
import {
  identityKey,
  randomKey,
  applyKey,
  swapKey,
  scoreKey,
  frequencyAnalysisSeed,
  breakSubstitution,
  buildKeyMapping,
  keyDistance,
  formatConvergenceSummary,
  DEFAULT_CONFIG,
  type SubstitutionKey,
} from "@/lib/cryptanalysis/substitutionBreaker";

// ─── identityKey ─────────────────────────────────────────────────────────────

describe("identityKey", () => {
  it("returns the 26-letter alphabet", () => {
    expect(identityKey()).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  });

  it("has length 26", () => {
    expect(identityKey().length).toBe(26);
  });
});

// ─── randomKey ───────────────────────────────────────────────────────────────

describe("randomKey", () => {
  it("returns a 26-character string", () => {
    expect(randomKey().length).toBe(26);
  });

  it("contains all 26 letters", () => {
    const key = randomKey();
    const sorted = key.split("").sort().join("");
    expect(sorted).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  });

  it("produces different keys (probabilistic)", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 10; i++) {
      keys.add(randomKey());
    }
    // With 10 random permutations, very likely to have at least 5 unique
    expect(keys.size).toBeGreaterThan(5);
  });
});

// ─── applyKey ────────────────────────────────────────────────────────────────

describe("applyKey", () => {
  it("applies identity key as passthrough", () => {
    expect(applyKey("HELLO", identityKey())).toBe("HELLO");
  });

  it("correctly maps letters", () => {
    // Key where A→Z, B→Y, etc. (atbash-like)
    const atbashKey = "ZYXWVUTSRQPONMLKJIHGFEDCBA" as SubstitutionKey;
    expect(applyKey("AB", atbashKey)).toBe("ZY");
  });

  it("preserves non-alphabetic characters", () => {
    expect(applyKey("HELLO, WORLD!", identityKey())).toBe("HELLO, WORLD!");
  });

  it("converts to uppercase", () => {
    expect(applyKey("hello", identityKey())).toBe("HELLO");
  });

  it("handles empty string", () => {
    expect(applyKey("", identityKey())).toBe("");
  });
});

// ─── swapKey ─────────────────────────────────────────────────────────────────

describe("swapKey", () => {
  it("returns a 26-character permutation", () => {
    const key = identityKey();
    const swapped = swapKey(key);
    expect(swapped.length).toBe(26);
    const sorted = swapped.split("").sort().join("");
    expect(sorted).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  });

  it("changes the key (probabilistic)", () => {
    const key = identityKey();
    let changed = false;
    for (let i = 0; i < 20; i++) {
      if (swapKey(key) !== key) {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);
  });
});

// ─── scoreKey ────────────────────────────────────────────────────────────────

describe("scoreKey", () => {
  it("scores identity key higher on plaintext", () => {
    const plaintext = "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG";
    const identityScore = scoreKey(plaintext, identityKey());
    const randomScore = scoreKey(plaintext, randomKey());
    expect(identityScore).toBeGreaterThan(randomScore);
  });

  it("returns a finite number", () => {
    const score = scoreKey("TEST", identityKey());
    expect(Number.isFinite(score)).toBe(true);
  });
});

// ─── frequencyAnalysisSeed ──────────────────────────────────────────────────

describe("frequencyAnalysisSeed", () => {
  it("returns a valid 26-char key", () => {
    const key = frequencyAnalysisSeed("HELLO WORLD");
    expect(key.length).toBe(26);
    const sorted = key.split("").sort().join("");
    expect(sorted).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  });

  it("returns identity key for empty input", () => {
    expect(frequencyAnalysisSeed("")).toBe(identityKey());
  });

  it("maps frequent cipher letters to frequent English letters", () => {
    // Text with lots of 'X' should map X to E (most frequent)
    const text = "XXXXX".repeat(20);
    const key = frequencyAnalysisSeed(text);
    const xIdx = "X".charCodeAt(0) - 65;
    expect(key[xIdx]).toBe("E");
  });
});

// ─── buildKeyMapping ─────────────────────────────────────────────────────────

describe("buildKeyMapping", () => {
  it("returns 26 pairs", () => {
    const mapping = buildKeyMapping(identityKey());
    expect(mapping.length).toBe(26);
  });

  it("cipher letters are in order", () => {
    const mapping = buildKeyMapping(identityKey());
    const ciphers = mapping.map((m) => m.cipher).join("");
    expect(ciphers).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  });

  it("identity mapping has cipher === plain", () => {
    const mapping = buildKeyMapping(identityKey());
    for (const m of mapping) {
      expect(m.cipher).toBe(m.plain);
    }
  });
});

// ─── keyDistance ─────────────────────────────────────────────────────────────

describe("keyDistance", () => {
  it("returns 0 for identical keys", () => {
    expect(keyDistance(identityKey(), identityKey())).toBe(0);
  });

  it("returns 26 for fully different keys", () => {
    const atbash = "ZYXWVUTSRQPONMLKJIHGFEDCBA" as SubstitutionKey;
    expect(keyDistance(identityKey(), atbash)).toBe(26);
  });

  it("counts single swap", () => {
    const key = swapKey(identityKey());
    expect(keyDistance(identityKey(), key)).toBe(2);
  });
});

// ─── formatConvergenceSummary ────────────────────────────────────────────────

describe("formatConvergenceSummary", () => {
  it("returns zeros for empty history", () => {
    const summary = formatConvergenceSummary([]);
    expect(summary.startScore).toBe(0);
    expect(summary.endScore).toBe(0);
    expect(summary.improvement).toBe(0);
  });

  it("computes correct improvement", () => {
    const history = [
      { iteration: 0, score: -100, temperature: 1.0 },
      { iteration: 50, score: -80, temperature: 0.5 },
      { iteration: 100, score: -60, temperature: 0.1 },
    ];
    const summary = formatConvergenceSummary(history);
    expect(summary.startScore).toBe(-100);
    expect(summary.endScore).toBe(-60);
    expect(summary.improvement).toBe(40);
    expect(summary.bestScore).toBe(-60);
    expect(summary.bestIteration).toBe(100);
  });
});

// ─── breakSubstitution (integration) ────────────────────────────────────────

describe("breakSubstitution", () => {
  it("returns a result with candidates", () => {
    const result = breakSubstitution("HELLO WORLD");
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.best).toBeDefined();
  });

  it("identity key scores well on plaintext", () => {
    const plaintext = "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG";
    const result = breakSubstitution(plaintext, {
      ...DEFAULT_CONFIG,
      maxIterations: 500,
      numRestarts: 2,
    });
    // The identity key should be found or closely approximated
    expect(result.best.score).toBeGreaterThan(-500);
  });

  it("handles very short ciphertext", () => {
    const result = breakSubstitution("AB");
    expect(result.candidates.length).toBe(1);
  });

  it("reports duration", () => {
    const result = breakSubstitution("TEST");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("returns clean ciphertext", () => {
    const result = breakSubstitution("HELLO, WORLD!");
    expect(result.cleanCiphertext).toBe("HELLOWORLD");
  });

  it("produces initial key from frequency analysis", () => {
    const result = breakSubstitution("AAAA BBBB CCCC");
    expect(result.initialKey.length).toBe(26);
  });
});

// ─── DEFAULT_CONFIG ──────────────────────────────────────────────────────────

describe("DEFAULT_CONFIG", () => {
  it("has reasonable defaults", () => {
    expect(DEFAULT_CONFIG.maxIterations).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.numRestarts).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.swapsPerStep).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.initialTemperature).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.coolingRate).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.coolingRate).toBeLessThan(1);
    expect(DEFAULT_CONFIG.topCandidates).toBeGreaterThan(0);
  });
});
