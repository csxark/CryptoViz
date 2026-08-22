export type CipherErrorCode =
  | "INPUT_REQUIRED"
  | "INPUT_TOO_LONG"
  | "INVALID_INPUT"
  | "INVALID_KEY"
  | "INVALID_KEY_LENGTH"
  | "INVALID_KEY_SIZE"
  | "KEY_REQUIRED"
  | "INVALID_PADDING"
  | "INVALID_IV"
  | "WEAK_KEY"
  | "KEY_PARITY_ERROR"
  | "ALGORITHM_UNSUPPORTED"
  | "WEBCRYPTO_UNAVAILABLE"
  | "AUTH_TAG_MISMATCH"
  | "INVALID_AAD"
  | "WORKER_TIMEOUT"
  | "WORKLOAD_INPUT_LIMIT"
  | "WORKLOAD_KEY_LIMIT"
  | "WORKLOAD_TRACE_LIMIT"
  | "WORKLOAD_ITERATION_LIMIT"
  | "WORKLOAD_CONCURRENCY_LIMIT"
  | "WORKLOAD_DURATION_LIMIT"
  | "WORKLOAD_BENCHMARK_LIMIT"
  | "KDF_ERROR"
  | "UNSUPPORTED_KDF"
  | "ONE_WAY_HASH";

export class CipherError extends Error {
  public readonly code: CipherErrorCode;

  constructor(code: CipherErrorCode, message: string) {
    super(message);
    this.name = "CipherError";
    this.code = code;
  }
}

/**
 * Legacy cipher-level input validation.
 *
 * Workload limits are enforced separately by lib/security/workloadLimits.ts
 * before dispatch and again inside the worker.
 */
const MAX_INPUT_BYTES = 2 * 1024 * 1024;

export function validateInput(input: unknown): asserts input is string {
  if (input === null || input === undefined || input === "") {
    throw new CipherError("INPUT_REQUIRED", "Input text is required.");
  }

  if (typeof input !== "string") {
    throw new CipherError("INPUT_REQUIRED", "Input must be a string.");
  }

  const byteLength = new TextEncoder().encode(input).length;

  if (byteLength > MAX_INPUT_BYTES) {
    throw new CipherError(
      "INPUT_TOO_LONG",
      `Input exceeds maximum size of ${MAX_INPUT_BYTES} bytes (got ${byteLength}).`,
    );
  }
}

export function validateKey(key: unknown): asserts key is string {
  if (key === null || key === undefined || key === "") {
    throw new CipherError("INVALID_KEY", "Encryption key is required.");
  }

  if (typeof key !== "string") {
    throw new CipherError("INVALID_KEY", "Key must be a string.");
  }
}

export function validateHexString(value: string, field = "Input"): void {
  if (/[^0-9a-fA-F]/.test(value)) {
    throw new CipherError(
      "INVALID_INPUT",
      `${field} contains non-hexadecimal characters.`,
    );
  }

  if (value.length % 2 !== 0) {
    throw new CipherError(
      "INVALID_INPUT",
      `${field} must contain an even number of hexadecimal characters.`,
    );
  }
}

export function validateMaxInputBytes(input: string, maxBytes: number): void {
  const size = new TextEncoder().encode(input).length;

  if (size > maxBytes) {
    throw new CipherError(
      "INPUT_TOO_LONG",
      `Input exceeds maximum size of ${maxBytes} bytes.`,
    );
  }
}
