import { describe, expect, it } from "vitest";
import {
  buildVisualizerPermalink,
  clampStepIndex,
  parseVisualizerPermalink,
  updateStepInCurrentUrl,
} from "../../lib/utils/visualizerPermalink";

describe("visualizer permalink utilities", () => {
  it("clamps invalid and outdated step indexes", () => {
    expect(clampStepIndex(-4, 5)).toBe(0);
    expect(clampStepIndex(2, 5)).toBe(2);
    expect(clampStepIndex(99, 5)).toBe(4);
    expect(clampStepIndex(Number.NaN, 5)).toBe(0);
    expect(clampStepIndex(3, 0)).toBe(0);
  });

  it("parses a complete shared visualizer configuration", () => {
    const parsed = parseVisualizerPermalink(
      "?input=HELLO&key=3&direction=decrypt&step=4&hexInput=0&rounds=8&demoMode=1&bobSecret=15",
    );

    expect(parsed).toEqual({
      input: "HELLO",
      key: "3",
      direction: "decrypt",
      step: 4,
      options: {
        hexInput: false,
        rounds: 8,
        demoMode: true,
        bobSecret: "15",
      },
    });
  });

  it("builds a link while preserving unrelated query parameters", () => {
    const link = buildVisualizerPermalink(
      "https://example.com/visualizer/caesar/?theme=dark",
      {
        input: "HELLO",
        key: "3",
        direction: "encrypt",
        step: 2,
        options: {
          hexInput: false,
          rounds: 4,
          demoMode: true,
          bobSecret: "15",
        },
      },
    );

    const url = new URL(link);
    expect(url.searchParams.get("theme")).toBe("dark");
    expect(url.searchParams.get("step")).toBe("2");
    expect(url.searchParams.get("input")).toBe("HELLO");
  });

  it("updates and removes only the step parameter", () => {
    expect(
      updateStepInCurrentUrl(
        "https://example.com/visualizer/aes/?input=abc&step=3",
        1,
      ),
    ).toBe("/visualizer/aes/?input=abc&step=1");

    expect(
      updateStepInCurrentUrl(
        "https://example.com/visualizer/aes/?input=abc&step=3",
        null,
      ),
    ).toBe("/visualizer/aes/?input=abc");
  });

  it("ignores malformed direction and boolean values safely", () => {
    const parsed = parseVisualizerPermalink(
      "?direction=invalid&step=-3&hexInput=maybe",
    );

    expect(parsed.direction).toBeUndefined();
    expect(parsed.step).toBe(0);
    expect(parsed.options.hexInput).toBeUndefined();
  });
});
