/**
 * Unit tests for the Morse Code Encoder/Decoder.
 */

import { describe, it, expect } from "vitest";
import {
  encodeMorse,
  decodeMorse,
  generateWaveform,
  farnsworthTiming,
  stripAccents,
  isMorseChar,
  getMorseForChar,
  getCharForMorse,
  calculateWPM,
  MORSE_TABLE,
} from "@/lib/encoding/morseCode";

// ─── MORSE_TABLE sanity ──────────────────────────────────────────────────────

describe("MORSE_TABLE", () => {
  it("contains all 26 letters", () => {
    for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      expect(MORSE_TABLE[ch]).toBeDefined();
      expect(typeof MORSE_TABLE[ch]).toBe("string");
      expect(MORSE_TABLE[ch].length).toBeGreaterThan(0);
    }
  });

  it("contains all 10 digits", () => {
    for (const d of "0123456789") {
      expect(MORSE_TABLE[d]).toBeDefined();
    }
  });

  it("E is a single dot", () => {
    expect(MORSE_TABLE["E"]).toBe(".");
  });

  it("T is a single dash", () => {
    expect(MORSE_TABLE["T"]).toBe("-");
  });

  it("SOS is ···---···", () => {
    expect(MORSE_TABLE["S"]).toBe("...");
    expect(MORSE_TABLE["O"]).toBe("---");
  });

  it("maps space to /", () => {
    expect(MORSE_TABLE[" "]).toBe("/");
  });
});

// ─── stripAccents ────────────────────────────────────────────────────────────

describe("stripAccents", () => {
  it("removes accents from common characters", () => {
    expect(stripAccents("É")).toBe("E");
    expect(stripAccents("Ñ")).toBe("N");
    expect(stripAccents("Ü")).toBe("U");
    expect(stripAccents("Ç")).toBe("C");
  });

  it("preserves non-accented characters", () => {
    expect(stripAccents("HELLO")).toBe("HELLO");
    expect(stripAccents("123")).toBe("123");
  });

  it("handles empty string", () => {
    expect(stripAccents("")).toBe("");
  });

  it("handles ß as SS", () => {
    expect(stripAccents("ß")).toBe("SS");
  });
});

// ─── isMorseChar ─────────────────────────────────────────────────────────────

describe("isMorseChar", () => {
  it("returns true for letters", () => {
    expect(isMorseChar("A")).toBe(true);
    expect(isMorseChar("z")).toBe(true);
  });

  it("returns true for digits", () => {
    expect(isMorseChar("0")).toBe(true);
    expect(isMorseChar("9")).toBe(true);
  });

  it("returns true for space", () => {
    expect(isMorseChar(" ")).toBe(true);
  });

  it("returns false for unsupported chars", () => {
    expect(isMorseChar("~")).toBe(false);
  });
});

// ─── getMorseForChar ─────────────────────────────────────────────────────────

describe("getMorseForChar", () => {
  it("returns correct code for A", () => {
    expect(getMorseForChar("A")).toBe(".-");
  });

  it("returns correct code for lowercase", () => {
    expect(getMorseForChar("a")).toBe(".-");
  });

  it("returns empty for unknown", () => {
    expect(getMorseForChar("~")).toBe("");
  });
});

// ─── getCharForMorse ─────────────────────────────────────────────────────────

describe("getCharForMorse", () => {
  it("returns A for .-", () => {
    expect(getCharForMorse(".-")).toBe("A");
  });

  it("returns ? for unknown", () => {
    expect(getCharForMorse("......")).toBe("?");
  });
});

// ─── encodeMorse ─────────────────────────────────────────────────────────────

