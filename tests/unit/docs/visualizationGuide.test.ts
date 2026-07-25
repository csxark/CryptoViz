import { describe, expect, it } from "vitest";
import {
  VISUALIZATION_GUIDE_QUALITY_CHECKS,
  VISUALIZATION_GUIDE_STAGES,
  buildManualTestingChecklist,
  calculateGuideCompletion,
  getVisualizationGuideStage,
  groupQualityChecksByRequirement,
} from "../../../lib/docs/visualizationGuide";

describe("visualization development guide utilities", () => {
  it("defines the expected development stages", () => {
    expect(VISUALIZATION_GUIDE_STAGES).toHaveLength(8);
    expect(VISUALIZATION_GUIDE_STAGES.map((stage) => stage.id)).toEqual([
      "scope",
      "algorithm",
      "state",
      "steps",
      "worker",
      "testing",
      "accessibility",
      "docs",
    ]);
  });

  it("returns a guide stage by id", () => {
    expect(getVisualizationGuideStage("steps").title).toBe(
      "Design educational steps",
    );
  });

  it("throws for an unknown guide stage", () => {
    expect(() => getVisualizationGuideStage("missing" as never)).toThrow(
      /unknown visualization guide stage/i,
    );
  });

  it("calculates completion percentage from unique valid stage ids", () => {
    expect(calculateGuideCompletion([])).toBe(0);
    expect(calculateGuideCompletion(["scope", "scope"])).toBe(13);
    expect(
      calculateGuideCompletion(["scope", "algorithm", "state", "steps"]),
    ).toBe(50);
    expect(
      calculateGuideCompletion([
        "scope",
        "algorithm",
        "state",
        "steps",
        "worker",
        "testing",
        "accessibility",
        "docs",
      ]),
    ).toBe(100);
  });

  it("builds a feature-specific manual testing checklist", () => {
    const checklist = buildManualTestingChecklist("XXHash32 visualization");

    expect(checklist[0]).toBe("Open XXHash32 visualization in the browser.");
    expect(checklist).toContain(
      "Run the focused test file for the new feature.",
    );
  });

  it("falls back when feature name is blank", () => {
    expect(buildManualTestingChecklist("   ")[0]).toBe(
      "Open the new visualization in the browser.",
    );
  });

  it("groups required and recommended quality checks", () => {
    const grouped = groupQualityChecksByRequirement();

    expect(grouped.required.length).toBeGreaterThan(0);
    expect(grouped.recommended.length).toBeGreaterThan(0);
    expect(grouped.required.every((check) => check.required)).toBe(true);
    expect(grouped.recommended.every((check) => !check.required)).toBe(true);
    expect(grouped.required.length + grouped.recommended.length).toBe(
      VISUALIZATION_GUIDE_QUALITY_CHECKS.length,
    );
  });
});
