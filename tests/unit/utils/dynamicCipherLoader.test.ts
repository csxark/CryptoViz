import { describe, expect, it } from "vitest";
import {
  encryptCustomSBoxBlock,
  encryptAffine,
  decryptAffine,
  modInverse26,
  DynamicCipherRegistry,
  DEFAULT_DYNAMIC_CIPHERS,
  exportDynamicCipherJSON,
  importDynamicCipherJSON,
  type DynamicCipherDefinition,
} from "@/lib/utils/dynamicCipherLoader";

describe("dynamicCipherLoader utility", () => {
  it("correctly executes Affine cipher encryption and decryption", () => {
    const plaintext = "AFFINE";
    const a = 5;
    const b = 8;

    const encrypted = encryptAffine(plaintext, a, b);
    expect(encrypted).not.toBe(plaintext);

    const decrypted = decryptAffine(encrypted, a, b);
    expect(decrypted).toBe(plaintext);
  });

  it("calculates multiplicative inverse modulo 26 correctly", () => {
    expect(modInverse26(5)).toBe(21); // 5 * 21 = 105 = 4*26 + 1
    expect(modInverse26(7)).toBe(15); // 7 * 15 = 105 = 4*26 + 1
  });

  it("executes custom S-Box block substitution", () => {
    const sbox = [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7];
    const hexOutput = encryptCustomSBoxBlock("TEST", sbox);
    expect(hexOutput).toMatch(/^[0-9a-f]+$/);
    expect(hexOutput.length).toBe(8); // 4 bytes -> 8 hex chars
  });

  it("registers and manages dynamic ciphers in registry", async () => {
    const ciphers = DynamicCipherRegistry.getCiphers();
    expect(ciphers.length).toBeGreaterThan(0);

    const metrics = await DynamicCipherRegistry.loadCipherDynamically(ciphers[0].id);
    expect(metrics.status).toBe("ready");
    expect(metrics.initializationTimeMs).toBeGreaterThanOrEqual(0);

    const newCipher: DynamicCipherDefinition = {
      id: "custom-test-1",
      name: "Custom Test Cipher",
      category: "symmetric",
      cipherType: "substitution",
      description: "Test cipher definition",
      defaultInput: "ABC",
      defaultKey: "K",
      securityStatus: "legacy",
      isDynamic: true,
    };

    const updatedList = DynamicCipherRegistry.registerCustomCipher(newCipher);
    expect(updatedList.some((c) => c.id === "custom-test-1")).toBe(true);
  });

  it("exports and imports valid JSON cipher schemas", () => {
    const original = DEFAULT_DYNAMIC_CIPHERS[0];
    const jsonStr = exportDynamicCipherJSON(original);
    const imported = importDynamicCipherJSON(jsonStr);

    expect(imported.id).toBe(original.id);
    expect(imported.name).toBe(original.name);
    expect(imported.cipherType).toBe(original.cipherType);
    expect(imported.isDynamic).toBe(true);
  });
});
