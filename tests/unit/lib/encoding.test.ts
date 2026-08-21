import {
  utf8ToBytes,
  bytesToUtf8,
  hexToBytes,
  bytesToHex,
  base64ToBytes,
  bytesToBase64,
  arrayBufferToBytes,
  bytesToArrayBuffer,
  numberArrayToBytes,
  bytesToNumberArray,
} from "../../../lib/crypto/encoding";

describe("Standardized Byte & Encoding Utilities", () => {
  describe("UTF-8 Conversions", () => {
    test("round-trip UTF-8 string conversion", () => {
      const input = "CryptoDebugger 🔐 ✨ 123";
      const bytes = utf8ToBytes(input);
      expect(bytesToUtf8(bytes)).toBe(input);
    });

    test("rejects malformed UTF-8 sequences", () => {
      const invalidUtf8 = new Uint8Array([0xff, 0xff, 0xff]);
      expect(() => bytesToUtf8(invalidUtf8)).toThrow("Invalid UTF-8 byte sequence");
    });
  });

  describe("Hex Conversions", () => {
    test("round-trip hex conversion", () => {
      const originalHex = "000102feff48656c6c6f";
      const bytes = hexToBytes(originalHex);
      expect(bytesToHex(bytes)).toBe(originalHex);
    });

    test("handles upper and lowercase hex inputs", () => {
      const mixedHex = "48656C6C6F";
      const bytes = hexToBytes(mixedHex);
      expect(bytesToHex(bytes)).toBe("48656c6c6f");
    });

    test("rejects odd-length hex strings", () => {
      expect(() => hexToBytes("123")).toThrow("Invalid hex string: length must be even");
    });

    test("rejects invalid hex characters", () => {
      expect(() => hexToBytes("001G")).toThrow("Invalid hex string: contains non-hexadecimal characters");
    });
  });

  describe("Base64 Conversions", () => {
    test("round-trip base64 conversion", () => {
      const originalBase64 = "SGVsbG8gV29ybGQ=";
      const bytes = base64ToBytes(originalBase64);
      expect(bytesToBase64(bytes)).toBe(originalBase64);
    });

    test("rejects malformed base64 strings", () => {
      expect(() => base64ToBytes("NotValidBase64!!!")).toThrow("Invalid base64 string");
    });
  });

  describe("ArrayBuffer Conversions", () => {
    test("converts ArrayBuffer and DataView to Uint8Array and back", () => {
      const buffer = new Uint8Array([10, 20, 30]).buffer;
      const bytes = arrayBufferToBytes(buffer);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes).toEqual(new Uint8Array([10, 20, 30]));

      const extractedBuffer = bytesToArrayBuffer(bytes);
      expect(extractedBuffer.byteLength).toBe(3);
    });
  });

  describe("Number Array Conversions", () => {
    test("round-trip number array conversion", () => {
      const numbers = [0, 127, 255];
      const bytes = numberArrayToBytes(numbers);
      expect(bytesToNumberArray(bytes)).toEqual(numbers);
    });

    test("rejects numbers out of 0-255 byte range", () => {
      expect(() => numberArrayToBytes([0, 256])).toThrow("Invalid byte value at index 1");
      expect(() => numberArrayToBytes([-1, 100])).toThrow("Invalid byte value at index 0");
      expect(() => numberArrayToBytes([10.5, 100])).toThrow("Invalid byte value at index 0");
    });
  });
});