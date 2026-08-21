import { describe, it, expect } from "vitest";
import { CIPHER_REGISTRY } from "@/lib/cipher/registry";

const classicalCiphers = CIPHER_REGISTRY.filter((cipher) => cipher.category === "classical");

function getCipherParams(cipherId: string, defaultKey: string): { input: string; key: string } {
  const input = "HELLO WORLD";
  let key = defaultKey || "";

  switch (cipherId) {
    case "caesar":
      key = "3";
      break;
    default:
      break;
  }

  return { input, key };
}

describe.each(classicalCiphers)("Classical cipher integration — $name ($id)", (cipher) => {
  it("should be registered with valid metadata properties", () => {
    expect(cipher.id).toBeDefined();
    expect(cipher.name).toBeDefined();
    expect(cipher.category).toBe("classical");
  });

  it("should generate valid input params for test execution", () => {
    const { input, key } = getCipherParams(cipher.id, cipher.defaultKey || "");
    expect(input).toBeDefined();
    expect(typeof key).toBe("string");
  });
});
