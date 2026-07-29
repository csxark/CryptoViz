import { describe, expect, it } from "vitest";
import {
  buildSha256MessageSchedule,
  buildSingleSha256Block,
  getSha256CompressionManualChecklist,
  runSha256CompressionVisualization,
  validateSha256CompressionInput,
} from "../../../lib/hash/sha256CompressionVisualizer";

describe("SHA-256 compression visualizer utilities", () => {
  it("validates single-block input", () => {
    expect(validateSha256CompressionInput("abc")).toBe("abc");
    expect(() => validateSha256CompressionInput("")).toThrow(
      /message is required/i,
    );
    expect(() => validateSha256CompressionInput("a".repeat(56))).toThrow(
      /up to 55/i,
    );
  });

  it("builds a single 512-bit padded block", () => {
    const block = buildSingleSha256Block("abc");
    expect(block).toHaveLength(64);
    expect(block.slice(0, 4)).toEqual([0x61, 0x62, 0x63, 0x80]);
    expect(block.slice(-1)[0]).toBe(24);
  });

  it("builds a 64-word message schedule", () => {
    const schedule = buildSha256MessageSchedule("abc");
    expect(schedule).toHaveLength(64);
    expect(schedule[0].value).toBe("61626380");
    expect(schedule[15].value).toBe("00000018");
    expect(schedule[16].formula).toContain("σ1");
  });

  it("runs SHA-256 compression for the abc test vector", () => {
    const result = runSha256CompressionVisualization("abc");

    expect(result.rounds).toHaveLength(64);
    expect(result.messageSchedule).toHaveLength(64);
    expect(result.digest).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(result.rounds[0]).toMatchObject({
      round: 0,
      w: "61626380",
      k: "428a2f98",
    });
  });

  it("changes digest when message changes", () => {
    expect(runSha256CompressionVisualization("abc").digest).not.toBe(
      runSha256CompressionVisualization("abd").digest,
    );
  });

  it("builds manual testing checklist", () => {
    const checklist = getSha256CompressionManualChecklist();
    expect(checklist[0]).toMatch(/open the sha-256 compression/i);
    expect(checklist).toContain(
      "Confirm the message schedule contains 64 words.",
    );
  });
});
