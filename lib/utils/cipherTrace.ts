import type {
  CipherDirection,
  CipherMetadata,
  CipherResult,
  CipherStep,
  Encoding,
} from "../cipher/types";
import { CIPHER_REGISTRY } from "../cipher/registry";
import { resolveProvenance } from "../provenance/resolve";
import type { DataProvenanceMetadata } from "../provenance";

/**
 * Cipher trace files intentionally retain the existing schema version.
 *
 * Provenance is additive and optional so traces created before provenance
 * support remain importable. When an older trace is imported, provenance is
 * resolved through the shared provenance resolver.
 */
export const TRACE_SCHEMA_VERSION = 1 as const;

export interface CipherTraceFile {
  schemaVersion: typeof TRACE_SCHEMA_VERSION;
  cipherId: string;
  direction: CipherDirection;
  input: string;
  key: string;
  options: Record<string, string | number | boolean>;
  output: string;
  outputEncoding: Encoding;
  steps: CipherStep[];
  metadata: CipherMetadata;
  durationMs: number;
  timestamp: string;

  /**
   * Provenance of the captured result.
   *
   * This is duplicated at the trace root intentionally so provenance remains
   * explicit at the file boundary while metadata remains the authoritative
   * provenance location for CipherResult.
   */
  provenance?: DataProvenanceMetadata;
}

export type TraceValidationResult =
  | { success: true; trace: CipherTraceFile }
  | { success: false; error: string };

const SUPPORTED_ENCODINGS: Encoding[] = [
  "utf8",
  "hex",
  "base64",
  "binary",
];

