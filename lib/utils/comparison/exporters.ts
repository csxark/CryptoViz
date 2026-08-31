import type { BenchmarkSession } from "@/types/benchmark";
import { computeSessionComparison } from "./diff";

/**
 * Format exportable JSON comparison report.
 */
export function exportSessionComparisonJSON(
  sessionA: BenchmarkSession,
  sessionB: BenchmarkSession,
): string {
  const comparison = computeSessionComparison(sessionA, sessionB);
  const data = {
    exportedAt: new Date().toISOString(),
    tool: "CryptoViz Benchmark Session Comparer",
    summary: {
      speedupRatio: comparison.speedupRatio,
      throughputDeltaPercent: comparison.throughputDeltaPercent,
      meanTimeDeltaMs: comparison.meanTimeDeltaMs,
      workerTimeDeltaMs: comparison.workerTimeDeltaMs,
      memoryDeltaBytes: comparison.memoryDeltaBytes,
    },
    sessionA: {
      id: sessionA.id,
      timestamp: sessionA.timestamp,
      deviceInfo: sessionA.deviceInfo,
      inputSize: sessionA.inputSize,
      iterations: sessionA.iterations,
      resultsCount: sessionA.results.length,
    },
    sessionB: {
      id: sessionB.id,
      timestamp: sessionB.timestamp,
      deviceInfo: sessionB.deviceInfo,
      inputSize: sessionB.inputSize,
      iterations: sessionB.iterations,
      resultsCount: sessionB.results.length,
    },
    algorithmDiffs: comparison.algorithmDiffs.map((diff) => ({
      cipherId: diff.cipherId,
      cipherName: diff.cipherName,
      category: diff.category,
      opsPerSecA: diff.opsPerSecA,
      opsPerSecB: diff.opsPerSecB,
      speedupFactor: diff.speedupFactor,
      status: diff.status,
      avgTimeA: diff.avgTimeA,
      avgTimeB: diff.avgTimeB,
      avgTimeDeltaMs: diff.avgTimeDeltaMs,
    })),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Format exportable CSV comparison report.
 */
export function exportSessionComparisonCSV(
  sessionA: BenchmarkSession,
  sessionB: BenchmarkSession,
): string {
  const comparison = computeSessionComparison(sessionA, sessionB);
  const rows: string[] = [
    [
      "Algorithm ID",
      "Algorithm Name",
      "Category",
      "Ops/sec (Session A)",
      "Ops/sec (Session B)",
      "Speedup Factor (B vs A)",
      "Status",
      "Avg Time (ms) A",
      "Avg Time (ms) B",
      "Delta (ms)",
    ].join(","),
  ];

  comparison.algorithmDiffs.forEach((diff) => {
    rows.push(
      [
        `"${diff.cipherId}"`,
        `"${diff.cipherName}"`,
        `"${diff.category}"`,
        diff.opsPerSecA !== null ? diff.opsPerSecA.toFixed(2) : "N/A",
        diff.opsPerSecB !== null ? diff.opsPerSecB.toFixed(2) : "N/A",
        diff.speedupFactor !== null ? `${diff.speedupFactor.toFixed(2)}x` : "N/A",
        diff.status,
        diff.avgTimeA !== null ? diff.avgTimeA.toFixed(4) : "N/A",
        diff.avgTimeB !== null ? diff.avgTimeB.toFixed(4) : "N/A",
        diff.avgTimeDeltaMs !== null ? diff.avgTimeDeltaMs.toFixed(4) : "N/A",
      ].join(","),
    );
  });

  return rows.join("\n");
}

/**
 * Returns Tailwind background and text color utility classes for benchmark metric indicators.
 */
export function getMetricBg(isSpeedup: boolean, isSlowdown: boolean): string {
  if (isSpeedup) {
    return "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400";
  }
  if (isSlowdown) {
    return "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400";
  }
  return "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400";
}

/**
 * Returns Tailwind text color utility classes for metric trend percentage text.
 */
export function getMetricTextColor(isSpeedup: boolean, isSlowdown: boolean): string {
  if (isSpeedup) {
    return "text-emerald-600 dark:text-emerald-400";
  }
  if (isSlowdown) {
    return "text-rose-600 dark:text-rose-400";
  }
  return "text-zinc-500 dark:text-zinc-400";
}
