import { sha256 } from "@noble/hashes/sha2.js";
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

/**
 * Controls whether sensitive values (the cipher key and secret options) are
 * embedded in an exported trace.
 *
 * "redacted" (the default) replaces sensitive values with REDACTED_VALUE so
 * traces are safe to share. "full" retains the real values and must be
 * chosen explicitly by the user for educational/debugging exports.
 */
export type TraceExportMode = "redacted" | "full";

export const REDACTED_VALUE = "[redacted]" as const;

export interface CipherTraceFile {
  schemaVersion: typeof TRACE_SCHEMA_VERSION;

  /**
   * Deterministic identifier derived from the cipher, direction, input, key,
   * options, and resulting steps/output — excluding volatile fields like
   * timestamp and durationMs. Identical inputs always produce the same
   * traceId, regardless of when or how many times the trace is generated.
   */
  traceId: string;
  cipherId: string;  direction: CipherDirection;
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

  /**
   * Whether the key and secret options below contain real values ("full")
   * or REDACTED_VALUE placeholders ("redacted"). Absent on traces created
   * before this field existed, which always embedded real values.
   */
  exportMode?: TraceExportMode;

  /**
   * SHA-256 hash (hex) of the trace's canonical content, excluding this
   * field. Verified before a trace is replayed so tampered or corrupted
   * trace files are rejected. Absent on traces created before this field
   * existed.
   */
  integrityHash?: string;
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
  "mode",
  "padding",
  "encoding",
  "iv",
]);

/**
 * Option keys that hold secret material. These are only included in an
 * exported trace when exportMode is "full" (explicitly chosen by the user).
 */
const SENSITIVE_OPTION_KEYS = new Set(["bobSecret"]);
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
  exportMode: TraceExportMode = "redacted",
): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {};
  const allowedKeys =
    exportMode === "full"
      ? new Set([...SAFE_OPTION_KEYS, ...SENSITIVE_OPTION_KEYS])
      : SAFE_OPTION_KEYS;

  for (const [key, value] of Object.entries(options)) {
    if (
      allowedKeys.has(key) &&
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
 * Computes a stable SHA-256 hash (hex) over a trace's content so tampering
 * or corruption can be detected before replay. Key order does not affect
 * the result.
 */
function canonicalStringify(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalStringify).join(",") + "]";
  }
  if (isRecord(value)) {
    // Omit undefined-valued keys, matching JSON.stringify's own behavior,
    // so a key that's explicitly undefined hashes the same as an absent key.
    const keys = Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort();
    return (
      "{" +
      keys
        .map((k) => JSON.stringify(k) + ":" + canonicalStringify(value[k]))
        .join(",") +
      "}"
    );
  }
  return String(value);
}

function computeTraceIntegrityHash(
  trace: Omit<CipherTraceFile, "integrityHash">,
): string {
  const hashBytes = sha256(
    new TextEncoder().encode(canonicalStringify(trace)),
  );
  return Array.from(hashBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Computes a deterministic trace identifier from the values that define an
 * execution (algorithm, config, input, key, and the resulting steps/output).
 * Volatile fields such as timestamp and durationMs are intentionally
 * excluded so identical inputs always produce the same traceId.
 */
function computeDeterministicTraceId(input: {
  cipherId: string;
  direction: CipherDirection;
  rawInput: string;
  rawKey: string;
  rawOptions: Record<string, unknown>;
  steps: CipherStep[];
  output: string;
  outputEncoding: Encoding;
}): string {
  const canonicalOptions = sanitizeOptions(input.rawOptions, "full");
  const hashBytes = sha256(
    new TextEncoder().encode(
      canonicalStringify({
        cipherId: input.cipherId,
        direction: input.direction,
        input: input.rawInput,
        key: input.rawKey,
        options: canonicalOptions,
        steps: input.steps,
        output: input.output,
        outputEncoding: input.outputEncoding,
      }),
    ),
  );
  const hex = Array.from(hashBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${input.cipherId}-${hex.slice(0, 16)}`;
}

/**
 * Verifies a trace's integrityHash, if present. Traces created before this * field existed have no hash to check and are treated as valid for backward
 * compatibility.
 */
export function verifyCipherTraceIntegrity(trace: CipherTraceFile): boolean {
  if (!trace.integrityHash) return true;
  const { integrityHash, ...rest } = trace;
  return computeTraceIntegrityHash(rest) === integrityHash;
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
  exportMode = "redacted",
}: {
  cipherId: string;
  direction: CipherDirection;
  input: string;
  key: string;
  options: Record<string, unknown>;
  result: CipherResult;
  exportMode?: TraceExportMode;
}): CipherTraceFile {
  const provenance = resolveTraceProvenance(result.metadata.provenance);

  const traceId = computeDeterministicTraceId({
    cipherId,
    direction,
    rawInput: input,
    rawKey: key,
    rawOptions: options,
    steps: result.steps,
    output: result.output,
    outputEncoding: result.outputEncoding,
  });

  const traceWithoutHash: Omit<CipherTraceFile, "integrityHash"> = {
    schemaVersion: TRACE_SCHEMA_VERSION,
    traceId,
    cipherId,    direction,
    input,
    key: exportMode === "full" ? key : REDACTED_VALUE,
    options: sanitizeOptions(options, exportMode),
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
    exportMode,
  };

  return {
    ...traceWithoutHash,
    integrityHash: computeTraceIntegrityHash(traceWithoutHash),
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

  if (
    value.traceId !== undefined &&
    typeof value.traceId !== "string"
  ) {
    return {
      success: false,
      error: "Trace identifier is invalid.",
    };
  }

  if (Number.isNaN(Date.parse(value.timestamp))) {    return {
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
    value.exportMode !== undefined &&
    value.exportMode !== "redacted" &&
    value.exportMode !== "full"
  ) {
    return {
      success: false,
      error: "Trace export mode is invalid.",
    };
  }

  if (
    value.integrityHash !== undefined &&
    typeof value.integrityHash !== "string"
  ) {
    return {
      success: false,
      error: "Trace integrity hash is invalid.",
    };
  }

  if (
    typeof value.durationMs !== "number" ||    !Number.isFinite(value.durationMs) ||
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

  /*
   * Traces created before exportMode existed always embedded real values,
   * so default to "full" for them rather than assuming redaction.
   */
  const exportMode: TraceExportMode =
    value.exportMode === "redacted" || value.exportMode === "full"
      ? value.exportMode
      : "full";

  const traceId =
    typeof value.traceId === "string"
      ? value.traceId
      : computeDeterministicTraceId({
          cipherId: value.cipherId,
          direction: value.direction,
          rawInput: value.input,
          rawKey: value.key,
          rawOptions: value.options,
          steps: value.steps,
          output: value.output,
          outputEncoding: value.outputEncoding as Encoding,
        });

  const trace: CipherTraceFile = {
    schemaVersion: TRACE_SCHEMA_VERSION,
    traceId,
    cipherId: value.cipherId,
    direction: value.direction,
    input: value.input,
    key: value.key,    options: sanitizeOptions(value.options, exportMode),
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
    exportMode,
    integrityHash:
      typeof value.integrityHash === "string"
        ? value.integrityHash
        : undefined,
  };

  if (!verifyCipherTraceIntegrity(trace)) {
    return {
      success: false,
      error:
        "Trace integrity check failed — the trace may have been tampered with or corrupted.",
    };
  }

  return { success: true, trace };
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