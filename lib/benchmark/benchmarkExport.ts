/** Structured benchmark report exporters.*/

import type { BenchmarkResult, DeviceInfo } from "@/types/benchmark";
import { formatBytes, formatMilliseconds, formatOperationsPerSecond } from "@/lib/formatters";

export const BENCHMARK_EXPORT_SCHEMA = "cryptoviz.benchmark";
export const BENCHMARK_EXPORT_SCHEMA_VERSION = "1.0.0";
export const DEFAULT_WARM_UP_RUNS = 1;

export interface BenchmarkMarkdownOptions {
  warmUpRuns?: number;
}

export interface BenchmarkJsonReport {
  schema: typeof BENCHMARK_EXPORT_SCHEMA;
  schemaVersion: typeof BENCHMARK_EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  timestamp: string;
  environment: DeviceInfo;
  benchmark: {
    resultCount: number;
    iterations: number;
    warmUpRuns: number;
    inputSizes: number[];
    directions: BenchmarkResult["direction"][];
  };
  results: Array<{
    cipherId: string;
    cipherName: string;
    category: BenchmarkResult["category"];
    direction: BenchmarkResult["direction"];
    inputSize: number;
    iterations: number;
    averageTimeMs: number;
    minTimeMs: number;
    maxTimeMs: number;
    totalTimeMs: number;
    stdDevMs: number;
    varianceMs2: number;
    operationsPerSecond: number;
    memoryGrowthBytes: number | null;
    workerExecutionTimeMs: number | null;
    renderTimeMs: number | null;
    implementation: BenchmarkResult["implementation"] | null;
    status: BenchmarkResult["status"] | null;
    errorMessage: string | null;
    timestamp: string;
  }>;
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function escapeMarkdownCell(value: string): string {
  return value
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br />");
}

function formatScreen(environment: DeviceInfo): string {
  return `${environment.screen.width}×${environment.screen.height}`;
}

function formatEnvironment(environment: DeviceInfo): string {
  return [
    `UA: ${escapeMarkdownCell(environment.userAgent)}`,
    `CPU: ${environment.hardwareConcurrency} logical cores`,
    `Platform: ${escapeMarkdownCell(environment.platform)}`,
    `Screen: ${formatScreen(environment)}`,
    `Locale: ${escapeMarkdownCell(environment.language)}`,
    `TZ: ${escapeMarkdownCell(environment.timezone)}`,
  ].join("<br />");
}

function normalizeTimestamp(value: Date): string {
  return value.toISOString();
}

function normalizeWarmUpRuns(value: number | undefined): number {
  if (value === undefined) return DEFAULT_WARM_UP_RUNS;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Warm-up runs must be a non-negative integer.");
  }
  return value;
}

function buildJsonResult(result: BenchmarkResult): BenchmarkJsonReport["results"][number] {
  const stdDevMs = finiteOrZero(result.stdDev);

  return {
    cipherId: result.cipherId,
    cipherName: result.cipherName,
    category: result.category,
    direction: result.direction,
    inputSize: result.inputSize,
    iterations: result.iterations,
    averageTimeMs: finiteOrZero(result.averageTime),
    minTimeMs: finiteOrZero(result.minTime),
    maxTimeMs: finiteOrZero(result.maxTime),
    totalTimeMs: finiteOrZero(result.totalTime),
    stdDevMs,
    varianceMs2: stdDevMs * stdDevMs,
    operationsPerSecond: finiteOrZero(result.operationsPerSecond),
    memoryGrowthBytes:
      result.memoryUsage !== undefined && Number.isFinite(result.memoryUsage)
        ? result.memoryUsage
        : null,
    workerExecutionTimeMs:
      result.workerExecutionTime !== undefined &&
      Number.isFinite(result.workerExecutionTime)
        ? result.workerExecutionTime
        : null,
    renderTimeMs:
      result.renderTime !== undefined && Number.isFinite(result.renderTime)
        ? result.renderTime
        : null,
    implementation: result.implementation ?? null,
    status: result.status ?? null,
    errorMessage: result.errorMessage ?? null,
    timestamp: normalizeTimestamp(result.timestamp),
  };
}

/**
 * Generate a GitHub-flavored Markdown benchmark table.
 */
export function exportBenchmarkAsMarkdown(
  results: BenchmarkResult[],
  env: DeviceInfo,
  options: BenchmarkMarkdownOptions = {},
): string {
  const warmUpRuns = normalizeWarmUpRuns(options.warmUpRuns);
  const timestamp = new Date().toISOString();

  if (results.length === 0) {
    return [
      "# Benchmark Report",
      "",
      `Generated: ${timestamp}`,
      "",
      "No benchmark results are available.",
      "",
    ].join("\n");
  }

  const environment = formatEnvironment(env);

  const rows = results.map((result) => {
    const memory = formatBytes(result.memoryUsage);

    return [
      escapeMarkdownCell(result.cipherName),
      escapeMarkdownCell(result.category),
      formatMilliseconds(result.averageTime),
      `${formatOperationsPerSecond(result.operationsPerSecond)} ops/s`,
      memory,
      environment,
    ];
  });

  const table = [
    "| Cipher | Category | Average Time | Ops/sec | Memory Growth | Environment |",
    "| --- | --- | ---: | ---: | ---: | --- |",
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");

  const iterationCounts = Array.from(
    new Set(results.map((result) => result.iterations)),
  ).sort((a, b) => a - b);

  const iterationSummary =
    iterationCounts.length === 1
      ? `${numberFormatter.format(iterationCounts[0])}`
      : iterationCounts.map((value) => numberFormatter.format(value)).join(", ");

  return [
    "# Benchmark Report",
    "",
    `Generated: ${timestamp}`,
    `Warm-up runs: ${numberFormatter.format(warmUpRuns)}`,
    `Measured iterations: ${iterationSummary}`,
    "",
    table,
    "",
  ].join("\n");
}

/**
 * Generate a versioned, machine-readable benchmark report.
 *
 * Dates are normalized to ISO-8601 strings and undefined optional metrics are
 * represented as null so the exported shape stays stable for CI consumers.
 */
export function exportBenchmarkAsJson(
  results: BenchmarkResult[],
  env: DeviceInfo,
  options: BenchmarkMarkdownOptions = {},
): string {
  const warmUpRuns = normalizeWarmUpRuns(options.warmUpRuns);
  const exportedAt = new Date().toISOString();

  const iterations = results.length
    ? Math.max(...results.map((result) => result.iterations))
    : 0;

  const report: BenchmarkJsonReport = {
    schema: BENCHMARK_EXPORT_SCHEMA,
    schemaVersion: BENCHMARK_EXPORT_SCHEMA_VERSION,
    exportedAt,
    timestamp:
      results.length > 0
        ? normalizeTimestamp(results[0].timestamp)
        : exportedAt,
    environment: {
      ...env,
      screen: { ...env.screen },
    },
    benchmark: {
      resultCount: results.length,
      iterations,
      warmUpRuns,
      inputSizes: Array.from(
        new Set(results.map((result) => result.inputSize)),
      ).sort((a, b) => a - b),
      directions: Array.from(
        new Set(results.map((result) => result.direction)),
      ),
    },
    results: results.map(buildJsonResult),
  };

  return JSON.stringify(report, null, 2);
}
