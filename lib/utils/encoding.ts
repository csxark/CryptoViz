/**
 * Shared binary/text encoding helpers.
 *
 * This module is intentionally dependency-free so every cipher domain can use the
 * same validation and representation rules without pulling in a cipher-specific
 * implementation.
 *
 * Supported representations:
 * - hexadecimal (strict, byte-oriented)
 * - base64 (standard and URL-safe)
 * - binary/bit strings
 * The helpers are deliberately small and deterministic. Cipher implementations
 * should not define local parseHex/toHex copies.
 */
import type { Encoding } from '../cipher/types';
import { CipherError, validateHexString } from './errors';

export type BinaryInput = Uint8Array | readonly number[];

export { validateHexString };

export interface HexOptions {
  allowWhitespace?: boolean;
  allowPrefix?: boolean;
  expectedBytes?: number;
  label?: string;
}

export interface Base64Options {
  urlSafe?: boolean;
  allowWhitespace?: boolean;
  expectedBytes?: number;
  label?: string;
}

export interface BinaryOptions {
  allowWhitespace?: boolean;
  expectedBits?: number;
  label?: string;
}

const HEX_RE = /^[0-9a-fA-F]*$/;
const BINARY_RE = /^[01]*$/;
const BASE64_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const BASE64URL_RE = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2}(?:==)?|[A-Za-z0-9_-]{3}=?)?$/;

function normalizeWhitespace(value: string, allowWhitespace: boolean, label: string): string {
  if (allowWhitespace) {
    return value.replace(/\s+/g, '');
  }
  if (/\s/.test(value)) {
    throw new Error(`${label} must not contain whitespace.`);
  }
  return value;
}

function assertExpectedLength(actual: number, expected: number | undefined, unit: string, label: string): void {
  if (expected !== undefined && actual !== expected) {
    throw new Error(`${label} must contain exactly ${expected} ${unit}; received ${actual}.`);
  }
}

/**
 * Clone an input into a fresh Uint8Array.
 */
export function asBytes(input: BinaryInput): Uint8Array {
  if (input instanceof Uint8Array) {
    return new Uint8Array(input);
  }

  const bytes = new Uint8Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    const value = input[index];
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      throw new Error(`Byte at index ${index} must be an integer from 0 to 255.`);
    }
    bytes[index] = value;
  }
  return bytes;
}

/**
 * Parse an even-length hexadecimal string into bytes.
 */
export function parseHex(value: string, options: HexOptions = {}): Uint8Array {
  const label = options.label ?? 'Hex value';
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string.`);
  }

  let normalized = normalizeWhitespace(value, options.allowWhitespace ?? true, label);
  if (options.allowPrefix && /^0x/i.test(normalized)) {
    normalized = normalized.slice(2);
  }

  if (normalized.length % 2 !== 0) {
    throw new Error(`${label} must contain an even number of hexadecimal characters.`);
  }
  if (!HEX_RE.test(normalized)) {
    throw new Error(`${label} contains non-hexadecimal characters.`);
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }

  assertExpectedLength(bytes.length, options.expectedBytes, 'bytes', label);
  return bytes;
}

/**
 * Convert bytes to canonical lowercase hexadecimal.
 */
export function toHex(input: BinaryInput): string {
  const bytes = asBytes(input);
  let output = '';
  for (const byte of bytes) {
    output += byte.toString(16).padStart(2, '0');
  }
  return output;
}

/**
 * Parse a binary string into bytes. The bit length must be a multiple of 8.
 */
export function parseBinary(value: string, options: BinaryOptions = {}): Uint8Array {
  const label = options.label ?? 'Binary value';
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string.`);
  }

  const normalized = normalizeWhitespace(value, options.allowWhitespace ?? true, label);
  if (!BINARY_RE.test(normalized)) {
    throw new Error(`${label} contains characters other than 0 and 1.`);
  }
  assertExpectedLength(normalized.length, options.expectedBits, 'bits', label);

  if (normalized.length % 8 !== 0) {
    throw new Error(`${label} must contain a multiple of 8 bits.`);
  }

  const bytes = new Uint8Array(normalized.length / 8);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 8, index * 8 + 8), 2);
  }
  return bytes;
}

/**
 * Convert bytes to an eight-bit-per-byte binary string.
 */
export function toBinary(input: BinaryInput): string {
  const bytes = asBytes(input);
  let output = '';
  for (const byte of bytes) {
    output += byte.toString(2).padStart(8, '0');
  }
  return output;
}

/**
 * Decode standard or URL-safe base64 into bytes.
 */
