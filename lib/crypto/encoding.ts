/**
 * Unified Byte & Encoding Conversion Utilities
 * High-performance, zero-dependency byte manipulation layer with strict malformed input validation.
 */

// Lookup tables for high-performance hex conversion
const HEX_LOOKUP: string[] = new Array(256);
const HEX_MAP: Record<string, number> = {};

for (let i = 0; i < 256; i++) {
  const hex = i.toString(16).padStart(2, "0");
  HEX_LOOKUP[i] = hex;
  HEX_MAP[hex] = i;
  HEX_MAP[hex.toUpperCase()] = i;
}

const textEncoder = new TextEncoder();
const fatalTextDecoder = new TextDecoder("utf-8", { fatal: true });

// --- UTF-8 Conversions ---

/**
 * Converts a UTF-8 string into a Uint8Array byte buffer.
 */
export function utf8ToBytes(str: string): Uint8Array {
  if (typeof str !== "string") {
    throw new TypeError("Input must be a string");
  }
  return textEncoder.encode(str);
}

/**
 * Converts a Uint8Array byte buffer into a UTF-8 string.
 * Throws an Error if the byte sequence contains invalid UTF-8 codepoints.
 */
export function bytesToUtf8(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("Input must be a Uint8Array");
  }
  try {
    return fatalTextDecoder.decode(bytes);
  } catch {
    throw new Error("Invalid UTF-8 byte sequence");
  }
}

// --- Hex Conversions ---

const HEX_REGEX = /^[0-9a-fA-F]*$/;

/**
 * Converts a hex-encoded string into a Uint8Array byte buffer.
 * Throws an Error if input length is odd or contains non-hex characters.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== "string") {
    throw new TypeError("Input must be a string");
  }
  const cleanHex = hex.trim();
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string: length must be even");
  }
  if (!HEX_REGEX.test(cleanHex)) {
    throw new Error("Invalid hex string: contains non-hexadecimal characters");
  }

  const length = cleanHex.length / 2;
  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    const pair = cleanHex.substring(i * 2, i * 2 + 2);
    bytes[i] = HEX_MAP[pair];
  }

  return bytes;
}

/**
 * Converts a Uint8Array byte buffer into a hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("Input must be a Uint8Array");
  }
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += HEX_LOOKUP[bytes[i]];
  }
  return hex;
}

// --- Base64 Conversions ---

const BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

/**
 * Converts a base64 string into a Uint8Array byte buffer.
 * Rejects malformed base64 syntax and invalid characters.
 */
export function base64ToBytes(base64: string): Uint8Array {
  if (typeof base64 !== "string") {
    throw new TypeError("Input must be a string");
  }
  const cleanBase64 = base64.trim();
  if (cleanBase64.length > 0 && !BASE64_REGEX.test(cleanBase64)) {
    throw new Error("Invalid base64 string: malformed encoding or characters");
  }

  try {
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch {
    throw new Error("Invalid base64 string: decoding failed");
  }
}

/**
 * Converts a Uint8Array byte buffer into a base64 string.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("Input must be a Uint8Array");
  }
  let binaryString = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}

// --- ArrayBuffer & View Conversions ---

/**
 * Normalizes an ArrayBuffer, SharedArrayBuffer, DataView, or TypedArray into a Uint8Array slice.
 */
export function arrayBufferToBytes(
  buffer: ArrayBufferLike | ArrayBufferView
): Uint8Array {
  if (buffer instanceof Uint8Array) {
    return buffer;
  }
  if (ArrayBuffer.isView(buffer)) {
    return new Uint8Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength
    );
  }
  if (buffer instanceof ArrayBuffer || (typeof SharedArrayBuffer !== "undefined" && buffer instanceof SharedArrayBuffer)) {
    return new Uint8Array(buffer);
  }
  throw new TypeError("Input must be an ArrayBuffer, SharedArrayBuffer, or ArrayBufferView");
}

/**
 * Extracts a standalone ArrayBuffer copy from a Uint8Array.
 */
export function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("Input must be a Uint8Array");
  }
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

// --- Numeric Array Conversions ---

/**
 * Converts a numeric array of bytes (0-255) into a Uint8Array.
 * Throws an Error if any element is out of valid byte range (0..255) or not an integer.
 */
export function numberArrayToBytes(numbers: number[]): Uint8Array {
  if (!Array.isArray(numbers)) {
    throw new TypeError("Input must be an array of numbers");
  }
  const bytes = new Uint8Array(numbers.length);
  for (let i = 0; i < numbers.length; i++) {
    const val = numbers[i];
    if (typeof val !== "number" || !Number.isInteger(val) || val < 0 || val > 255) {
      throw new Error(`Invalid byte value at index ${i}: must be an integer between 0 and 255`);
    }
    bytes[i] = val;
  }
  return bytes;
}

/**
 * Converts a Uint8Array into a plain JavaScript number array.
 */
export function bytesToNumberArray(bytes: Uint8Array): number[] {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("Input must be a Uint8Array");
  }
  return Array.from(bytes);
}