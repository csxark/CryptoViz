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
    maxIterations: 100_000,
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

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${Math.round((bytes / 1024) * 10) / 10} KB`;
  }
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}
