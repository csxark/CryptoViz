import { describe, it, expect } from "vitest";
import {
  generateUuid,
  generateBatch,
  analyzeUuid,
  isValidUuid,
  isV4Uuid,
  uuidFormats,
  estimateCollisionProbability,
  birthdayBound,
  getUuidExplanation,
  GeneratedUuid,
} from "./uuid";

// ─── UUID Generation ─────────────────────────────────────────────────────────

describe("UUID Generation — basic", () => {
  it("generates a valid v4 UUID", () => {
    const { uuid } = generateUuid();
    expect(isV4Uuid(uuid)).toBe(true);
    expect(uuid).toHaveLength(36);
  });

  it("generates UUID with correct format (8-4-4-4-12)", () => {
    const { uuid } = generateUuid();
    const parts = uuid.split("-");
    expect(parts).toHaveLength(5);
    expect(parts[0]).toHaveLength(8);
    expect(parts[1]).toHaveLength(4);
    expect(parts[2]).toHaveLength(4);
    expect(parts[3]).toHaveLength(4);
    expect(parts[4]).toHaveLength(12);
  });

  it("generates different UUIDs on each call", () => {
    const results = Array.from({ length: 50 }, () => generateUuid());
    const unique = new Set(results.map((r) => r.uuid));
    expect(unique.size).toBe(50);
  });

  it("version nibble is always 4", () => {
    for (let i = 0; i < 20; i++) {
      const { uuid } = generateUuid();
      expect(uuid[14]).toBe("4");
    }
  });

  it("variant bits are 10xx (8, 9, a, or b)", () => {
    for (let i = 0; i < 20; i++) {
      const { uuid } = generateUuid();
      expect(["8", "9", "a", "b"]).toContain(uuid[19]);
    }
  });

  it("returns 16 random bytes", () => {
    const { randomBytes, randomBytesHex } = generateUuid();
    expect(randomBytes).toHaveLength(16);
    expect(randomBytesHex).toHaveLength(32);
  });

  it("produces generation steps", () => {
    const { steps } = generateUuid();
    expect(steps.length).toBe(5);
    for (const step of steps) {
      expect(step.step).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
    }
  });

  it("parses components correctly", () => {
    const { components, uuid } = generateUuid();
    expect(components.timeLow).toBe(uuid.slice(0, 8));
    expect(components.timeMid).toBe(uuid.slice(9, 13));
    expect(components.timeHiAndVersion).toBe(uuid.slice(14, 18));
    expect(components.node).toBe(uuid.slice(24));
  });
});

// ─── Batch Generation ────────────────────────────────────────────────────────

