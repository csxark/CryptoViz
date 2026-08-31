import { describe, expect, it } from "vitest";
import type { CipherStep } from "@/lib/cipher/types";
import { TraceBuffer } from "@/lib/trace/traceBuffer";

function makeStep(index: number): CipherStep {
  return {
    index,
    label: `Step ${index}`,
    inputState: `in-${index}`,
    outputState: `out-${index}`,
  };
}

describe("TraceBuffer", () => {
  it("keeps the active buffer bounded", () => {
    const buffer = new TraceBuffer({
      capacity: 3,
      retainCompleted: false,
    });

    buffer.pushBatch(
      Array.from({ length: 10 }, (_, index) => makeStep(index)),
    );

    expect(buffer.getStats().retained).toBe(3);
  });

  it("retains a completed trace when retention is enabled", () => {
    const buffer = new TraceBuffer({
      capacity: 3,
      retainCompleted: true,
    });

    buffer.pushBatch(
      Array.from({ length: 5 }, (_, index) => makeStep(index)),
    );

    buffer.complete();

    expect(buffer.getStats().completed).toBe(true);
    expect(buffer.toArray()).toHaveLength(5);
  });

  it("cleans up cancelled traces", () => {
    const buffer = new TraceBuffer({
      capacity: 4,
    });

    buffer.push(makeStep(0));
    buffer.push(makeStep(1));

    buffer.cancel();

    expect(buffer.getStats().cancelled).toBe(true);
    expect(buffer.getStats().retained).toBe(0);
    expect(buffer.push(makeStep(2))).toBe(false);
  });

  it("supports explicit disposal", () => {
    const buffer = new TraceBuffer();

    buffer.push(makeStep(0));
    buffer.dispose();

    expect(buffer.getStats().retained).toBe(0);
  });
});