/**
 * Regression tests for the stale/frozen ciphertext bug.
 *
 * Verifies that:
 * 1. Different keys produce different ciphertexts (where mathematically expected)
 * 2. Different plaintexts produce different ciphertexts
 * 3. Sequential mutations produce correct outputs
 * 4. Round-trip encrypt→decrypt recovers original plaintext
 */
import { describe, it, expect } from "vitest";

// Classical ciphers — direct imports for unit-level testing
import * as caesar from "@/lib/cipher/classical/caesar";
import * as vigenere from "@/lib/cipher/classical/vigenere";
import * as affine from "@/lib/cipher/classical/affine";
import * as atbash from "@/lib/cipher/classical/atbash";
import * as railfence from "@/lib/cipher/classical/railfence";
import * as beaufort from "@/lib/cipher/classical/beaufort";
import * as playfair from "@/lib/cipher/classical/playfair";
import * as hill from "@/lib/cipher/classical/hill";
import * as autokey from "@/lib/cipher/classical/autokey";
import * as porta from "@/lib/cipher/classical/porta";

// ---------------------------------------------------------------------------
// Test A — Same plaintext, different keys → different ciphertext
// ---------------------------------------------------------------------------
describe("Stale ciphertext regression — different keys", () => {
  it("Caesar: same plaintext with key 3 vs key 7 produces different output", () => {
    const r1 = caesar.encrypt("HELLO WORLD", "3");
    const r2 = caesar.encrypt("HELLO WORLD", "7");
    expect(r1.output).not.toBe(r2.output);
  });

  it("Caesar: key 3 produces KHOOR ZRUOG", () => {
    expect(caesar.encrypt("HELLO WORLD", "3").output).toBe("KHOOR ZRUOG");
  });

  it("Caesar: key 7 produces OLSSV DVYSK", () => {
    expect(caesar.encrypt("HELLO WORLD", "7").output).toBe("OLSSV DVYSK");
  });

  it("Vigenere: same plaintext with LEMON vs ORANGE produces different output", () => {
    const r1 = vigenere.encrypt("ATTACKATDAWN", "LEMON");
    const r2 = vigenere.encrypt("ATTACKATDAWN", "ORANGE");
    expect(r1.output).not.toBe(r2.output);
  });

  it("Affine: same plaintext with key 5,8 vs 7,3 produces different output", () => {
    const r1 = affine.encrypt("HELLO", "5,8");
    const r2 = affine.encrypt("HELLO", "7,3");
    expect(r1.output).not.toBe(r2.output);
  });

  it("Rail Fence: same plaintext with 2 vs 3 rails produces different output", () => {
    const r1 = railfence.encrypt("HELLO WORLD", "2");
    const r2 = railfence.encrypt("HELLO WORLD", "3");
    expect(r1.output).not.toBe(r2.output);
  });
});

// ---------------------------------------------------------------------------
// Test B — Different plaintext, same key → different ciphertext
// ---------------------------------------------------------------------------
describe("Stale ciphertext regression — different plaintexts", () => {
  it("Caesar: HELLO vs GOODBYE with key 3 produces different output", () => {
    const r1 = caesar.encrypt("HELLO WORLD", "3");
    const r2 = caesar.encrypt("GOODBYE WORLD", "3");
    expect(r1.output).not.toBe(r2.output);
  });

  it("Vigenere: ATTACK vs DEFEND with key LEMON produces different output", () => {
    const r1 = vigenere.encrypt("ATTACKATDAWN", "LEMON");
    const r2 = vigenere.encrypt("DEFENDCASTLE", "LEMON");
    expect(r1.output).not.toBe(r2.output);
  });

  it("Affine: HELLO vs WORLD with key 5,8 produces different output", () => {
    const r1 = affine.encrypt("HELLO", "5,8");
    const r2 = affine.encrypt("WORLD", "5,8");
    expect(r1.output).not.toBe(r2.output);
  });
});

