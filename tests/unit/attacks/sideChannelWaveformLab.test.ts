import { describe, expect, it } from "vitest";
import {
  autoExtractRsaBits,
  buildCacheHeatmap,
  buildDpaCandidates,
  buildRsaWaveform,
  DEFAULT_DPA_KEY,
  DEFAULT_RSA_BITS,
  WAVEFORM_SAMPLES_PER_CYCLE,
} from "../../../lib/attacks/sideChannelWaveformLab";

describe("side-channel waveform lab utilities", () => {
  it("builds one waveform cycle per RSA bit", () => {
    const { waveform, cycles } = buildRsaWaveform(DEFAULT_RSA_BITS);

    expect(cycles).toHaveLength(DEFAULT_RSA_BITS.length);
    expect(waveform).toHaveLength(
      DEFAULT_RSA_BITS.length * WAVEFORM_SAMPLES_PER_CYCLE,
    );
    expect(cycles.map((cycle) => cycle.bit)).toEqual(DEFAULT_RSA_BITS);
    expect(cycles.map((cycle) => cycle.operation)).toEqual([
      "Square + Multiply",
      "Square",
      "Square + Multiply",
      "Square + Multiply",
      "Square",
      "Square + Multiply",
    ]);
  });

  it("auto-extracts the simulated RSA key bits", () => {
    const { cycles } = buildRsaWaveform(DEFAULT_RSA_BITS);

    expect(autoExtractRsaBits(cycles)).toEqual(DEFAULT_RSA_BITS);
  });

  it("rejects malformed RSA bit input", () => {
    expect(() => buildRsaWaveform([])).toThrow(/non-empty/i);
    expect(() => buildRsaWaveform([1, 0, 2])).toThrow(/only 0 or 1/i);
  });

  it("ranks the DPA secret key as the strongest correlation", () => {
    const { candidates, correctKey } = buildDpaCandidates(96, DEFAULT_DPA_KEY);
    const best = candidates[0];

    expect(correctKey).toBe(DEFAULT_DPA_KEY);
    expect(best.key).toBe(DEFAULT_DPA_KEY);
    expect(Math.abs(best.correlation)).toBeGreaterThan(0.7);
    expect(candidates).toHaveLength(256);
  });

  it("keeps the DPA candidate space at one byte", () => {
    expect(() => buildDpaCandidates(15)).toThrow(/16 and 500/i);
    expect(() => buildDpaCandidates(501)).toThrow(/16 and 500/i);
  });

  it("builds cache phases with flush, access, and reload states", () => {
    const { cells, accessedLines } = buildCacheHeatmap();
    const states = new Set(cells.map((cell) => cell.state));

    expect(cells).toHaveLength(32 * 20);
    expect(accessedLines).toEqual([3, 7, 11, 18, 23]);
    expect(states).toEqual(
      new Set(["flush", "access", "reload-fast", "reload-slow", "idle"]),
    );
  });
});
