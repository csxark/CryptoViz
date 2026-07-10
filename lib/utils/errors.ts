/**
 * Typed error system for cipher operations.
 * All cipher functions must throw CipherError — never raw strings.
 * @see CIPHER_ENGINE.md "Shared types" section
 */

export type CipherErrorCode =
  | 'INPUT_REQUIRED'
  | 'INPUT_TOO_LONG'
  | 'INVALID_INPUT'
  | 'INVALID_KEY'
  | 'INVALID_KEY_LENGTH'
  | 'INVALID_INPUT'
  | 'INVALID_PADDING'
  | 'INVALID_IV'
  | 'WEAK_KEY'
  | 'KEY_PARITY_ERROR'
  | 'ALGORITHM_UNSUPPORTED'
  | 'WEBCRYPTO_UNAVAILABLE'
  | 'WORKER_TIMEOUT'

export class CipherError extends Error {
  public readonly code: CipherErrorCode

  constructor(code: CipherErrorCode, message: string) {
    super(message)
    this.name = 'CipherError'
    this.code = code
  }
}

/** Max input size: 2MB (allowing large benchmark tests) */
const MAX_INPUT_BYTES = 2 * 1024 * 1024

/**
 * Validate input is present and within size limits.
 * Call at the top of every encrypt/decrypt function.
 */
export function validateInput(input: unknown): asserts input is string {
  if (input === null || input === undefined || input === '') {
    throw new CipherError('INPUT_REQUIRED', 'Input text is required.')
  }
  if (typeof input !== 'string') {
    throw new CipherError('INPUT_REQUIRED', 'Input must be a string.')
  }
  const byteLength = new TextEncoder().encode(input).length
  if (byteLength > MAX_INPUT_BYTES) {
    throw new CipherError(
      'INPUT_TOO_LONG',
      `Input exceeds maximum size of ${MAX_INPUT_BYTES} bytes (got ${byteLength}).`
    )
  }
}

/**
 * Validate that a key is present and non-empty.
 * Individual ciphers add their own format validation on top.
 */
export function validateKey(key: unknown): asserts key is string {
  if (key === null || key === undefined || key === '') {
    throw new CipherError('INVALID_KEY', 'Encryption key is required.')
  }
  if (typeof key !== 'string') {
    throw new CipherError('INVALID_KEY', 'Key must be a string.')
  }
}
