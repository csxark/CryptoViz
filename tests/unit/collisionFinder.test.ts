/**
 * Unit tests for the Hash Collision Finder engine.
 */

import { describe, it, expect } from "vitest";
import {
  birthdayStats,
  analyzeHash,
  findCollision,
  KNOWN_COLLISIONS,
  EXPLANATIONS,
  type HashAlgorithm,
} from "@/lib/hash/collisionFinder";

// ─── birthdayStats ──────────────────────────────────────────────────────────

describe("birthdayStats", () => {
  it("returns correct space size for small bit counts", () => {
    const stats = birthdayStats(8, 0);
    expect(stats.spaceSize).toBe(256);
    expect(stats.bitsOfSecurity).toBe(8);
  });

  it("expected 50% is approximately √(π/2 × 2^n)", () => {
    const stats = birthdayStats(10, 0);
    const expected = Math.sqrt(Math.PI / 2) * Math.sqrt(1024);
    expect(stats.expected50Percent).toBeCloseTo(Math.round(expected), -1);
  });

  it("expected 99% is greater than expected 50%", () => {
    const stats = birthdayStats(12, 0);
    expect(stats.expected99Percent).toBeGreaterThan(stats.expected50Percent);
  });

  it("probability increases with more attempts", () => {
    const stats1 = birthdayStats(10, 10);
    const stats2 = birthdayStats(10, 50);
    expect(stats2.currentProbability).toBeGreaterThan(stats1.currentProbability);
  });

  it("probability is bounded at 1", () => {
    const stats = birthdayStats(4, 1000);
    expect(stats.currentProbability).toBeLessThanOrEqual(1);
  });

  it("probability is 0 for 0 attempts", () => {
    const stats = birthdayStats(12, 0);
    expect(stats.currentProbability).toBe(0);
  });

  it("larger hash spaces require more attempts", () => {
    const small = birthdayStats(8, 0).expected50Percent;
    const large = birthdayStats(16, 0).expected50Percent;
    expect(large).toBeGreaterThan(small);
  });
});

// ─── analyzeHash ─────────────────────────────────────────────────────────────

describe("analyzeHash", () => {
  it("returns a full hash and truncated hash", async () => {
    const analysis = await analyzeHash("hello", "sha-256", 16);
    expect(analysis.fullHash.length).toBe(64); // SHA-256 = 64 hex chars
    expect(analysis.truncatedHash.length).toBeLessThanOrEqual(4); // 16 bits = 4 hex chars
  });

  it("hamming weight is non-negative", async () => {
    const analysis = await analyzeHash("test", "sha-256", 16);
    expect(analysis.hammingWeight).toBeGreaterThanOrEqual(0);
  });

  it("entropy is non-negative", async () => {
    const analysis = await analyzeHash("test", "sha-256", 16);
    expect(analysis.entropy).toBeGreaterThanOrEqual(0);
  });

  it("same input produces same hash", async () => {
    const a1 = await analyzeHash("hello", "sha-256", 16);
    const a2 = await analyzeHash("hello", "sha-256", 16);
    expect(a1.fullHash).toBe(a2.fullHash);
    expect(a1.truncatedHash).toBe(a2.truncatedHash);
  });

  it("different inputs produce different full hashes", async () => {
    const a1 = await analyzeHash("hello", "sha-256");
    const a2 = await analyzeHash("world", "sha-256");
    expect(a1.fullHash).not.toBe(a2.fullHash);
  });
});

// ─── findCollision ───────────────────────────────────────────────────────────

describe("findCollision", () => {
  it("finds collision quickly with very few bits", async () => {
    const result = await findCollision("sha-256", 4, 6);
    // With 4 bits (16 values), collision should be found in < 10 attempts
    expect(result.attempts).toBeLessThan(30);
    expect(result.found).toBe(true);
  }, 10000);

  it("returns valid collision result when found", async () => {
    const result = await findCollision("sha-256", 6, 6);
    if (result.found) {
      expect(result.input1).toBeDefined();
      expect(result.input2).toBeDefined();
      expect(result.hash1).toBe(result.hash2);
      expect(result.input1).not.toBe(result.input2);
    }
  }, 15000);

  it("reports correct algorithm and bits", async () => {
    const result = await findCollision("sha-256", 8, 6);
    expect(result.algorithm).toBe("sha-256");
    expect(result.bitsUsed).toBe(8);
  }, 30000);

  it("has duration > 0", async () => {
    const result = await findCollision("sha-256", 4, 6);
    expect(result.durationMs).toBeGreaterThan(0);
  }, 10000);

  it("history is populated", async () => {
    const result = await findCollision("sha-256", 4, 6);
    expect(result.history.length).toBeGreaterThan(0);
  }, 10000);
});

// ─── KNOWN_COLLISIONS ───────────────────────────────────────────────────────

describe("KNOWN_COLLISIONS", () => {
  it("has at least 2 entries", () => {
    expect(KNOWN_COLLISIONS.length).toBeGreaterThanOrEqual(2);
  });

  it("each has required fields", () => {
    for (const collision of KNOWN_COLLISIONS) {
      expect(collision.description).toBeDefined();
      expect(collision.algorithm).toBeDefined();
      expect(collision.reference).toBeDefined();
    }
  });
});

// ─── EXPLANATIONS ────────────────────────────────────────────────────────────

describe("EXPLANATIONS", () => {
  it("has birthdayAttack explanation", () => {
    expect(EXPLANATIONS.birthdayAttack).toBeDefined();
    expect(EXPLANATIONS.birthdayAttack.title).toContain("Birthday");
  });

  it("has collisionResistance explanation", () => {
    expect(EXPLANATIONS.collisionResistance).toBeDefined();
  });

  it("has truncatedHash explanation", () => {
    expect(EXPLANATIONS.truncatedHash).toBeDefined();
  });

  it("has realWorldImpact explanation", () => {
    expect(EXPLANATIONS.realWorldImpact).toBeDefined();
  });

  it("all explanations have non-empty content", () => {
    for (const exp of Object.values(EXPLANATIONS)) {
      expect(exp.title.length).toBeGreaterThan(0);
      expect(exp.content.length).toBeGreaterThan(0);
    }
  });
});
