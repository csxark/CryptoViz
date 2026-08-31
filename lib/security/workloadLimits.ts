/**
 * Cryptographic workload resource limits.
 */

import type { CipherOptions } from "../cipher/types";

export type WorkloadOperation =
  | "cipher"
  | "kdf"
  | "attack"
  | "benchmark";

export interface WorkloadLimits {
  maxInputBytes: number;
  maxKeyBytes: number;
  maxTraceSteps: number;
  maxIterations: number;
  maxConcurrentJobs: number;
  maxDurationMs: number;
  maxBenchmarkDurationMs: number;
}

export const DEFAULT_WORKLOAD_LIMITS: Readonly<WorkloadLimits> = {
  maxInputBytes: 256 * 1024,
  maxKeyBytes: 64 * 1024,
  maxTraceSteps: 2_000,
  maxIterations: 100_000,
  maxConcurrentJobs: 1,
  maxDurationMs: 10_000,
  maxBenchmarkDurationMs: 5_000,
};

export const WORKLOAD_LIMIT_OVERRIDES: Readonly<
  Partial<Record<string, Partial<WorkloadLimits>>>
> = {
  bcrypt: {
    maxIterations: 12,
    maxDurationMs: 10_000,
  },
  pbkdf2: {
    maxIterations: 500_000,
    maxDurationMs: 10_000,
  },
  scrypt: {
    maxIterations: 32_768,
    maxDurationMs: 10_000,
  },
  argon2: {
    maxIterations: 10,
    maxDurationMs: 10_000,
  },
  argon2id: {
    maxIterations: 10,
    maxDurationMs: 10_000,
  },
  rsa: {
    maxInputBytes: 32 * 1024,
    maxKeyBytes: 16 * 1024,
    maxTraceSteps: 1_000,
    maxDurationMs: 10_000,
  },
  dh: {
    maxInputBytes: 32 * 1024,
    maxKeyBytes: 16 * 1024,
    maxTraceSteps: 1_000,
    maxDurationMs: 10_000,
  },
};

export interface MemoryWorkloadBounds {
  maxMemoryMB: number;
  maxIterations: number;
  maxR: number;
  maxP: number;
}

export const MEMORY_WORKLOAD_LIMITS: Readonly<Record<string, MemoryWorkloadBounds>> = {
  argon2id: {
    maxMemoryMB: 64,
    maxIterations: 10,
    maxR: 1,
    maxP: 4,
  },
  scrypt: {
    maxMemoryMB: 64,
    maxIterations: 10,
    maxR: 32,
    maxP: 8,
  },
};

/**
 * Clamps Argon2id parameters to safe client main-thread / worker execution bounds.
 * Safe limits: m <= 64 MB (65,536 KiB or 64 blocks), t <= 10 iterations.
 */
export function clampArgon2idParameters<
  T extends { memoryBlocks?: number; memoryCost?: number; iterations?: number; timeCost?: number }
>(params: T): { clamped: T; modified: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let modified = false;
  const copy = { ...params };

  const memoryLimitBlocks = 64; // 64 MB equivalent in demo blocks
  const memoryLimitKiB = 64 * 1024; // 64 MB = 65,536 KiB
  const timeLimit = 10;

  if (typeof copy.memoryBlocks === "number" && copy.memoryBlocks > memoryLimitBlocks) {
    warnings.push(`Memory blocks clamped from ${copy.memoryBlocks} to maximum safe limit of ${memoryLimitBlocks} blocks (64 MB).`);
    copy.memoryBlocks = memoryLimitBlocks;
    modified = true;
  }

  if (typeof copy.memoryCost === "number" && copy.memoryCost > memoryLimitKiB) {
    warnings.push(`Memory cost clamped from ${copy.memoryCost} KiB to maximum safe limit of ${memoryLimitKiB} KiB (64 MB).`);
    copy.memoryCost = memoryLimitKiB;
    modified = true;
  }

  if (typeof copy.iterations === "number" && copy.iterations > timeLimit) {
    warnings.push(`Iterations clamped from ${copy.iterations} to maximum safe limit of ${timeLimit}.`);
    copy.iterations = timeLimit;
    modified = true;
  }

  if (typeof copy.timeCost === "number" && copy.timeCost > timeLimit) {
    warnings.push(`Time cost clamped from ${copy.timeCost} to maximum safe limit of ${timeLimit}.`);
    copy.timeCost = timeLimit;
    modified = true;
  }

  return { clamped: copy, modified, warnings };
}

