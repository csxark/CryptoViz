import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKLOAD_LIMITS,
  resolveWorkloadLimits,
  validateTraceStepCount,
  validateWorkload,
} from "../../../lib/security/workloadLimits";

describe("cryptographic workload limits", () => {
  it("rejects oversized input before execution", () => {
    const input = "a".repeat(
      DEFAULT_WORKLOAD_LIMITS.maxInputBytes + 1,
    );

    const result = validateWorkload({
      operation: "cipher",
      cipherId: "aes",
      input,
      key: "test-key",
    });

    expect(result.valid).toBe(false);
    expect(result.failure?.code).toBe(
      "WORKLOAD_INPUT_LIMIT",
    );
  });

  it("accepts input at the configured boundary", () => {
    const input = "a".repeat(
      DEFAULT_WORKLOAD_LIMITS.maxInputBytes,
    );

    const result = validateWorkload({
      operation: "cipher",
      cipherId: "aes",
      input,
      key: "test-key",
    });

    expect(result.valid).toBe(true);
  });

  it("rejects oversized keys", () => {
    const key = "k".repeat(
      DEFAULT_WORKLOAD_LIMITS.maxKeyBytes + 1,
    );

    const result = validateWorkload({
      operation: "cipher",
      cipherId: "aes",
      input: "hello",
      key,
    });

    expect(result.valid).toBe(false);
    expect(result.failure?.code).toBe(
      "WORKLOAD_KEY_LIMIT",
    );
  });

  it("rejects excessive iterations", () => {
    const result = validateWorkload({
      operation: "cipher",
      cipherId: "aes",
      input: "hello",
      key: "key",
      options: {
        iterations:
          DEFAULT_WORKLOAD_LIMITS.maxIterations + 1,
      },
    });

    expect(result.valid).toBe(false);
    expect(result.failure?.code).toBe(
      "WORKLOAD_ITERATION_LIMIT",
    );
  });

  it("accepts iterations at the configured boundary", () => {
    const result = validateWorkload({
      operation: "cipher",
      cipherId: "aes",
      input: "hello",
      key: "key",
      options: {
        iterations:
          DEFAULT_WORKLOAD_LIMITS.maxIterations,
      },
    });

    expect(result.valid).toBe(true);
  });

  it("rejects traces exceeding the configured limit", () => {
    const steps = Array.from(
      {
        length:
          DEFAULT_WORKLOAD_LIMITS.maxTraceSteps + 1,
      },
      () => ({}),
    );

    const result = validateTraceStepCount(
      steps,
      DEFAULT_WORKLOAD_LIMITS,
    );

    expect(result.valid).toBe(false);
    expect(result.failure?.code).toBe(
      "WORKLOAD_TRACE_LIMIT",
    );
  });

  it("accepts traces at the configured limit", () => {
    const steps = Array.from(
      {
        length:
          DEFAULT_WORKLOAD_LIMITS.maxTraceSteps,
      },
      () => ({}),
    );

    const result = validateTraceStepCount(
      steps,
      DEFAULT_WORKLOAD_LIMITS,
    );

    expect(result.valid).toBe(true);
  });

  it("rejects concurrent work beyond the policy", () => {
    const result = validateWorkload({
      operation: "cipher",
      cipherId: "aes",
      input: "hello",
      key: "key",
      concurrentJobs:
        DEFAULT_WORKLOAD_LIMITS.maxConcurrentJobs + 1,
    });

    expect(result.valid).toBe(false);
    expect(result.failure?.code).toBe(
      "WORKLOAD_CONCURRENCY_LIMIT",
    );
  });

  it("uses tighter attack limits", () => {
    const limits = resolveWorkloadLimits("attack");

    expect(limits.maxInputBytes).toBeLessThan(
      DEFAULT_WORKLOAD_LIMITS.maxInputBytes,
    );

    expect(limits.maxDurationMs).toBeLessThan(
      DEFAULT_WORKLOAD_LIMITS.maxDurationMs,
    );
  });

  it("uses tighter benchmark limits", () => {
    const limits = resolveWorkloadLimits("benchmark");

    expect(limits.maxBenchmarkDurationMs).toBe(5000);
    expect(limits.maxConcurrentJobs).toBe(1);
  });

  it("supports explicit cipher-specific limits", () => {
    const limits = resolveWorkloadLimits(
      "cipher",
      "bcrypt",
    );

    expect(limits.maxIterations).toBe(12);
  });
});