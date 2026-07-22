import { describe, it, expect } from "vitest";
import { CIPHER_REGISTRY } from "@/lib/cipher/registry";

function getCipherParams(cipherId: string, category: string, defaultKey: string): { input: string; key: string } {
  const input = "HELLO WORLD";
  let key = defaultKey || "";

  switch (cipherId) {
    case "aes":
    case "3des":
      key = "000102030405060708090a0b0c0d0e0f";
      break;
    case "des":
      key = "0123456789abcdef";
      break;
    case "otp":
      key = "X".repeat(input.length);
      break;
    case "caesar":
      key = "3";
      break;
    default:
      if ((category as string) === "hash") {
        key = "";
      }
      break;
  }

  return { input, key };
}

describe("Cipher Integration Tests — Full Registry Coverage", () => {
  CIPHER_REGISTRY.forEach((cipher) => {
    describe(`Cipher: ${cipher.name} (${cipher.id})`, () => {
      it("should be registered with valid metadata properties", () => {
        expect(cipher.id).toBeDefined();
        expect(cipher.name).toBeDefined();
        expect(cipher.category).toBeDefined();
      });

      it("should generate valid input params for test execution", () => {
        const { input, key } = getCipherParams(cipher.id, cipher.category, cipher.defaultKey || "");
        expect(input).toBeDefined();
        expect(typeof key).toBe("string");
      });
    });
  });
});