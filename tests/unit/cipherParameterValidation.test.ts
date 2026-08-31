import { describe, expect, it } from "vitest";
import {
  assertValidCipherParameters,
  buildCipherParameterSchema,
  validateCipherParameters,
} from "../../lib/cipher/parameterValidation";
import { CIPHER_REGISTRY } from "../../lib/cipher/registry";
import { CipherError } from "../../lib/utils/errors";

function getCipher(id: string) {
  const definition = CIPHER_REGISTRY.find(
    (cipher) => cipher.id === id,
  );

  if (!definition) {
    throw new Error(`Missing test cipher: ${id}`);
  }

  return definition;
}

describe("cryptographic parameter validation framework", () => {
  it("exposes a schema for every registered cipher", () => {
    for (const definition of CIPHER_REGISTRY) {
      const schema = buildCipherParameterSchema(definition);

      expect(schema.cipherId).toBe(definition.id);
      expect(schema.parameters.length).toBeGreaterThan(0);
    }
  });

  it("accepts a valid AES-128 configuration", () => {
    const result = validateCipherParameters(
      getCipher("aes"),
      "00112233445566778899aabbccddeeff",
      "000102030405060708090a0b0c0d0e0f",
      {
        mode: "CBC",
        hexInput: true,
      },
    );

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects an invalid AES key length", () => {
    const result = validateCipherParameters(
      getCipher("aes"),
      "00112233445566778899aabbccddeeff",
      "000102030405060708090a0b0c",
      {
        mode: "CBC",
        hexInput: true,
      },
    );

    expect(result.valid).toBe(false);
    expect(result.issues[0]).toMatchObject({
      parameter: "key",
      code: "INVALID_KEY_LENGTH",
    });
  });

  it("rejects an IV when AES is configured for ECB", () => {
    const result = validateCipherParameters(
      getCipher("aes"),
      "00112233445566778899aabbccddeeff",
      "000102030405060708090a0b0c0d0e0f",
      {
        mode: "ECB",
        iv: "00000000000000000000000000000000",
      },
    );

    expect(result.valid).toBe(false);
    expect(result.issues[0]).toMatchObject({
      parameter: "iv",
      code: "INVALID_OPTION",
    });
  });

  it("rejects an invalid AES-CCM nonce length", () => {
    const result = validateCipherParameters(
      getCipher("aes-ccm"),
      "48656c6c6f",
      "2b7e151628aed2a6abf7158809cf4f3c|0001020304050607",
    );

    expect(result.valid).toBe(false);
    expect(result.issues[0]).toMatchObject({
      parameter: "nonceHex",
    });
  });

  it("rejects identical AES-XTS key parts", () => {
    const key =
      "000102030405060708090a0b0c0d0e0f|" +
      "000102030405060708090a0b0c0d0e0f";

    const result = validateCipherParameters(
      getCipher("aes-xts"),
      "0|00112233445566778899aabbccddeeff",
      key,
    );

    expect(result.valid).toBe(false);
    expect(result.issues[0]).toMatchObject({
      parameter: "key",
      code: "INVALID_KEY",
    });
  });

  it("validates PBKDF2 numeric boundaries", () => {
    const valid = validateCipherParameters(
      getCipher("pbkdf2"),
      "password",
      "salt",
      {
        iterations: 1,
        keyLength: 1,
      },
    );

    expect(valid.valid).toBe(true);

    const invalid = validateCipherParameters(
      getCipher("pbkdf2"),
      "password",
      "salt",
      {
        iterations: 0,
        keyLength: 0,
      },
    );

    expect(invalid.valid).toBe(false);
    expect(invalid.issues.length).toBeGreaterThanOrEqual(2);
  });

  it("returns structured CipherError details", () => {
    expect(() =>
      assertValidCipherParameters(
        getCipher("aes"),
        "00112233445566778899aabbccddeeff",
        "000102030405060708090a0b0c",
        { mode: "CBC" },
      ),
    ).toThrowError(CipherError);

    try {
      assertValidCipherParameters(
        getCipher("aes"),
        "00112233445566778899aabbccddeeff",
        "000102030405060708090a0b0c",
        { mode: "CBC" },
      );
    } catch (error) {
      expect(error).toMatchObject({
        code: "INVALID_KEY_LENGTH",
        details: {
          type: "parameter-validation",
          cipherId: "aes",
          parameter: "key",
        },
      });
    }
  });
});