const SAFE_OPTION_KEYS = new Set([
  "hexInput",
  "rounds",
  "demoMode",
  "bobSecret",
  "mode",
  "padding",
  "encoding",
  "iv",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isCipherStep(value: unknown): value is CipherStep {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.index !== "number" ||
    !Number.isInteger(value.index) ||
    value.index < 0 ||
    typeof value.label !== "string" ||
    typeof value.inputState !== "string" ||
    typeof value.outputState !== "string"
  ) {
    return false;
  }

  if (
    value.sublabel !== undefined &&
    typeof value.sublabel !== "string"
  ) {
    return false;
  }

  if (
    value.highlight !== undefined &&
    (!Array.isArray(value.highlight) ||
      !value.highlight.every(
        (index) =>
          typeof index === "number" &&
          Number.isInteger(index) &&
          index >= 0,
      ))
  ) {
    return false;
  }

  if (
    value.matrix !== undefined &&
    (!Array.isArray(value.matrix) ||
      !value.matrix.every((row) => isStringArray(row)))
  ) {
    return false;
  }

  if (
    value.table !== undefined &&
    (!Array.isArray(value.table) ||
      !value.table.every(
        (entry) =>
          isRecord(entry) &&
          typeof entry.key === "string" &&
          typeof entry.value === "string",
      ))
  ) {
    return false;
  }

  if (value.note !== undefined && typeof value.note !== "string") {
    return false;
  }

  return (
    value.isMilestone === undefined ||
    typeof value.isMilestone === "boolean"
  );
}

function isCipherMetadata(value: unknown): value is CipherMetadata {
  if (!isRecord(value)) {
    return false;
  }

  const statuses = [
    "secure",
    "legacy",
    "deprecated",
    "broken",
  ] as const;

  if (
    typeof value.name !== "string" ||
    !statuses.includes(
      value.securityStatus as (typeof statuses)[number],
    )
  ) {
    return false;
  }

  /*
   * Provenance is optional for backward compatibility with old traces.
   *
   * When it exists, the shared resolver is responsible for normalizing it.
   * This keeps provenance semantics centralized in lib/provenance rather
   * than duplicating the contract here.
   */
  if (
    value.provenance !== undefined &&
    !isRecord(value.provenance)
  ) {
    return false;
  }

  return true;
}

function sanitizeOptions(
  options: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(options)) {
    if (
      SAFE_OPTION_KEYS.has(key) &&
      (typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean")
    ) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Resolve provenance once at the trace boundary.
 *
 * The shared resolver is the single source of truth for defaults and
 * provenance semantics.
 */
function resolveTraceProvenance(
  provenance: DataProvenanceMetadata | undefined,
): DataProvenanceMetadata {
  return resolveProvenance(provenance);
}

export function createCipherTrace({
  cipherId,
  direction,
  input,
  key,
  options,
  result,
}: {
  cipherId: string;
  direction: CipherDirection;
  input: string;
  key: string;
  options: Record<string, unknown>;
  result: CipherResult;
}): CipherTraceFile {
  const provenance = resolveTraceProvenance(result.metadata.provenance);

  return {
    schemaVersion: TRACE_SCHEMA_VERSION,
    cipherId,
    direction,
    input,
    key,
    options: sanitizeOptions(options),
    output: result.output,
    outputEncoding: result.outputEncoding,
    steps: result.steps,
    metadata: {
      ...result.metadata,
      provenance,
    },
    durationMs: result.durationMs,
    timestamp: new Date().toISOString(),
    provenance,
  };
}

export function validateCipherTrace(
  value: unknown,
): TraceValidationResult {
  if (!isRecord(value)) {
    return {
      success: false,
      error: "Trace file must contain a JSON object.",
    };
  }

  if (value.schemaVersion !== TRACE_SCHEMA_VERSION) {
    return {
      success: false,
      error: `Unsupported trace schema version. Expected version ${TRACE_SCHEMA_VERSION}.`,
    };
  }

  if (
    typeof value.cipherId !== "string" ||
    !CIPHER_REGISTRY.some(
      (cipher) => cipher.id === value.cipherId,
    )
  ) {
    return {
      success: false,
      error: "The trace uses an unsupported cipher.",
    };
  }

  if (
    value.direction !== "encrypt" &&
    value.direction !== "decrypt"
  ) {
    return {
      success: false,
      error: "Trace direction is invalid.",
    };
  }

  if (
    typeof value.input !== "string" ||
    typeof value.key !== "string" ||
    typeof value.output !== "string" ||
    typeof value.timestamp !== "string"
  ) {
    return {
      success: false,
      error: "The trace is missing required text fields.",
    };
  }

  if (Number.isNaN(Date.parse(value.timestamp))) {
    return {
      success: false,
      error: "Trace timestamp is invalid.",
    };
  }

  if (
    typeof value.outputEncoding !== "string" ||
    !SUPPORTED_ENCODINGS.includes(
      value.outputEncoding as Encoding,
    )
  ) {
    return {
      success: false,
      error: "Trace output encoding is invalid.",
    };
  }

  if (
    !Array.isArray(value.steps) ||
    !value.steps.every(isCipherStep)
  ) {
    return {
      success: false,
      error: "Trace visualization steps are missing or malformed.",
    };
  }

  if (!isCipherMetadata(value.metadata)) {
    return {
      success: false,
      error: "Trace metadata is invalid.",
    };
  }

  if (
    value.provenance !== undefined &&
    !isRecord(value.provenance)
  ) {
    return {
      success: false,
      error: "Trace provenance metadata is invalid.",
    };
  }

  if (
    typeof value.durationMs !== "number" ||
    !Number.isFinite(value.durationMs) ||
    value.durationMs < 0
  ) {
    return {
      success: false,
      error: "Trace duration is invalid.",
    };
  }

  if (!isRecord(value.options)) {
    return {
      success: false,
      error: "Trace options must be an object.",
    };
  }

  const metadataProvenance = isRecord(value.metadata.provenance)
    ? (value.metadata.provenance as unknown as DataProvenanceMetadata)
    : undefined;

  const rootProvenance = isRecord(value.provenance)
    ? (value.provenance as unknown as DataProvenanceMetadata)
    : undefined;

  /*
   * Prefer explicit root provenance when present because it represents the
   * provenance of the trace artifact itself. Fall back to metadata for
   * traces produced by the previous implementation.
   */
  const provenance = resolveTraceProvenance(
    rootProvenance ?? metadataProvenance,
  );

  return {
    success: true,
    trace: {
      schemaVersion: TRACE_SCHEMA_VERSION,
      cipherId: value.cipherId,
      direction: value.direction,
      input: value.input,
      key: value.key,
      options: sanitizeOptions(value.options),
      output: value.output,
      outputEncoding: value.outputEncoding as Encoding,
      steps: value.steps,
      metadata: {
        ...value.metadata,
        provenance,
      },
      durationMs: value.durationMs,
      timestamp: value.timestamp,
      provenance,
    },
  };
}

export function parseCipherTraceJson(
  json: string,
): TraceValidationResult {
  try {
    return validateCipherTrace(JSON.parse(json));
  } catch {
    return {
      success: false,
      error: "The selected file is not valid JSON.",
    };
  }
}

export function traceToCipherResult(
  trace: CipherTraceFile,
): CipherResult {
  const provenance = resolveTraceProvenance(
    trace.provenance ?? trace.metadata.provenance,
  );

  return {
    output: trace.output,
    outputEncoding: trace.outputEncoding,
    steps: trace.steps,
    metadata: {
      ...trace.metadata,
      provenance,
    },
    durationMs: trace.durationMs,
  };
}

export function getTraceFilename(
  trace: CipherTraceFile,
): string {
  const timestamp = trace.timestamp.replace(/[:.]/g, "-");

  return `cryptoviz-${trace.cipherId}-${trace.direction}-${timestamp}.json`;
}