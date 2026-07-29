import { describe, expect, it } from "vitest";
import {
  DES_LEFT_SHIFTS,
  bitsToHex,
  generateDesKeySchedule,
  getDesKeyScheduleManualChecklist,
  hexToBits,
  leftRotate,
  splitDesHalves,
  validateDesKeyHex,
} from "../../../lib/symmetric/desKeyScheduleVisualizer";

describe("DES key schedule visualizer utilities", () => {
  it("validates DES key input", () => {
    expect(validateDesKeyHex(" 133457799bbcdff1 ")).toBe("133457799BBCDFF1");
    expect(() => validateDesKeyHex("")).toThrow(/required/i);
    expect(() => validateDesKeyHex("zz")).toThrow(/hexadecimal/i);
    expect(() => validateDesKeyHex("1334")).toThrow(/16 hexadecimal/i);
  });

  it("converts hex to bits and bits to hex", () => {
    const bits = hexToBits("133457799BBCDFF1");
    expect(bits).toHaveLength(64);
    expect(bitsToHex(bits)).toBe("133457799BBCDFF1");
  });

  it("rotates DES halves", () => {
    expect(leftRotate("1001", 1)).toBe("0011");
    expect(leftRotate("1001", 2)).toBe("0110");
  });

  it("splits a 56-bit key into C and D halves", () => {
    const halves = splitDesHalves("0".repeat(28) + "1".repeat(28));
    expect(halves.c).toBe("0".repeat(28));
    expect(halves.d).toBe("1".repeat(28));
  });

  it("uses the standard DES shift schedule", () => {
    expect(DES_LEFT_SHIFTS).toEqual([
      1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1,
    ]);
  });

  it("generates known DES round subkeys for the reference key", () => {
    const result = generateDesKeySchedule("133457799BBCDFF1");

    expect(result.rounds).toHaveLength(16);
    expect(result.permutedKey56).toHaveLength(56);
    expect(result.c0).toHaveLength(28);
    expect(result.d0).toHaveLength(28);
    expect(result.rounds[0].subkey).toBe("1B02EFFC7072");
    expect(result.rounds[1].subkey).toBe("79AED9DBC9E5");
    expect(result.rounds[15].subkey).toBe("CB3D8B0E17F5");
  });

  it("builds educational setup steps", () => {
    const result = generateDesKeySchedule("133457799BBCDFF1");

    expect(result.steps.map((step) => step.id)).toEqual([
      "hex-to-bits",
      "pc1",
      "split",
      "rotate-and-compress",
    ]);
  });

  it("builds manual testing checklist", () => {
    const checklist = getDesKeyScheduleManualChecklist();
    expect(checklist[0]).toMatch(/open the des key schedule/i);
    expect(checklist).toContain("Confirm round 1 subkey is 1B02EFFC7072.");
  });
});
