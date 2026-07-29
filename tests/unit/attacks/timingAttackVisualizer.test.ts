import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIMING_ATTACK_INPUT,
  buildTimingAttackManualChecklist,
  constantTimeCompare,
  constantTimeCompareCost,
  matchedPrefixLength,
  runTimingAttackVisualization,
  validateTimingAttackInput,
  vulnerableCompare,
  vulnerableCompareCost,
} from "../../../lib/attacks/timingAttackVisualizer";

describe("timing attack visualizer utilities", () => {
  it("validates timing attack demo input", () => {
    expect(
      validateTimingAttackInput(DEFAULT_TIMING_ATTACK_INPUT),
    ).toMatchObject({
      secret: "crypto",
      guess: "crysta",
      samples: 12,
    });

    expect(() =>
      validateTimingAttackInput({ secret: "", guess: "abc", samples: 1 }),
    ).toThrow(/secret value is required/i);
    expect(() =>
      validateTimingAttackInput({ secret: "abc", guess: "", samples: 1 }),
    ).toThrow(/guess value is required/i);
    expect(() =>
      validateTimingAttackInput({ secret: "abc", guess: "abc", samples: 0 }),
    ).toThrow(/samples must be/i);
  });

  it("computes matched prefix length", () => {
    expect(matchedPrefixLength("crypto", "crysta")).toBe(3);
    expect(matchedPrefixLength("crypto", "aaaaaa")).toBe(0);
    expect(matchedPrefixLength("crypto", "crypto")).toBe(6);
  });

  it("shows vulnerable cost grows with matching prefix", () => {
    expect(vulnerableCompareCost("crypto", "aaaaaa")).toBeLessThan(
      vulnerableCompareCost("crypto", "crypta"),
    );
  });

  it("keeps constant-time cost based on max length, not matching prefix", () => {
    expect(constantTimeCompareCost("crypto", "aaaaaa")).toBe(
      constantTimeCompareCost("crypto", "crypta"),
    );
  });

  it("compares vulnerable and constant-time equality correctly", () => {
    expect(vulnerableCompare("crypto", "crypto")).toBe(true);
    expect(vulnerableCompare("crypto", "crypta")).toBe(false);
    expect(constantTimeCompare("crypto", "crypto")).toBe(true);
    expect(constantTimeCompare("crypto", "crypta")).toBe(false);
  });

  it("runs timing attack visualization with deterministic attempts", () => {
    const result = runTimingAttackVisualization(DEFAULT_TIMING_ATTACK_INPUT);

    expect(result.attempts).toHaveLength(12);
    expect(result.leakedPrefix).toBe("cry");
    expect(result.risk).toBe("medium");
    expect(result.vulnerableAverage).toBeGreaterThan(0);
    expect(result.constantTimeAverage).toBeGreaterThan(0);
  });

  it("marks high risk when most of the prefix is leaked", () => {
    const result = runTimingAttackVisualization({
      secret: "crypto",
      guess: "crypta",
      samples: 3,
    });

    expect(result.leakedPrefix).toBe("crypt");
    expect(result.risk).toBe("high");
  });

  it("builds manual testing checklist", () => {
    const checklist = buildTimingAttackManualChecklist();

    expect(checklist[0]).toMatch(/open the timing attack/i);
    expect(checklist).toContain(
      "Confirm constant-time timing remains comparatively stable.",
    );
  });
});
