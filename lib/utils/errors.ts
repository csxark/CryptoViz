export type ErrorCategory =
  | "INPUT"
  | "KEY"
  | "OPTION"
  | "ALGORITHM"
  | "ENCODING"
  | "RESOURCE"
  | "EXECUTION"
  | "INTERNAL";

export type CipherErrorCode =
  | "INPUT_REQUIRED"
  | "INPUT_TOO_LONG"
  | "INVALID_INPUT"
  | "INVALID_CIPHERTEXT"
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
  | "INVALID_OPTION"
  | "PARAMETER_VALIDATION_FAILED"  | "WORKER_TIMEOUT"
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

export type CryptoVizErrorCode =
  | CipherErrorCode
  | "KEY_INVALID"
  | "INPUT_INVALID"
  | "OPTION_INVALID"
  | "ENCODING_INVALID"
  | "RESOURCE_LIMIT"
  | "EXECUTION_FAILED"
  | "INTERNAL_ERROR";

export function categorizeErrorCode(code: string): ErrorCategory {
  if (code.startsWith("INPUT") || code.endsWith("_INPUT")) return "INPUT";
  if (code.startsWith("KEY") || code.endsWith("_KEY")) return "KEY";
  if (
    code.startsWith("OPTION") ||
    code.endsWith("_OPTION") ||
    code === "PARAMETER_VALIDATION_FAILED" ||
    code.includes("PADDING") ||
    code.includes("IV") ||
    code.includes("AAD")
  ) {    return "OPTION";
  }
  if (
    code.startsWith("ALGORITHM") ||
    code.includes("KDF") ||
    code.includes("HASH")
  ) {
    return "ALGORITHM";
  }
  if (code.startsWith("ENCODING")) return "ENCODING";
  if (
    code.startsWith("WORKER") ||
    code.startsWith("WORKLOAD") ||
    code.startsWith("RESOURCE") ||
    code.includes("WEBCRYPTO")
  ) {
    return "RESOURCE";
  }
  if (code.startsWith("EXECUTION") || code.includes("AUTH_TAG")) return "EXECUTION";
  if (code.startsWith("INTERNAL")) return "INTERNAL";
  return "INTERNAL";
}

export interface CryptoVizErrorOptions {
  details?: unknown;
  remediation?: string;
  cause?: unknown;
  category?: ErrorCategory;
  timestamp?: number;
}

export class CryptoVizError extends Error {
  public readonly code: CryptoVizErrorCode;
  public readonly category: ErrorCategory;
  public readonly details?: unknown;
  public readonly remediation?: string;
  public readonly timestamp: number;
  public override readonly cause?: unknown;

  constructor(
    code: CryptoVizErrorCode,
    message: string,
    options: CryptoVizErrorOptions = {}
  ) {
    super(message);
    this.name = "CryptoVizError";
    this.code = code;
    this.category = options.category ?? categorizeErrorCode(code);
    this.details = options.details;
    this.remediation = options.remediation;
    this.timestamp = options.timestamp ?? Date.now();
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
      details: this.details,
      remediation: this.remediation,
      timestamp: this.timestamp,
      cause:
        this.cause instanceof Error
          ? { name: this.cause.name, message: this.cause.message }
          : this.cause,
    };
  }

  public static fromJSON(json: Record<string, unknown>): CryptoVizError {
    const code = (json.code as CryptoVizErrorCode) || "INTERNAL_ERROR";
    const message =
      typeof json.message === "string" ? json.message : "Unknown error";
    const err = new CryptoVizError(code, message, {
      details: json.details,
      remediation:
        typeof json.remediation === "string" ? json.remediation : undefined,
      category: (json.category as ErrorCategory) || undefined,
      timestamp: typeof json.timestamp === "number" ? json.timestamp : undefined,
      cause: json.cause,
    });
    if (typeof json.name === "string") {
      err.name = json.name;
    }
    return err;
  }
}

export class CipherError extends CryptoVizError {
  constructor(
    code: CipherErrorCode,
    message: string,
    options?: CryptoVizErrorOptions
  ) {
    super(code, message, options);
    this.name = "CipherError";
  }
}

export function isCryptoVizError(err: unknown): err is CryptoVizError {
  if (err instanceof CryptoVizError) {
    return true;
  }
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    return (
      (obj.name === "CryptoVizError" || obj.name === "CipherError") &&
      typeof obj.code === "string"
    );
  }
  return false;
}

export function toCryptoVizError(
  err: unknown,
  fallbackCode: CryptoVizErrorCode = "INTERNAL_ERROR"
): CryptoVizError {
  if (err instanceof CryptoVizError) {
    return err;
  }

  if (isCryptoVizError(err)) {
    return CryptoVizError.fromJSON(err as unknown as Record<string, unknown>);
  }

  if (err instanceof Error) {
    return new CryptoVizError(fallbackCode, err.message, { cause: err });
  }

  if (typeof err === "string") {
    return new CryptoVizError(fallbackCode, err);
  }

  return new CryptoVizError(fallbackCode, "An unexpected error occurred", {
    details: err,
  });
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

export function validateHashInput(input: unknown): asserts input is string {
  if (input === null || input === undefined) {
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

