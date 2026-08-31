import { CipherError } from './errors'

export const DEFAULT_MAX_INPUT_BYTES = 4096

/**
 * Validates that an input is non-empty, a string, and within byte bounds.
 */
export function validateRequiredInput(input: string, maxLength = DEFAULT_MAX_INPUT_BYTES): void {
  if (input === null || input === undefined || input === '') {
    throw new CipherError('INPUT_REQUIRED', 'Input text is required.')
  }

  if (typeof input !== 'string') {
    throw new CipherError('INVALID_INPUT', 'Input must be a string.')
  }

  const byteLength = new TextEncoder().encode(input).length
  if (byteLength > maxLength) {
    throw new CipherError(
      'INPUT_TOO_LONG',
      `Input exceeds maximum size of ${maxLength} bytes (got ${byteLength}).`
    )
  }
}

/**
 * Validates and normalizes hexadecimal strings.
 */
export function parseAndValidateHex(
  hexString: string,
  expectedByteLength?: number,
  fieldName = 'Value'
): Uint8Array {
  if (typeof hexString !== 'string') {
    throw new CipherError('INVALID_INPUT', `${fieldName} must be a valid hex string.`)
  }

  const normalized = hexString.replace(/\s+/g, '')

  if (normalized.length % 2 !== 0) {
    throw new CipherError(
      'INVALID_INPUT',
      `${fieldName} must contain an even number of hexadecimal characters.`
    )
  }

  if (normalized.length > 0 && !/^[0-9a-fA-F]+$/.test(normalized)) {
    throw new CipherError(
      'INVALID_INPUT',
      `${fieldName} contains non-hexadecimal characters.`
    )
  }

  const bytes = new Uint8Array(normalized.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16)
  }

  if (expectedByteLength !== undefined && bytes.length !== expectedByteLength) {
    throw new CipherError(
      'INVALID_KEY',
      `${fieldName} must be exactly ${expectedByteLength} bytes (got ${bytes.length} bytes).`
    )
  }

  return bytes
}

/**
 * Validates key byte length against allowed candidate sizes.
 */
export function validateKeyLength(
  key: string | Uint8Array,
  allowedLengths: number[],
  cipherName: string
): void {
  const byteLength = typeof key === 'string'
    ? new TextEncoder().encode(key).length
    : key.length

  if (!allowedLengths.includes(byteLength)) {
    const expected = allowedLengths.length === 1
      ? `${allowedLengths[0]} byte${allowedLengths[0] === 1 ? '' : 's'}`
      : `${allowedLengths.slice(0, -1).join(', ')} or ${allowedLengths.at(-1)} bytes`

    throw new CipherError(
      'INVALID_KEY',
      `${cipherName} key must be ${expected} (got ${byteLength} bytes).`
    )
  }
}

/**
 * Normalizes text with casing and alphabetic filtering.
 */
export function normalizeAsciiText(
  text: string,
  options: { uppercase?: boolean; stripNonAlpha?: boolean } = {}
): string {
  const { uppercase = false, stripNonAlpha = false } = options
  let normalized = text

  if (stripNonAlpha) {
    normalized = normalized.replace(/[^A-Za-z]/g, '')
  }

  return uppercase ? normalized.toUpperCase() : normalized
}

/**
 * Computes greatest common divisor.
 */
export function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const temp = y
    y = x % y
    x = temp
  }
  return x
}

/**
 * Validates that `a` and `m` are coprime (gcd = 1).
 */
export function validateCoprime(a: number, m: number, fieldName = 'Multiplier'): void {
  if (gcd(a, m) !== 1) {
    throw new CipherError(
      'INVALID_KEY',
      `${fieldName} (${a}) must be coprime with modulus (${m}). gcd(${a}, ${m}) = ${gcd(a, m)}.`
    )
  }
}

/**
 * Validates numeric parameter within inclusive bounds.
 */
