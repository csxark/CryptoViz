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

  it("clamps oversized Argon2id parameters to safe client limits", () => {
    const { clampArgon2idParameters } = require("../../../lib/security/workloadLimits");
    const res = clampArgon2idParameters({
      memoryBlocks: 128,
      iterations: 20,
    });
    expect(res.modified).toBe(true);
    expect(res.clamped.memoryBlocks).toBe(64);
    expect(res.clamped.iterations).toBe(10);
    expect(res.warnings).toHaveLength(2);
  });

  it("clamps oversized Scrypt parameters to safe client limits", () => {
    const { clampScryptParameters } = require("../../../lib/security/workloadLimits");
    const res = clampScryptParameters({
      N: 131072,
      p: 16,
    });
    expect(res.modified).toBe(true);
    expect(res.clamped.N).toBe(65536);
    expect(res.clamped.p).toBe(8);
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it("audits workload limit parameters and generates audit reports", () => {
    const { auditWorkloadLimits } = require("../../../lib/security/workloadLimits");
    const reportPass = auditWorkloadLimits({
      operation: "cipher",
      cipherId: "argon2id",
      options: { memoryBlocks: 32, iterations: 3 },
    });
    expect(reportPass.status).toBe("PASSED");

    const reportClamp = auditWorkloadLimits({
      operation: "cipher",
      cipherId: "argon2id",
      options: { memoryBlocks: 128, iterations: 20 },
    });
    expect(reportClamp.status).toBe("CLAMPED");
    expect(reportClamp.warnings.length).toBeGreaterThan(0);
  });

  it("provides human readable workload limit summaries", () => {
    const { getWorkloadLimitSummary } = require("../../../lib/security/workloadLimits");
    const summaryArgon = getWorkloadLimitSummary("argon2id");
    expect(summaryArgon).toContain("Argon2id Workload Limits");
    expect(summaryArgon).toContain("Max Memory 64 MB");

    const summaryDefault = getWorkloadLimitSummary();
    expect(summaryDefault).toContain("Default Workload Limits");
  });

  it("validates high memory workloads before worker dispatch", () => {
    const { validateHighMemoryWorkload } = require("../../../lib/security/workloadLimits");
    const validRes = validateHighMemoryWorkload("argon2id", { memoryBlocks: 16, iterations: 2 });
    expect(validRes.valid).toBe(true);

    const invalidRes = validateHighMemoryWorkload("argon2id", { memoryBlocks: 128, iterations: 20 });
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.clampedOptions?.memoryBlocks).toBe(64);
  });
});