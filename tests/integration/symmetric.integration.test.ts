import { describe, it, expect } from "vitest";
import { CIPHER_REGISTRY } from "@/lib/cipher/registry";

const symmetricCiphers = CIPHER_REGISTRY.filter((cipher) => cipher.category === "symmetric");

function getCipherParams(cipherId: string, defaultKey: string): { input: string; key: string } {
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
    default:
      break;
  }

  return { input, key };
}

describe.each(symmetricCiphers)("Symmetric cipher integration — $name ($id)", (cipher) => {
  it("should be registered with valid metadata properties", () => {
    expect(cipher.id).toBeDefined();
    expect(cipher.name).toBeDefined();
    expect(cipher.category).toBe("symmetric");
  });

  it("should generate valid input params for test execution", () => {
    const { input, key } = getCipherParams(cipher.id, cipher.defaultKey || "");
    expect(input).toBeDefined();
    expect(typeof key).toBe("string");
  });
});
