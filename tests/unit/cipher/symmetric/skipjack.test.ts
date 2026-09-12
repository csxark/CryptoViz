import { describe, expect, it } from "vitest";
import {
  assertSkipjackBlockHex,
  assertSkipjackKeyHex,
  decryptSkipjackBlock,
  encryptSkipjackBlock,
  skipjackImplementationNotes,
  traceSkipjack,
} from "../../../../lib/cipher/symmetric/skipjack";

describe("Skipjack encryption and decryption", () => {
  it("matches the official Skipjack sample vector", () => {
    expect(encryptSkipjackBlock("33221100DDCCBBAA", "00998877665544332211")).toBe("2587CAE27A12D300");
  });

  it("decrypts the official Skipjack sample vector", () => {
    expect(decryptSkipjackBlock("2587CAE27A12D300", "00998877665544332211")).toBe("33221100DDCCBBAA");
  });

  it("round trips a zero block and zero key", () => {
    const plaintext = "0000000000000000";
    const key = "00000000000000000000";
    const ciphertext = encryptSkipjackBlock(plaintext, key);

    expect(ciphertext).toMatch(/^[A-F0-9]{16}$/);
    expect(decryptSkipjackBlock(ciphertext, key)).toBe(plaintext);
  });

  it("round trips non-zero demo values", () => {
    const plaintext = "0011223344556677";
    const key = "00010203040506070809";
    const ciphertext = encryptSkipjackBlock(plaintext, key);

    expect(ciphertext).toMatch(/^[A-F0-9]{16}$/);
    expect(decryptSkipjackBlock(ciphertext, key)).toBe(plaintext);
  });

  it("normalizes valid hex inputs", () => {
    expect(assertSkipjackBlockHex(" 00 11 22 33 44 55 66 77 ")).toBe("0011223344556677");
    expect(assertSkipjackKeyHex(" 00 01 02 03 04 05 06 07 08 09 ")).toBe("00010203040506070809");
  });

  it("rejects invalid block and key values", () => {
    expect(() => assertSkipjackBlockHex("")).toThrow(/block is required/i);
    expect(() => assertSkipjackBlockHex("0011")).toThrow(/16 hexadecimal/i);
    expect(() => assertSkipjackBlockHex("00112233445566ZZ")).toThrow(/hexadecimal/i);

    expect(() => assertSkipjackKeyHex("")).toThrow(/key is required/i);
    expect(() => assertSkipjackKeyHex("000102")).toThrow(/20 hexadecimal/i);
    expect(() => assertSkipjackKeyHex("0001020304050607080Z")).toThrow(/hexadecimal/i);
  });

  it("returns encryption and decryption traces", () => {
    const key = "00998877665544332211";
    const plaintext = "33221100DDCCBBAA";
    const ciphertext = encryptSkipjackBlock(plaintext, key);

    const encryptTrace = traceSkipjack(plaintext, key, "encrypt");
    const decryptTrace = traceSkipjack(ciphertext, key, "decrypt");

    expect(encryptTrace.outputHex).toBe(ciphertext);
    expect(decryptTrace.outputHex).toBe(plaintext);
    expect(encryptTrace.rounds).toHaveLength(32);
    expect(decryptTrace.rounds).toHaveLength(32);
    expect(encryptTrace.rounds[0]).toMatchObject({ round: 1, rule: "A" });
    expect(decryptTrace.rounds[0]).toMatchObject({ round: 32, rule: "B-inverse" });
  });

  it("documents the decryption implementation", () => {
    expect(skipjackImplementationNotes().some((note) => note.includes("Decryption walks rounds in reverse order"))).toBe(true);
    expect(skipjackImplementationNotes().some((note) => note.includes("inverse Rule A"))).toBe(true);
  });
});
