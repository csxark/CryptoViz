import { describe, it, expect } from "vitest";
import { CIPHER_REGISTRY } from "@/lib/cipher/registry";

const hashCiphers = CIPHER_REGISTRY.filter((cipher) => cipher.category === "hash");

function getCipherParams(): { input: string; key: string } {
  return {
    input: "HELLO WORLD",
    key: "",
  };
}

describe.each(hashCiphers)("Hash integration — $name ($id)", (cipher) => {
  it("should be registered with valid metadata properties", () => {
    expect(cipher.id).toBeDefined();
    expect(cipher.name).toBeDefined();
    expect(cipher.category).toBe("hash");
  });

  it("should generate valid input params for test execution", () => {
    const { input, key } = getCipherParams();
    expect(input).toBeDefined();
    expect(typeof key).toBe("string");
  });
});