/**
 * Clamps Scrypt parameters to safe client-side limits before Web Worker execution.
 * Safe limits: Memory footprint <= 64 MB, N <= 65536, p <= 8.
 */
export function clampScryptParameters<
  T extends { N?: number; r?: number; p?: number }
>(params: T): { clamped: T; modified: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let modified = false;
  const copy = { ...params };

  const maxN = 65536;
  const maxP = 8;
  const maxMB = 64;

  if (typeof copy.N === "number" && copy.N > maxN) {
    warnings.push(`Scrypt cost N clamped from ${copy.N} to maximum allowed limit of ${maxN}.`);
    copy.N = maxN;
    modified = true;
  }

  if (typeof copy.p === "number" && copy.p > maxP) {
    warnings.push(`Scrypt parallelization p clamped from ${copy.p} to maximum limit of ${maxP}.`);
    copy.p = maxP;
    modified = true;
  }

  if (typeof copy.N === "number" && typeof copy.r === "number" && typeof copy.p === "number") {
    const memMB = (128 * copy.r * copy.N * copy.p) / (1024 * 1024);
    if (memMB > maxMB) {
      warnings.push(`Scrypt total memory footprint (${memMB.toFixed(1)} MB) exceeds client limit of ${maxMB} MB. Cost N adjusted to safe limit.`);
      copy.N = Math.min(copy.N, 32768);
      modified = true;
    }
  }

  return { clamped: copy, modified, warnings };
}

/**
 * Validates high-memory KDF parameters before Web Worker dispatch or local execution.
 * Checks Argon2id and Scrypt parameters against safety thresholds.
 */
export function validateHighMemoryWorkload(
  cipherId: string,
  options?: CipherOptions,
): { valid: boolean; reason?: string; clampedOptions?: CipherOptions } {
  if (!options) return { valid: true };

  if (cipherId === "argon2id" || cipherId === "argon2") {
    const { clamped, modified, warnings } = clampArgon2idParameters(options);
    if (modified) {
      return {
        valid: false,
        reason: warnings.join(" "),
        clampedOptions: clamped,
      };
    }
  }

  if (cipherId === "scrypt") {
    const { clamped, modified, warnings } = clampScryptParameters(options as { N?: number; r?: number; p?: number });
    if (modified) {
      return {
        valid: false,
        reason: warnings.join(" "),
        clampedOptions: clamped,
      };
    }
  }

  return { valid: true };
}

export const ATTACK_WORKLOAD_LIMITS: Readonly<WorkloadLimits> = {
  maxInputBytes: 64 * 1024,
  maxKeyBytes: 16 * 1024,
  maxTraceSteps: 1_000,
  maxIterations: 10_000,
  maxConcurrentJobs: 1,
  maxDurationMs: 5_000,
  maxBenchmarkDurationMs: 5_000,
};

export const BENCHMARK_WORKLOAD_LIMITS: Readonly<WorkloadLimits> = {
  maxInputBytes: 64 * 1024,
  maxKeyBytes: 16 * 1024,
  maxTraceSteps: 500,
  maxIterations: 10_000,
  maxConcurrentJobs: 1,
  maxDurationMs: 5_000,
  maxBenchmarkDurationMs: 5_000,
};

export type WorkloadLimitCode =
  | "WORKLOAD_INPUT_LIMIT"
  | "WORKLOAD_KEY_LIMIT"
  | "WORKLOAD_TRACE_LIMIT"
  | "WORKLOAD_ITERATION_LIMIT"
  | "WORKLOAD_CONCURRENCY_LIMIT"
  | "WORKLOAD_DURATION_LIMIT"
  | "WORKLOAD_BENCHMARK_LIMIT";

export interface WorkloadValidationFailure {
  code: WorkloadLimitCode;
  message: string;
  limit: number;
  actual: number;
  field:
    | "input"
    | "key"
    | "traceSteps"
    | "iterations"
    | "concurrentJobs"
    | "duration"
    | "benchmarkDuration";
}

