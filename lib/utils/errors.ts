/**
 * Typed error system for cipher operations.
 * All cipher functions must throw CipherError — never raw strings.
 * @see CIPHER_ENGINE.md "Shared types" section
 */

// Re-export diagnostic functions for centralized error handling
export {
  diagnoseError,
  hasDiagnosticSupport,
  getAllDiagnosticCodes,
  type Diagnostic,
  type DiagnosticCode,
  type RemediationOption,
} from './cryptoDiagnostics'

export type CipherErrorCode =
  | 'INPUT_REQUIRED'
  | 'INPUT_TOO_LONG'
  | 'INVALID_INPUT'
  | 'INVALID_KEY'
  | 'INVALID_KEY_LENGTH'
  | 'INVALID_KEY_SIZE'
  | 'KEY_REQUIRED'
  | 'INVALID_PADDING'
  | 'INVALID_IV'
  | 'WEAK_KEY'
  | 'KEY_PARITY_ERROR'
  | 'ALGORITHM_UNSUPPORTED'
  | 'WEBCRYPTO_UNAVAILABLE'
  | 'AUTH_TAG_MISMATCH'
  | 'INVALID_AAD'
  | 'WORKER_TIMEOUT'
  | 'WORKER_EXECUTION_FAILED'
  | 'INVALID_WORKER_MESSAGE'
  | 'INVALID_CANCEL_MESSAGE'
  | 'DUPLICATE_JOB_ID'
  | 'JOB_ALREADY_COMPLETED'
  | 'JOB_ALREADY_CANCELLED'
  | 'JOB_ALREADY_TERMINAL'
  | 'JOB_NOT_FOUND'
  | 'ABORTED'
  | 'KDF_ERROR'
  | 'UNSUPPORTED_KDF'
  | 'ONE_WAY_HASH'

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
/**
 * Validate that a string is a valid hexadecimal value.
 */
export function validateHexString(
  value: string,
  field = "Input"
): void {
  if (/[^0-9a-fA-F]/.test(value)) {
    throw new CipherError(
      "INVALID_INPUT",
      `${field} contains non-hexadecimal characters.`
    )
  }

  if (value.length % 2 !== 0) {
    throw new CipherError(
      "INVALID_INPUT",
      `${field} must contain an even number of hexadecimal characters.`
    )
  }
}

/**
 * Validate maximum byte length.
 */
export function validateMaxInputBytes(
  input: string,
  maxBytes: number
): void {
  const size = new TextEncoder().encode(input).length

  if (size > maxBytes) {
    throw new CipherError(
      "INPUT_TOO_LONG",
      `Input exceeds maximum size of ${maxBytes} bytes.`
    )
  }
}