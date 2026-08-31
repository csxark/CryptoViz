import { CipherError } from '../../utils/errors'

/**
 * Input Encoding cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://www.rfc-editor.org/rfc/rfc9998 — RFC 9998.
 */
export type InputEncoding = 'integer' | 'text' | 'hex'

/**
 * Parses user input for asymmetric ciphers into BigInt array blocks.
 *
 * @param input Raw input string
 * @param encoding Explicit input encoding mode ('integer' | 'text' | 'hex') or undefined
 * @param modulus Optional modulus n (or p) to validate integer range
 */
export function parseAsymmetricInput(
  input: string,
  encoding?: InputEncoding | string,
  modulus?: bigint
): bigint[] {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new CipherError('INPUT_REQUIRED', 'Input is required.')
  }

  // 1. Explicit integer mode
  if (encoding === 'integer') {
    if (!/^-?\d+$/.test(trimmed)) {
      throw new CipherError('INVALID_INPUT', `Integer mode requires numeric input digits (got "${input}").`)
    }
    const val = BigInt(trimmed)
    if (val < 0n) {
      throw new CipherError('INVALID_INPUT', 'Integer input must be non-negative.')
    }
    if (modulus !== undefined && val >= modulus) {
      throw new CipherError('INPUT_TOO_LONG', `Plaintext must satisfy 0 <= m < n (input ${val} is >= modulus ${modulus}).`)
    }
    return [val]
  }

  // 2. Explicit hex mode
  if (encoding === 'hex') {
    const cleanHex = trimmed.replace(/\s+/g, '')
    if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
      throw new CipherError('INVALID_INPUT', `Hex mode requires hexadecimal string characters (got "${input}").`)
    }
    const bytes: bigint[] = []
    const hexToParse = cleanHex.length % 2 !== 0 ? '0' + cleanHex : cleanHex
    for (let i = 0; i < hexToParse.length; i += 2) {
      const b = BigInt(parseInt(hexToParse.slice(i, i + 2), 16))
      if (modulus !== undefined && b >= modulus) {
        throw new CipherError('INPUT_TOO_LONG', `Byte value (${b}) is >= modulus n (${modulus}).`)
      }
      bytes.push(b)
    }
    return bytes
  }

  // 3. Explicit text mode
  if (encoding === 'text') {
    const bytes = Array.from(new TextEncoder().encode(input)).map((b) => BigInt(b))
    for (const b of bytes) {
      if (modulus !== undefined && b >= modulus) {
        throw new CipherError(
          'INPUT_TOO_LONG',
          `ASCII byte character value (${b}) is >= modulus n (${modulus}). Increase prime sizes or switch to Integer mode.`
        )
      }
    }
    return bytes
  }

  // 4. Fallback (when no explicit encoding is specified, e.g. legacy/automated callers):
  // Check if purely numeric
  if (/^\d+$/.test(trimmed)) {
    const val = BigInt(trimmed)
    if (modulus !== undefined && val >= modulus) {
      throw new CipherError('INPUT_TOO_LONG', `Plaintext must satisfy 0 <= m < n (input ${val} is >= modulus ${modulus}).`)
    }
    return [val]
  }

  // Fallback to text encoding
  const bytes = Array.from(new TextEncoder().encode(input)).map((b) => BigInt(b))
  for (const b of bytes) {
    if (modulus !== undefined && b >= modulus) {
      throw new CipherError(
        'INPUT_TOO_LONG',
        `Input value is >= modulus n (${modulus}).`
      )
    }
  }
  return bytes
}