export interface WorkloadValidationSuccess {
  valid: true;
  limits: WorkloadLimits;
}

export interface WorkloadValidationResult {
  valid: boolean;
  limits: WorkloadLimits;
  failure?: WorkloadValidationFailure;
}

function getUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function getOperationLimits(
  operation: WorkloadOperation,
  cipherId?: string,
): WorkloadLimits {
  if (operation === "attack") return { ...ATTACK_WORKLOAD_LIMITS };
  if (operation === "benchmark") return { ...BENCHMARK_WORKLOAD_LIMITS };

  const override = cipherId
    ? WORKLOAD_LIMIT_OVERRIDES[cipherId]
    : undefined;

  return {
    ...DEFAULT_WORKLOAD_LIMITS,
    ...override,
  };
}

function getRequestedIterations(options?: CipherOptions): number {
  if (!options) return 0;

  const candidates = [options.iterations, options.rounds, options.N];

  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }

  return 0;
}

export function resolveWorkloadLimits(
  operation: WorkloadOperation = "cipher",
  cipherId?: string,
): WorkloadLimits {
  return getOperationLimits(operation, cipherId);
}

export function validateWorkload({
  operation = "cipher",
  cipherId,
  input,
  key,
  options,
  traceSteps,
  concurrentJobs = 0,
  durationMs,
}: {
  operation?: WorkloadOperation;
  cipherId?: string;
  input?: string;
  key?: string;
  options?: CipherOptions;
  traceSteps?: number;
  concurrentJobs?: number;
  durationMs?: number;
}): WorkloadValidationResult {
  const limits = resolveWorkloadLimits(operation, cipherId);

  if (input !== undefined) {
    const actual = getUtf8ByteLength(input);
    if (actual > limits.maxInputBytes) {
      return {
        valid: false,
        limits,
        failure: {
          code: "WORKLOAD_INPUT_LIMIT",
          field: "input",
          limit: limits.maxInputBytes,
          actual,
          message: `This operation accepts at most ${formatBytes(
            limits.maxInputBytes,
          )} of input. Your input is ${formatBytes(actual)}.`,
        },
      };
    }
  }

  if (key !== undefined) {
    const actual = getUtf8ByteLength(key);
    if (actual > limits.maxKeyBytes) {
      return {
        valid: false,
        limits,
        failure: {
          code: "WORKLOAD_KEY_LIMIT",
          field: "key",
          limit: limits.maxKeyBytes,
          actual,
          message: `This operation accepts a key of at most ${formatBytes(
            limits.maxKeyBytes,
          )}. Your key is ${formatBytes(actual)}.`,
        },
      };
    }
  }

  const iterations = getRequestedIterations(options);
  if (iterations > limits.maxIterations) {
    return {
      valid: false,
      limits,
      failure: {
        code: "WORKLOAD_ITERATION_LIMIT",
        field: "iterations",
        limit: limits.maxIterations,
        actual: iterations,
        message: `This operation allows at most ${limits.maxIterations.toLocaleString()} iterations.`,
      },
    };
  }

  if (traceSteps !== undefined && traceSteps > limits.maxTraceSteps) {
    return {
      valid: false,
      limits,
      failure: {
        code: "WORKLOAD_TRACE_LIMIT",
        field: "traceSteps",
        limit: limits.maxTraceSteps,
        actual: traceSteps,
        message: `This visualization is limited to ${limits.maxTraceSteps.toLocaleString()} trace steps.`,
      },
    };
  }

  if (concurrentJobs > limits.maxConcurrentJobs) {
    return {
      valid: false,
      limits,
      failure: {
        code: "WORKLOAD_CONCURRENCY_LIMIT",
        field: "concurrentJobs",
        limit: limits.maxConcurrentJobs,
        actual: concurrentJobs,
        message:
          "Another cryptographic operation is already running. Wait for it to finish before starting another.",
      },
    };
  }

  if (durationMs !== undefined && durationMs > limits.maxDurationMs) {
    return {
      valid: false,
      limits,
      failure: {
        code: "WORKLOAD_DURATION_LIMIT",
        field: "duration",
        limit: limits.maxDurationMs,
        actual: durationMs,
        message: `This operation exceeded its ${limits.maxDurationMs}ms execution budget.`,
      },
    };
  }

  return { valid: true, limits };
}

