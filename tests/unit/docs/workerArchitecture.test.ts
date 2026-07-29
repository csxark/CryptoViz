import { describe, expect, it } from "vitest";
import {
  WORKER_ARCHITECTURE_SECTIONS,
  WORKER_MESSAGE_FLOW,
  buildWorkerManualTestingChecklist,
  calculateWorkerFlowProgress,
  getMessageStagesByActor,
  getWorkerArchitectureSection,
} from "../../../lib/docs/workerArchitecture";

describe("worker architecture documentation utilities", () => {
  it("defines worker architecture sections in review order", () => {
    expect(WORKER_ARCHITECTURE_SECTIONS.map((section) => section.id)).toEqual([
      "overview",
      "request",
      "execution",
      "response",
      "errors",
      "performance",
      "testing",
    ]);
  });

  it("returns a section by id", () => {
    expect(getWorkerArchitectureSection("request").title).toBe(
      "Request message shape",
    );
  });

  it("throws for an unknown section id", () => {
    expect(() => getWorkerArchitectureSection("missing" as never)).toThrow(
      /unknown worker architecture section/i,
    );
  });

  it("groups message stages by actor", () => {
    expect(getMessageStagesByActor("Worker").map((stage) => stage.id)).toEqual([
      "dispatch-cipher",
      "return-response",
    ]);
    expect(getMessageStagesByActor("UI").map((stage) => stage.id)).toEqual([
      "collect-input",
      "render-result",
    ]);
  });

  it("calculates progress across the message flow", () => {
    expect(calculateWorkerFlowProgress(-1)).toBe(0);
    expect(calculateWorkerFlowProgress(0)).toBe(0);
    expect(calculateWorkerFlowProgress(3)).toBe(50);
    expect(calculateWorkerFlowProgress(WORKER_MESSAGE_FLOW.length - 1)).toBe(
      100,
    );
    expect(calculateWorkerFlowProgress(99)).toBe(100);
  });

  it("builds a feature-specific manual testing checklist", () => {
    const checklist = buildWorkerManualTestingChecklist(
      "XXHash32 visualization",
    );

    expect(checklist[0]).toBe("Open XXHash32 visualization in the browser.");
    expect(checklist).toContain(
      "Run focused tests for the worker or cipher module touched by the feature.",
    );
  });

  it("falls back for blank feature names", () => {
    expect(buildWorkerManualTestingChecklist("   ")[0]).toBe(
      "Open the worker-backed feature in the browser.",
    );
  });
});