export function validateNumericRange(val: number, min: number, max: number, fieldName = 'Parameter'): void {
  if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
    throw new CipherError('INVALID_OPTION', `${fieldName} must be a valid finite number.`)
  }
  if (val < min || val > max) {
    throw new CipherError('INVALID_OPTION', `${fieldName} must be between ${min} and ${max} (got ${val}).`)
  }
}

/**
 * Validates that all characters in `text` belong to the allowed `alphabet`.
 */
export function validateAlphabetSubset(text: string, alphabet: string, fieldName = 'Input'): void {
  const allowedSet = new Set(alphabet)
  for (const char of text) {
    if (!allowedSet.has(char)) {
      throw new CipherError(
        'INVALID_INPUT',
        `${fieldName} contains invalid character '${char}'. Allowed alphabet: "${alphabet}"`
      )
    }
  }
}

/**
 * Validates that a 2x2 matrix is invertible modulo m.
 */
export function validateMatrix2x2Invertible(matrix: number[][], modulus = 26, fieldName = 'Hill Matrix'): void {
  if (!Array.isArray(matrix) || matrix.length !== 2 || !matrix.every(r => Array.isArray(r) && r.length === 2)) {
    throw new CipherError('INVALID_KEY', `${fieldName} must be a 2x2 numeric matrix.`)
  }

  const det = (matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]) % modulus
  const positiveDet = (det + modulus) % modulus

  if (positiveDet === 0 || gcd(positiveDet, modulus) !== 1) {
    throw new CipherError(
      'INVALID_KEY',
      `${fieldName} is not invertible modulo ${modulus} (determinant = ${positiveDet}, gcd = ${gcd(positiveDet, modulus)}).`
    )
  }
}

/**
 * Validates block length alignment for block ciphers.
 */
export function validateBlockAlignment(byteLength: number, blockSizeBytes: number, cipherName: string): void {
  if (byteLength % blockSizeBytes !== 0) {
    throw new CipherError(
      'INVALID_INPUT',
      `${cipherName} requires input length to be a multiple of ${blockSizeBytes} bytes (got ${byteLength} bytes).`
    )
  }
}

export interface ValidationPipelineResult {
  valid: boolean
  sanitizedInput: string
  sanitizedKey: string
  options: Record<string, unknown>
}

/**
 * Centralized End-to-End Cryptographic Input Validation Pipeline.
 */
export function validateCipherPayload(
  cipherId: string,
  input: string,
  key: string,
  options: Record<string, unknown> = {}
): ValidationPipelineResult {
  validateRequiredInput(input)

  switch (cipherId) {
    case 'caesar':
    case 'rot13': {
      const shift = Number(key || '3')
      if (Number.isNaN(shift)) {
        throw new CipherError('INVALID_KEY', 'Caesar cipher key shift must be a valid number.')
      }
      return { valid: true, sanitizedInput: input, sanitizedKey: String(shift % 26), options }
    }

    case 'affine': {
      const a = Number(options.a ?? 5)
      const b = Number(options.b ?? 8)
      validateCoprime(a, 26, 'Affine multiplier (a)')
      validateNumericRange(b, 0, 25, 'Affine shift (b)')
      return { valid: true, sanitizedInput: input, sanitizedKey: `${a},${b}`, options }
    }

    case 'bacon': {
      const isExtended = key.toLowerCase().includes('extended') || key.toLowerCase().includes('26')
      const cleanedInput = input.toUpperCase().replace(/[^A-Z]/g, '')
      if (cleanedInput.length === 0) {
        throw new CipherError('INVALID_INPUT', 'Bacon\'s cipher requires at least one letter.')
      }
      return { valid: true, sanitizedInput: cleanedInput, sanitizedKey: isExtended ? 'extended' : 'standard', options }
    }

    case 'aes':
    case 'aes-128':
    case 'aes-192':
    case 'aes-256': {
      if (options.hexInput && typeof input === 'string') {
        parseAndValidateHex(input, undefined, 'Plaintext hex input')
      }
      return { valid: true, sanitizedInput: input, sanitizedKey: key, options }
    }

    default:
      return { valid: true, sanitizedInput: input, sanitizedKey: key, options }
  }
}