export function validateTraceStepCount(
  steps: unknown,
  limits: WorkloadLimits,
): WorkloadValidationResult {
  const count = Array.isArray(steps) ? steps.length : 0;

  if (count > limits.maxTraceSteps) {
    return {
      valid: false,
      limits,
      failure: {
        code: "WORKLOAD_TRACE_LIMIT",
        field: "traceSteps",
        limit: limits.maxTraceSteps,
        actual: count,
        message: `The cryptographic trace contains ${count.toLocaleString()} steps, exceeding the safe limit of ${limits.maxTraceSteps.toLocaleString()}.`,
      },
    };
  }

  return { valid: true, limits };
}

export interface WorkloadAuditReport {
  timestamp: string;
  operation: WorkloadOperation;
  cipherId?: string;
  evaluatedLimits: WorkloadLimits;
  status: "PASSED" | "REJECTED" | "CLAMPED";
  warnings: string[];
  rejectionReason?: string;
}

/**
 * Audits a requested cryptographic workload configuration against safety policies.
 * Evaluates memory allocation, iteration count, and execution time bounds.
 */
export function auditWorkloadLimits({
  operation = "cipher",
  cipherId,
  input,
  key,
  options,
}: {
  operation?: WorkloadOperation;
  cipherId?: string;
  input?: string;
  key?: string;
  options?: CipherOptions;
}): WorkloadAuditReport {
  const limits = resolveWorkloadLimits(operation, cipherId);
  const warnings: string[] = [];
  let status: "PASSED" | "REJECTED" | "CLAMPED" = "PASSED";

  const validation = validateWorkload({
    operation,
    cipherId,
    input,
    key,
    options,
  });

  if (!validation.valid && validation.failure) {
    return {
      timestamp: new Date().toISOString(),
      operation,
      cipherId,
      evaluatedLimits: limits,
      status: "REJECTED",
      warnings: [validation.failure.message],
      rejectionReason: validation.failure.message,
    };
  }

  if (cipherId === "argon2id" || cipherId === "argon2") {
    const memBlocks = typeof options?.memoryBlocks === "number" ? options.memoryBlocks : 0;
    const iterations = typeof options?.iterations === "number" ? options.iterations : 0;
    if (memBlocks > 64) {
      status = "CLAMPED";
      warnings.push(`Argon2id memory blocks (${memBlocks}) exceeds client limit of 64.`);
    }
    if (iterations > 10) {
      status = "CLAMPED";
      warnings.push(`Argon2id iterations (${iterations}) exceeds client limit of 10.`);
    }
  } else if (cipherId === "scrypt") {
    const costN = typeof options?.N === "number" ? options.N : 0;
    const parallelP = typeof options?.p === "number" ? options.p : 0;
    if (costN > 65536) {
      status = "CLAMPED";
      warnings.push(`Scrypt cost N (${costN}) exceeds client limit of 65536.`);
    }
    if (parallelP > 8) {
      status = "CLAMPED";
      warnings.push(`Scrypt parallelization p (${parallelP}) exceeds client limit of 8.`);
    }
  }

  return {
    timestamp: new Date().toISOString(),
    operation,
    cipherId,
    evaluatedLimits: limits,
    status,
    warnings,
  };
}

/**
 * Returns a human-readable summary of workload limits for a given algorithm.
 */
export function getWorkloadLimitSummary(cipherId?: string): string {
  const limits = resolveWorkloadLimits("cipher", cipherId);
  const memLimit = MEMORY_WORKLOAD_LIMITS[cipherId ?? ""];
  
  if (memLimit) {
    return `${cipherId ?? "Algorithm"} Workload Limits: Max Memory ${memLimit.maxMemoryMB} MB, Max Iterations ${memLimit.maxIterations}, Max Input ${formatBytes(limits.maxInputBytes)}, Execution Timeout ${limits.maxDurationMs}ms.`;
  }
  return `Default Workload Limits: Max Input ${formatBytes(limits.maxInputBytes)}, Max Key ${formatBytes(limits.maxKeyBytes)}, Max Iterations ${limits.maxIterations.toLocaleString()}, Execution Timeout ${limits.maxDurationMs}ms.`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${Math.round((bytes / 1024) * 10) / 10} KB`;
  }
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}
