import { describe, expect, it } from "vitest";
import {
  AES_128_ROUND_COUNT,
  AES_128_WORD_COUNT,
  DEFAULT_AES_KEY_EXPANSION_INPUT,
  applyRcon,
  expandAes128Key,
  getAesKeyExpansionManualChecklist,
  parseAesKeyBytes,
  rotWord,
  subWord,
  validateAes128KeyHex,
} from "../../../lib/symmetric/aesKeyExpansionVisualizer";

describe("AES key expansion visualizer utilities", () => {
  it("validates AES-128 key input", () => {
    expect(validateAes128KeyHex(" 000102030405060708090a0b0c0d0e0f ")).toBe(
      "000102030405060708090a0b0c0d0e0f",
    );
    expect(() => validateAes128KeyHex("")).toThrow(/required/i);
    expect(() => validateAes128KeyHex("zz")).toThrow(/hexadecimal/i);
    expect(() => validateAes128KeyHex("0011")).toThrow(/32 hexadecimal/i);
  });

  it("parses AES key bytes", () => {
    expect(
      parseAesKeyBytes(DEFAULT_AES_KEY_EXPANSION_INPUT.keyHex),
    ).toHaveLength(16);
  });

  it("performs RotWord, SubWord, and Rcon", () => {
    expect(rotWord([0x09, 0xcf, 0x4f, 0x3c])).toEqual([0xcf, 0x4f, 0x3c, 0x09]);
    expect(subWord([0xcf, 0x4f, 0x3c, 0x09])).toEqual([0x8a, 0x84, 0xeb, 0x01]);
    expect(applyRcon([0x8a, 0x84, 0xeb, 0x01], 1)).toEqual([
      0x8b, 0x84, 0xeb, 0x01,
    ]);
  });

  it("expands the NIST AES-128 demo key into 44 words and 11 round keys", () => {
    const result = expandAes128Key(DEFAULT_AES_KEY_EXPANSION_INPUT.keyHex);

    expect(result.expandedWords).toHaveLength(AES_128_WORD_COUNT);
    expect(result.roundKeys).toHaveLength(AES_128_ROUND_COUNT);
    expect(result.roundKeys[0].roundKey).toBe(
      "000102030405060708090a0b0c0d0e0f",
    );
    expect(result.roundKeys[1].roundKey).toBe(
      "d6aa74fdd2af72fadaa678f1d6ab76fe",
    );
    expect(result.roundKeys[10].roundKey).toBe(
      "13111d7fe3944a17f307a78b4d2b30c5",
    );
  });

  it("marks every fourth generated word as the Rcon transformation path", () => {
    const result = expandAes128Key(DEFAULT_AES_KEY_EXPANSION_INPUT.keyHex);

    expect(result.expandedWords[4].source).toBe("rcon");
    expect(result.expandedWords[8].source).toBe("rcon");
    expect(result.expandedWords[5].source).toBe("xor");
  });

  it("builds manual testing checklist", () => {
    const checklist = getAesKeyExpansionManualChecklist();

    expect(checklist[0]).toMatch(/open the aes key expansion/i);
    expect(checklist).toContain(
      "Confirm the default AES-128 key expands into 44 words.",
    );
  });
});
