import { describe, expect, it } from "vitest";
import { SPEEDUP_THRESHOLD, SLOWDOWN_THRESHOLD } from "@/constants/benchmark";
import { SPEEDUP_THRESHOLD as SRC_SPEEDUP, SLOWDOWN_THRESHOLD as SRC_SLOWDOWN } from "@/src/constants/benchmark";

describe("benchmark constants", () => {
  it("exports correct SPEEDUP_THRESHOLD and SLOWDOWN_THRESHOLD", () => {
    expect(SPEEDUP_THRESHOLD).toBe(1.02);
    expect(SLOWDOWN_THRESHOLD).toBe(0.98);
    expect(SPEEDUP_THRESHOLD).toBeGreaterThan(1.0);
    expect(SLOWDOWN_THRESHOLD).toBeLessThan(1.0);
  });

  it("re-exports correctly from src/constants/benchmark", () => {
    expect(SRC_SPEEDUP).toBe(1.02);
    expect(SRC_SLOWDOWN).toBe(0.98);
  });
});
