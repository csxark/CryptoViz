import { describe, expect, it } from "vitest";
import { buildVisualizerPermalink, parseVisualizerPermalink } from "../../../../lib/utils/visualizerPermalink";

describe("Cipher permalink controller contract", () => {
  it("round-trips input, key, direction, step and options", () => {
    const url = buildVisualizerPermalink("https://example.test/cipher", {
      input: "hello",
      key: "secret",
      direction: "encrypt",
      step: 3,
      options: { hexInput: true, rounds: 8, demoMode: false, bobSecret: "15", padding: true, aesMode: "CBC", autoCompute: true },
    });
    const parsed = parseVisualizerPermalink(new URL(url).search);
    expect(parsed.input).toBe("hello");
    expect(parsed.key).toBe("secret");
    expect(parsed.direction).toBe("encrypt");
    expect(parsed.step).toBe(3);
  });
});