export function parseBase64(value: string, options: Base64Options = {}): Uint8Array {
  const label = options.label ?? 'Base64 value';
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string.`);
  }

  let normalized = normalizeWhitespace(value, options.allowWhitespace ?? true, label);
  if (options.urlSafe) {
    normalized = normalized.replace(/-/g, '+').replace(/_/g, '/');
  }

  if (!BASE64_RE.test(normalized)) {
    throw new Error(`${label} is not valid base64.`);
  }

  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const decoded = typeof globalThis.atob === 'function'
    ? globalThis.atob(padded)
    : decodeBase64Fallback(padded);

  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }

  assertExpectedLength(bytes.length, options.expectedBytes, 'bytes', label);
  return bytes;
}

/**
 * Convert bytes to standard base64.
 */
export function toBase64(input: BinaryInput): string {
  const bytes = asBytes(input);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(binary);
  }
  return encodeBase64Fallback(binary);
}

/**
 * Convert bytes to URL-safe, padding-free base64.
 */
export function toBase64Url(input: BinaryInput): string {
  return toBase64(input)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/**
 * Convert a base64url string to bytes.
 */
export function parseBase64Url(value: string, options: Omit<Base64Options, 'urlSafe'> = {}): Uint8Array {
  return parseBase64(value, { ...options, urlSafe: true });
}

/**
 * Backwards-compatible string-to-byte adapter used by cipher implementations.
 */
export function toByteArray(input: string, encoding: Encoding | 'utf8' | 'hex' | 'base64' | 'binary' = 'utf8'): Uint8Array {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string.');
  }
  switch (encoding) {
    case 'hex':
      return parseHex(input);
    case 'base64':
      return parseBase64(input);
    case 'binary':
      return parseBinary(input);
    case 'utf8':
    default:
      return new TextEncoder().encode(input);
  }
}

/**
 * Backwards-compatible byte-to-string adapter used by cipher implementations.
 */
export function fromByteArray(input: BinaryInput, encoding: Encoding | 'utf8' | 'hex' | 'base64' | 'binary' = 'utf8'): string {
  const bytes = asBytes(input);
  switch (encoding) {
    case 'hex':
      return toHex(bytes);
    case 'base64':
      return toBase64(bytes);
    case 'binary':
      return toBinary(bytes);
    case 'utf8':
    default:
      return new TextDecoder().decode(bytes);
  }
}

/**
 * Convert a hex string directly to base64.
 */
export function hexToBase64(value: string, options?: HexOptions): string {
  return toBase64(parseHex(value, options));
}

/**
 * Convert base64 directly to canonical lowercase hex.
 */
export function base64ToHex(value: string, options?: Base64Options): string {
  return toHex(parseBase64(value, options));
}

/**
 * Convert a binary string directly to hexadecimal.
 */
export function binaryToHex(value: string, options?: BinaryOptions): string {
  return toHex(parseBinary(value, options));
}

/**
 * Convert hexadecimal directly to binary.
 */
export function hexToBinary(value: string, options?: HexOptions): string {
  return toBinary(parseHex(value, options));
}

/**
 * Compare two byte sequences without exposing an early-return branch for
 * differing positions. This is useful for encoding tests and diagnostics.
 */
export function equalBytes(left: BinaryInput, right: BinaryInput): boolean {
  const a = asBytes(left);
  const b = asBytes(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

function decodeBase64Fallback(value: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  let buffer = 0;
  let bits = 0;

  for (const char of value) {
    if (char === '=') break;
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw new Error('Invalid base64 character.');
    buffer = (buffer << 6) | digit;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >>> bits) & 0xff);
    }
  }
  return output;
}

function encodeBase64Fallback(binary: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  for (let index = 0; index < binary.length; index += 3) {
    const a = binary.charCodeAt(index);
    const hasB = index + 1 < binary.length;
    const hasC = index + 2 < binary.length;
    const b = hasB ? binary.charCodeAt(index + 1) : 0;
    const c = hasC ? binary.charCodeAt(index + 2) : 0;
    const triple = (a << 16) | (b << 8) | c;

    output += alphabet[(triple >>> 18) & 63];
    output += alphabet[(triple >>> 12) & 63];
    output += hasB ? alphabet[(triple >>> 6) & 63] : '=';
    output += hasC ? alphabet[triple & 63] : '=';
  }

  return output;
}

export function validateRequiredInput(
  input: string,
  message = 'Input is required.'
): void {
  if (!input || input.trim() === '') {
    throw new CipherError('INPUT_REQUIRED', message);
  }
}

export function validateMaxLength(
  byteLength: number,
  max: number
): void {
  if (byteLength > max) {
    throw new CipherError(
      'INPUT_TOO_LONG',
      `Input exceeds maximum size of ${max} bytes.`
    );
  }
}