describe("UUID Batch Generation", () => {
  it("generates requested count", () => {
    const result = generateBatch(10);
    expect(result.uuids).toHaveLength(10);
    expect(result.count).toBe(10);
  });

  it("all unique for reasonable batch sizes", () => {
    const result = generateBatch(100);
    expect(result.allUnique).toBe(true);
  });

  it("reports generation time", () => {
    const result = generateBatch(10);
    expect(result.generationTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("handles batch size of 1", () => {
    const result = generateBatch(1);
    expect(result.uuids).toHaveLength(1);
    expect(result.allUnique).toBe(true);
  });
});

// ─── UUID Validation & Analysis ──────────────────────────────────────────────

describe("UUID Analysis — valid UUIDs", () => {
  it("analyzes a valid v4 UUID", () => {
    const { uuid } = generateUuid();
    const analysis = analyzeUuid(uuid);
    expect(analysis.valid).toBe(true);
    expect(analysis.version).toBe(4);
    expect(analysis.variant).toBe("RFC9562");
    expect(analysis.assessment.rating).toBe("strong");
  });

  it("analyzes a well-known v4 UUID", () => {
    const analysis = analyzeUuid("550e8400-e29b-41d4-a716-446655440000");
    expect(analysis.valid).toBe(true);
    expect(analysis.version).toBe(4);
  });

  it("accepts uppercase input", () => {
    const { uuid } = generateUuid();
    const analysis = analyzeUuid(uuid.toUpperCase());
    expect(analysis.valid).toBe(true);
  });

  it("accepts input with surrounding whitespace", () => {
    const { uuid } = generateUuid();
    const analysis = analyzeUuid(`  ${uuid}  `);
    expect(analysis.valid).toBe(true);
  });

  it("produces at least 5 analysis steps", () => {
    const { uuid } = generateUuid();
    const analysis = analyzeUuid(uuid);
    expect(analysis.steps.length).toBeGreaterThanOrEqual(5);
  });

  it("provides version description", () => {
    const { uuid } = generateUuid();
    const analysis = analyzeUuid(uuid);
    expect(analysis.versionDescription).toContain("v4");
    expect(analysis.versionDescription).toContain("Random");
  });

  it("detects RFC9562 variant", () => {
    const { uuid } = generateUuid();
    const analysis = analyzeUuid(uuid);
    expect(analysis.variant).toBe("RFC9562");
  });

  it("reports entropy for v4", () => {
    const { uuid } = generateUuid();
    const analysis = analyzeUuid(uuid);
    expect(analysis.assessment.entropyBits).toBe(122);
  });
});

// ─── UUID Validation — invalid inputs ────────────────────────────────────────

describe("UUID Analysis — invalid inputs", () => {
  it("rejects empty string", () => {
    const analysis = analyzeUuid("");
    expect(analysis.valid).toBe(false);
  });

  it("rejects short string", () => {
    const analysis = analyzeUuid("550e8400-e29b-41d4-a716");
    expect(analysis.valid).toBe(false);
  });

  it("rejects non-hex characters", () => {
    const analysis = analyzeUuid("550e8400-e29b-41d4-a716-44665544zzzz");
    expect(analysis.valid).toBe(false);
  });

  it("rejects missing hyphens", () => {
    const analysis = analyzeUuid("550e8400e29b41d4a716446655440000");
    expect(analysis.valid).toBe(false);
  });

  it("rejects wrong number of hyphens", () => {
    const analysis = analyzeUuid("550e8400-e29b-41d4-a716446655440000");
    expect(analysis.valid).toBe(false);
  });

  it("rejects text string", () => {
    const analysis = analyzeUuid("not-a-uuid-at-all-here");
    expect(analysis.valid).toBe(false);
  });

  it("returns invalid rating for bad UUIDs", () => {
    const analysis = analyzeUuid("garbage");
    expect(analysis.assessment.rating).toBe("invalid");
  });
});

// ─── isValidUuid / isV4Uuid ──────────────────────────────────────────────────

describe("UUID quick checks", () => {
  it("isValidUuid returns true for valid UUID", () => {
    const { uuid } = generateUuid();
    expect(isValidUuid(uuid)).toBe(true);
  });

  it("isValidUuid returns false for invalid string", () => {
    expect(isValidUuid("not-a-uuid")).toBe(false);
    expect(isValidUuid("")).toBe(false);
  });

  it("isV4Uuid returns true for v4 UUID", () => {
    const { uuid } = generateUuid();
    expect(isV4Uuid(uuid)).toBe(true);
  });

  it("isV4Uuid returns false for garbage", () => {
    expect(isV4Uuid("hello")).toBe(false);
  });
});

// ─── Format Conversion ───────────────────────────────────────────────────────

describe("UUID format conversion", () => {
  const testUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("standard format is lowercase hyphenated", () => {
    const formats = uuidFormats(testUuid);
    expect(formats.standard).toBe(testUuid);
  });

  it("upper format is uppercase", () => {
    const formats = uuidFormats(testUuid);
    expect(formats.upper).toBe(testUuid.toUpperCase());
  });

  it("noHyphens removes all hyphens", () => {
    const formats = uuidFormats(testUuid);
    expect(formats.noHyphens).toHaveLength(32);
    expect(formats.noHyphens).not.toContain("-");
  });

  it("braces wraps in curly braces", () => {
    const formats = uuidFormats(testUuid);
    expect(formats.braces).toBe(`{${testUuid}}`);
  });

  it("urn format uses urn:uuid: prefix", () => {
    const formats = uuidFormats(testUuid);
    expect(formats.urn).toBe(`urn:uuid:${testUuid}`);
  });

  it("base64 is non-empty for valid UUID", () => {
    const formats = uuidFormats(testUuid);
    expect(formats.base64.length).toBeGreaterThan(0);
  });

  it("short returns first 8 hex chars without hyphens", () => {
    const formats = uuidFormats(testUuid);
    expect(formats.short).toBe("550e8400");
  });

  it("handles invalid input gracefully", () => {
    const formats = uuidFormats("invalid");
    expect(formats.standard).toBe("invalid");
    expect(formats.base64).toBe("");
  });
});

// ─── Collision Probability ───────────────────────────────────────────────────

describe("UUID collision probability", () => {
  it("returns 0% for 0 or 1 UUID", () => {
    expect(estimateCollisionProbability(0)).toBe("0%");
    expect(estimateCollisionProbability(1)).toBe("0%");
  });

  it("returns negligible for 1 million UUIDs", () => {
    const prob = estimateCollisionProbability(1_000_000);
    expect(prob).toContain("negligible");
  });

  it("birthdayBound returns ~2^61 for 122-bit entropy", () => {
    const bound = birthdayBound(122);
    // 2^61 = 2,305,843,009,213,693,952
    expect(bound).toBeGreaterThan(2e18);
    expect(bound).toBeLessThan(3e18);
  });
});

// ─── Educational Explanation ──────────────────────────────────────────────────

describe("UUID explanation", () => {
  it("returns 7 explanation steps", () => {
    const steps = getUuidExplanation();
    expect(steps.length).toBe(7);
    for (const step of steps) {
      expect(step.length).toBeGreaterThan(20);
    }
  });

  it("mentions version, variant, and entropy", () => {
    const steps = getUuidExplanation();
    const combined = steps.join(" ");
    expect(combined).toContain("version");
    expect(combined).toContain("variant");
    expect(combined).toContain("entropy");
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────────────────

describe("UUID edge cases", () => {
  it("analysis steps are sequential", () => {
    const { uuid } = generateUuid();
    const analysis = analyzeUuid(uuid);
    for (let i = 0; i < analysis.steps.length; i++) {
      expect(analysis.steps[i].step).toBe(i + 1);
    }
  });

  it("components always produce valid hex", () => {
    const { uuid } = generateUuid();
    const analysis = analyzeUuid(uuid);
    expect(/^[0-9a-f]+$/.test(analysis.components.timeLow)).toBe(true);
    expect(/^[0-9a-f]+$/.test(analysis.components.timeMid)).toBe(true);
    expect(/^[0-9a-f]+$/.test(analysis.components.timeHiAndVersion)).toBe(true);
    expect(/^[0-9a-f]+$/.test(analysis.components.node)).toBe(true);
  });

  it("analysis rating is 'strong' for generated UUIDs", () => {
    for (let i = 0; i < 10; i++) {
      const { uuid } = generateUuid();
      const analysis = analyzeUuid(uuid);
      expect(analysis.assessment.rating).toBe("strong");
    }
  });

  it("security notes mention crypto.getRandomValues", () => {
    const { uuid } = generateUuid();
    const analysis = analyzeUuid(uuid);
    expect(
      analysis.assessment.securityNotes.some((n) =>
        n.includes("crypto.getRandomValues"),
      ),
    ).toBe(true);
  });
});
