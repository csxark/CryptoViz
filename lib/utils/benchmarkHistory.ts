import type { BenchmarkSession, ScalingBenchmarkResult } from "@/types/benchmark";
import {
  getItem,
  setItem,
} from "./storage";
import { reviveBenchmarkSession, reviveScalingResult } from "./dateReviver";
import {
  CRYPTOVIZ_BENCHMARK_HISTORY_KEY,
  CRYPTOVIZ_SCALING_HISTORY_KEY,
  CRYPTOVIZ_MAX_BENCHMARK_HISTORY,
  CRYPTOVIZ_MAX_SCALING_HISTORY,
} from "@/constants";

export {
  CRYPTOVIZ_BENCHMARK_HISTORY_KEY as BENCHMARK_HISTORY_KEY,
  CRYPTOVIZ_SCALING_HISTORY_KEY as SCALING_HISTORY_KEY,
  CRYPTOVIZ_MAX_BENCHMARK_HISTORY as MAX_BENCHMARK_HISTORY,
  CRYPTOVIZ_MAX_SCALING_HISTORY as MAX_SCALING_HISTORY,
};

export function loadBenchmarkHistory(): BenchmarkSession[] {
  const parsed = getItem<BenchmarkSession[]>(
    CRYPTOVIZ_BENCHMARK_HISTORY_KEY,
    [],
    (val): val is BenchmarkSession[] => Array.isArray(val),
  );
  return parsed.map(reviveBenchmarkSession);
}

export function saveBenchmarkHistory(sessions: BenchmarkSession[]): void {
  setItem(
    CRYPTOVIZ_BENCHMARK_HISTORY_KEY,
    sessions.slice(0, CRYPTOVIZ_MAX_BENCHMARK_HISTORY),
  );
}

export function addBenchmarkSession(
  sessions: BenchmarkSession[],
  session: BenchmarkSession,
): BenchmarkSession[] {
  return [session, ...sessions.filter((item) => item.id !== session.id)].slice(
    0,
    CRYPTOVIZ_MAX_BENCHMARK_HISTORY,
  );
}

export { formatBytes } from "@/lib/formatters";

export function loadScalingHistory(): ScalingBenchmarkResult[] {
  const parsed = getItem<ScalingBenchmarkResult[]>(
    CRYPTOVIZ_SCALING_HISTORY_KEY,
    [],
    (val): val is ScalingBenchmarkResult[] => Array.isArray(val),
  );
  return parsed.map(reviveScalingResult);
}

export function saveScalingHistory(results: ScalingBenchmarkResult[]): void {
  setItem(
    CRYPTOVIZ_SCALING_HISTORY_KEY,
    results.slice(0, CRYPTOVIZ_MAX_SCALING_HISTORY),
  );
}

export function addScalingResult(
  history: ScalingBenchmarkResult[],
  result: ScalingBenchmarkResult,
): ScalingBenchmarkResult[] {
  return [result, ...history.filter((item) => item.cipherId !== result.cipherId)].slice(
    0,
    CRYPTOVIZ_MAX_SCALING_HISTORY,
  );
}
