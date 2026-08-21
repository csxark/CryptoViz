import type { BenchmarkSession, ScalingBenchmarkResult } from "@/types/benchmark";
import {
  safeGetItemJson,
  safeSetItemJson,
} from "./storage";

export const BENCHMARK_HISTORY_KEY = "cryptoviz-benchmark-history";
export const SCALING_HISTORY_KEY = "cryptoviz-scaling-history";
export const MAX_BENCHMARK_HISTORY = 20;
export const MAX_SCALING_HISTORY = 20;

function reviveSession(session: BenchmarkSession): BenchmarkSession {
  return {
    ...session,
    timestamp: new Date(session.timestamp),
    results: Array.isArray(session.results)
      ? session.results.map((result) => ({
          ...result,
          timestamp: new Date(result.timestamp),
        }))
      : [],
  };
}

export function loadBenchmarkHistory(): BenchmarkSession[] {
  const parsed = safeGetItemJson<BenchmarkSession[]>(
    BENCHMARK_HISTORY_KEY,
    [],
    (val): val is BenchmarkSession[] => Array.isArray(val),
  );
  return parsed.map(reviveSession);
}

export function saveBenchmarkHistory(sessions: BenchmarkSession[]): void {
  safeSetItemJson(
    BENCHMARK_HISTORY_KEY,
    sessions.slice(0, MAX_BENCHMARK_HISTORY),
  );
}

export function addBenchmarkSession(
  sessions: BenchmarkSession[],
  session: BenchmarkSession,
): BenchmarkSession[] {
  return [session, ...sessions.filter((item) => item.id !== session.id)].slice(
    0,
    MAX_BENCHMARK_HISTORY,
  );
}

export { formatBytes } from "@/lib/formatters";

function reviveScalingResult(result: ScalingBenchmarkResult): ScalingBenchmarkResult {
  return {
    ...result,
    timestamp: new Date(result.timestamp),
  };
}

export function loadScalingHistory(): ScalingBenchmarkResult[] {
  const parsed = safeGetItemJson<ScalingBenchmarkResult[]>(
    SCALING_HISTORY_KEY,
    [],
    (val): val is ScalingBenchmarkResult[] => Array.isArray(val),
  );
  return parsed.map(reviveScalingResult);
}

export function saveScalingHistory(results: ScalingBenchmarkResult[]): void {
  safeSetItemJson(
    SCALING_HISTORY_KEY,
    results.slice(0, MAX_SCALING_HISTORY),
  );
}

export function addScalingResult(
  history: ScalingBenchmarkResult[],
  result: ScalingBenchmarkResult,
): ScalingBenchmarkResult[] {
  return [result, ...history.filter((item) => item.cipherId !== result.cipherId)].slice(
    0,
    MAX_SCALING_HISTORY,
  );
}
