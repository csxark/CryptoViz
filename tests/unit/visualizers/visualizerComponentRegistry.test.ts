import {
  getRegisteredVisualizerIds,
  getVisualizerComponent,
  hasVisualizerComponent,
} from "@/components/visualizers/visualizerComponentRegistry";

describe("visualizerComponentRegistry", () => {
  it("returns a registered visualizer", () => {
    expect(getVisualizerComponent("aes")).not.toBeNull();
    expect(getVisualizerComponent("des")).not.toBeNull();
    expect(getVisualizerComponent("frodokem")).not.toBeNull();
    expect(getVisualizerComponent("crc32")).not.toBeNull();
    expect(getVisualizerComponent("siphash")).not.toBeNull();
    expect(getVisualizerComponent("sha256")).not.toBeNull();
    expect(getVisualizerComponent("idea")).not.toBeNull();
  });

  it("keeps existing specialized visualizers registered", () => {
    expect(getVisualizerComponent("playfair")).not.toBeNull();
    expect(getVisualizerComponent("railfence")).not.toBeNull();
    expect(getVisualizerComponent("dh")).not.toBeNull();
    expect(getVisualizerComponent("hmac")).not.toBeNull();
    expect(getVisualizerComponent("sm3")).not.toBeNull();
  });

  it("returns null for an unregistered cipher", () => {
    expect(getVisualizerComponent("unknown-cipher")).toBeNull();
  });

  it("reports registration status correctly", () => {
    expect(hasVisualizerComponent("aes")).toBe(true);
    expect(hasVisualizerComponent("unknown-cipher")).toBe(false);
  });

  it("exposes registered cipher IDs", () => {
    const ids = getRegisteredVisualizerIds();

    expect(ids).toEqual(
      expect.arrayContaining([
        "playfair",
        "railfence",
        "dh",
        "hmac",
        "sm3",
        "aes",
        "des",
        "frodokem",
        "crc32",
        "siphash",
        "sha256",
        "idea",
      ]),
    );
  });
});