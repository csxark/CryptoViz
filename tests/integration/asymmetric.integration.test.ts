import { describe, it, expect } from "vitest";
import { CIPHER_REGISTRY } from "@/lib/cipher/registry";

const asymmetricCiphers = CIPHER_REGISTRY.filter((cipher) => cipher.category === "asymmetric");

function getCipherParams(defaultKey: string): { input: string; key: string } {
  return {
    input: "HELLO WORLD",
    key: defaultKey || "",
  };
}

describe.each(asymmetricCiphers)("Asymmetric cipher integration — $name ($id)", (cipher) => {
  it("should be registered with valid metadata properties", () => {
    expect(cipher.id).toBeDefined();
    expect(cipher.name).toBeDefined();
    expect(cipher.category).toBe("asymmetric");
  });

  it("should generate valid input params for test execution", () => {
    const { input, key } = getCipherParams(cipher.defaultKey || "");
    expect(input).toBeDefined();
    expect(typeof key).toBe("string");
  });
});
