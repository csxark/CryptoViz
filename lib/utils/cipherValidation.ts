import { CipherError } from './errors'

export const DEFAULT_MAX_INPUT_BYTES = 4096

export function validateRequiredInput(input: string, maxLength = DEFAULT_MAX_INPUT_BYTES): void {
  if (input === null || input === undefined || input === '') {
    throw new CipherError('INPUT_REQUIRED', 'Input text is required.')
  }

  if (typeof input !== 'string') {
    throw new CipherError('INPUT_REQUIRED', 'Input must be a string.')
  }

  const byteLength = new TextEncoder().encode(input).length
  if (byteLength > maxLength) {
    throw new CipherError(
      'INPUT_TOO_LONG',
      `Input exceeds maximum size of ${maxLength} bytes (got ${byteLength}).`
    )
  }
}

export function parseAndValidateHex(
  hexString: string,
  expectedByteLength?: number,
  fieldName = 'Value'
): Uint8Array {
  const normalized = hexString.replace(/\s+/g, '')

  if (normalized.length % 2 !== 0) {
    throw new CipherError(
      'INVALID_INPUT',
      `${fieldName} must contain an even number of hexadecimal characters.`
    )
  }

  if (!/^[0-9a-fA-F]*$/.test(normalized)) {
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