describe("encodeMorse", () => {
  it("encodes SOS correctly", () => {
    const result = encodeMorse("SOS");
    expect(result.morse).toContain("...");
    expect(result.morse).toContain("---");
  });

  it("encodes single letter", () => {
    const result = encodeMorse("A");
    expect(result.morse).toBe(".-");
    expect(result.characters.length).toBe(1);
  });

  it("handles empty input", () => {
    const result = encodeMorse("");
    expect(result.morse).toBe("");
    expect(result.characters.length).toBe(0);
  });

  it("preserves original input", () => {
    const result = encodeMorse("Hello");
    expect(result.input).toBe("Hello");
  });

  it("converts to uppercase", () => {
    const result = encodeMorse("abc");
    const chars = result.characters.map((c) => c.char);
    expect(chars).toContain("A");
    expect(chars).toContain("B");
    expect(chars).toContain("C");
  });

  it("reports total units > 0", () => {
    const result = encodeMorse("TEST");
    expect(result.totalUnits).toBeGreaterThan(0);
  });

  it("estimates duration > 0", () => {
    const result = encodeMorse("TEST");
    expect(result.estimatedDurationMs).toBeGreaterThan(0);
  });

  it("encodes digits", () => {
    const result = encodeMorse("1");
    expect(result.morse).toBe(".----");
  });

  it("encodes punctuation", () => {
    const result = encodeMorse(".");
    expect(result.morse).toBe(".-.-.-");
  });
});

// ─── decodeMorse ─────────────────────────────────────────────────────────────

describe("decodeMorse", () => {
  it("decodes SOS", () => {
    const result = decodeMorse("... --- ...");
    expect(result.decoded).toContain("S");
    expect(result.decoded).toContain("O");
  });

  it("decodes single character", () => {
    const result = decodeMorse(".-");
    expect(result.decoded).toBe("A");
  });

  it("decodes with word separator /", () => {
    const result = decodeMorse(".... . / .-.. .-.. ---");
    expect(result.decoded).toBe("HELLO");
  });

  it("handles empty input", () => {
    const result = decodeMorse("");
    expect(result.decoded).toBe("");
  });

  it("returns ? for unknown codes", () => {
    const result = decodeMorse("......");
    expect(result.decoded).toContain("?");
  });
});

// ─── generateWaveform ────────────────────────────────────────────────────────

describe("generateWaveform", () => {
  it("generates high ranges for dots and dashes", () => {
    const wf = generateWaveform("E"); // E = "." → one high range
    expect(wf.highRanges.length).toBe(1);
    expect(wf.highRanges[0][1] - wf.highRanges[0][0]).toBe(1); // dot = 1 unit
  });

  it("dash is 3x dot duration", () => {
    const wf = generateWaveform("T"); // T = "-" → one high range of 3
    expect(wf.highRanges.length).toBe(1);
    expect(wf.highRanges[0][1] - wf.highRanges[0][0]).toBe(3);
  });

  it("has char timings", () => {
    const wf = generateWaveform("HI");
    expect(wf.charTimings.length).toBe(2);
    expect(wf.charTimings[0].char).toBe("H");
    expect(wf.charTimings[1].char).toBe("I");
  });

  it("total duration is positive", () => {
    const wf = generateWaveform("TEST");
    expect(wf.totalDuration).toBeGreaterThan(0);
  });

  it("handles empty input", () => {
    const wf = generateWaveform("");
    expect(wf.highRanges.length).toBe(0);
    expect(wf.totalDuration).toBe(0);
  });
});

// ─── farnsworthTiming ────────────────────────────────────────────────────────

describe("farnsworthTiming", () => {
  it("dot is the base unit", () => {
    const timing = farnsworthTiming(20);
    expect(timing.dotMs).toBeGreaterThan(0);
  });

  it("dash is 3x dot", () => {
    const timing = farnsworthTiming(20);
    expect(timing.dashMs).toBeCloseTo(timing.dotMs * 3, 0);
  });

  it("word gap is 7x dot", () => {
    const timing = farnsworthTiming(20);
    expect(timing.wordMs).toBeCloseTo(timing.dotMs * 7, 0);
  });

  it("faster WPM means shorter durations", () => {
    const slow = farnsworthTiming(5);
    const fast = farnsworthTiming(40);
    expect(fast.dotMs).toBeLessThan(slow.dotMs);
  });
});

// ─── calculateWPM ────────────────────────────────────────────────────────────

describe("calculateWPM", () => {
  it("returns 0 for zero duration", () => {
    expect(calculateWPM("... --- ...", 0)).toBe(0);
  });

  it("returns a positive number for valid input", () => {
    const wpm = calculateWPM("... --- ...", 3);
    expect(wpm).toBeGreaterThan(0);
  });
});