// ---------------------------------------------------------------------------
// Test D — Sequential mutations produce correct results
// ---------------------------------------------------------------------------
describe("Stale ciphertext regression — sequential mutations", () => {
  it("Caesar: sequential key changes produce correct independent results", () => {
    const r1 = caesar.encrypt("A", "1");
    expect(r1.output).toBe("B");

    const r2 = caesar.encrypt("A", "2");
    expect(r2.output).toBe("C");

    const r3 = caesar.encrypt("A", "3");
    expect(r3.output).toBe("D");

    // Go back to key 1 — must not return stale result
    const r4 = caesar.encrypt("A", "1");
    expect(r4.output).toBe("B");

    // Change plaintext with same key — must reflect new plaintext
    const r5 = caesar.encrypt("B", "1");
    expect(r5.output).toBe("C");

    const r6 = caesar.encrypt("C", "1");
    expect(r6.output).toBe("D");
  });

  it("Vigenere: changing key produces correct results each time", () => {
    const results = [
      vigenere.encrypt("HELLO", "A"),
      vigenere.encrypt("HELLO", "B"),
      vigenere.encrypt("HELLO", "C"),
    ];
    // Key A = shift 0, should be identity
    expect(results[0].output).toBe("HELLO");
    // Key B = shift 1
    expect(results[1].output).toBe("IFMMP");
    // Key C = shift 2
    expect(results[2].output).toBe("JGNNQ");
    // All different
    expect(new Set(results.map((r) => r.output)).size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Test E — Round-trip encrypt→decrypt
// ---------------------------------------------------------------------------
describe("Round-trip encrypt→decrypt", () => {
  const testCases = [
    { name: "Caesar", encrypt: caesar.encrypt, decrypt: caesar.decrypt, key: "3", input: "HELLO WORLD" },
    { name: "Caesar (large shift)", encrypt: caesar.encrypt, decrypt: caesar.decrypt, key: "23", input: "THE QUICK BROWN FOX" },
    { name: "Vigenere", encrypt: vigenere.encrypt, decrypt: vigenere.decrypt, key: "LEMON", input: "ATTACKATDAWN" },
    { name: "Vigenere (long key)", encrypt: vigenere.encrypt, decrypt: vigenere.decrypt, key: "CRYPTOGRAPHY", input: "HELLO WORLD" },
    { name: "Affine (5,8)", encrypt: affine.encrypt, decrypt: affine.decrypt, key: "5,8", input: "HELLO WORLD" },
    { name: "Affine (7,3)", encrypt: affine.encrypt, decrypt: affine.decrypt, key: "7,3", input: "TEST" },
    { name: "Beaufort", encrypt: beaufort.encrypt, decrypt: beaufort.decrypt, key: "KEY", input: "HELLO" },
    { name: "Autokey", encrypt: autokey.encrypt, decrypt: autokey.decrypt, key: "KEY", input: "HELLO" },
  ];

  it.each(testCases)("$name: decrypt(encrypt(P, K), K) === P", ({ encrypt: enc, decrypt: dec, key, input }) => {
    const encrypted = enc(input, key);
    const decrypted = dec(encrypted.output, key);
    expect(decrypted.output).toBe(input);
  });
});

// ---------------------------------------------------------------------------
// Golden test vectors — independently verified
// ---------------------------------------------------------------------------
describe("Golden test vectors", () => {
  it("Caesar: HELLO WORLD + key 3 → KHOOR ZRUOG", () => {
    expect(caesar.encrypt("HELLO WORLD", "3").output).toBe("KHOOR ZRUOG");
  });

  it("Caesar: ATTACK AT DAWN + key 13 → NGGNPX NG QNJA", () => {
    expect(caesar.encrypt("ATTACK AT DAWN", "13").output).toBe("NGGNPX NG QNJA");
  });

  it("Caesar: xyz + key 3 → abc", () => {
    expect(caesar.encrypt("xyz", "3").output).toBe("abc");
  });

  it("Vigenere: ATTACKATDAWN + LEMON → LXFOPVEFRNHR", () => {
    expect(vigenere.encrypt("ATTACKATDAWN", "LEMON").output).toBe("LXFOPVEFRNHR");
  });

  it("Vigenere: HELLO + KEY → RIJVS", () => {
    expect(vigenere.encrypt("HELLO", "KEY").output).toBe("RIJVS");
  });

  it("Affine: HELLO + 5,8 → RCLLA", () => {
    expect(affine.encrypt("HELLO", "5,8").output).toBe("RCLLA");
  });

  it("Affine: abc + 3,5 → fil", () => {
    expect(affine.encrypt("abc", "3,5").output).toBe("fil");
  });

  it("Affine: X + 1,0 → X (identity)", () => {
    expect(affine.encrypt("X", "1,0").output).toBe("X");
  });

  it("Atbash: HELLO → SVOOL (self-inverse)", () => {
    const enc = atbash.encrypt("HELLO", "");
    expect(enc.output).toBe("SVOOL");
    const dec = atbash.decrypt("SVOOL", "");
    expect(dec.output).toBe("HELLO");
  });
});

// ---------------------------------------------------------------------------
// Test: cipher output uses both plaintext AND key
// ---------------------------------------------------------------------------
describe("Cipher output depends on both input and key", () => {
  it("Caesar instrumented mode also produces correct results", () => {
    const r1 = caesar.encrypt("HELLO", "3", { instrument: true });
    const r2 = caesar.encrypt("HELLO", "7", { instrument: true });
    expect(r1.output).not.toBe(r2.output);
    expect(r1.output).toBe("KHOOR");
    expect(r2.output).toBe("OLSSV");
  });
});
