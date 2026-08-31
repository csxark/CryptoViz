import type { BenchmarkResult, BenchmarkSession } from "@/types/benchmark";

export interface AlgorithmDiff {
  cipherId: string;
  cipherName: string;
  category: string;
  resultA: BenchmarkResult | null;
  resultB: BenchmarkResult | null;
  opsPerSecA: number | null;
  opsPerSecB: number | null;
  opsPerSecDeltaPercent: number | null;
  avgTimeA: number | null;
  avgTimeB: number | null;
  avgTimeDeltaMs: number | null;
  speedupFactor: number | null;
  status: "faster" | "slower" | "similar" | "missing";
}

export interface SessionDelta {
  sessionA: BenchmarkSession;
  sessionB: BenchmarkSession;
  speedupRatio: number;
  meanTimeDeltaMs: number;
  throughputDeltaPercent: number;
  workerTimeDeltaMs: number;
  memoryDeltaBytes: number;
  algorithmDiffs: AlgorithmDiff[];
  fastestAlgorithm?: AlgorithmDiff;
  slowestAlgorithm?: AlgorithmDiff;
}

/**
 * Computes comparative statistics between two benchmark sessions.
 * Session B is treated as the candidate/newer session compared against baseline Session A.
 */
export function computeSessionComparison(
  sessionA: BenchmarkSession,
  sessionB: BenchmarkSession,
): SessionDelta {
  const mapA = new Map<string, BenchmarkResult>();
  const mapB = new Map<string, BenchmarkResult>();

  sessionA.results.forEach((res) => mapA.set(res.cipherId, res));
  sessionB.results.forEach((res) => mapB.set(res.cipherId, res));

  const allCipherIds = Array.from(
    new Set([...mapA.keys(), ...mapB.keys()]),
  );

  const algorithmDiffs: AlgorithmDiff[] = allCipherIds.map((cipherId) => {
    const resA = mapA.get(cipherId) || null;
    const resB = mapB.get(cipherId) || null;

    const name = resB?.cipherName || resA?.cipherName || cipherId;
    const category = resB?.category || resA?.category || "unknown";

    const opsA = resA?.operationsPerSecond ?? null;
    const opsB = resB?.operationsPerSecond ?? null;

    const timeA = resA?.averageTime ?? null;
    const timeB = resB?.averageTime ?? null;

    let opsDeltaPercent: number | null = null;
    let timeDeltaMs: number | null = null;
    let speedup: number | null = null;
    let status: "faster" | "slower" | "similar" | "missing" = "missing";

    if (opsA !== null && opsB !== null && opsA > 0) {
      opsDeltaPercent = ((opsB - opsA) / opsA) * 100;
      speedup = opsB / opsA;

      if (Math.abs(opsDeltaPercent) < 2) {
        status = "similar";
      } else if (opsDeltaPercent > 0) {
        status = "faster";
      } else {
        status = "slower";
      }
    }

    if (timeA !== null && timeB !== null) {
      timeDeltaMs = timeB - timeA;
    }

    return {
      cipherId,
      cipherName: name,
      category,
      resultA: resA,
      resultB: resB,
      opsPerSecA: opsA,
      opsPerSecB: opsB,
      opsPerSecDeltaPercent: opsDeltaPercent,
      avgTimeA: timeA,
      avgTimeB: timeB,
      avgTimeDeltaMs: timeDeltaMs,
      speedupFactor: speedup,
      status,
    };
  });

  // Calculate overall metrics
  const validTimesA = sessionA.results.map((r) => r.averageTime);
  const validTimesB = sessionB.results.map((r) => r.averageTime);

  const meanA = validTimesA.length
    ? validTimesA.reduce((sum, v) => sum + v, 0) / validTimesA.length
    : 0;
  const meanB = validTimesB.length
    ? validTimesB.reduce((sum, v) => sum + v, 0) / validTimesB.length
    : 0;

  const meanTimeDeltaMs = meanB - meanA;

  const validOpsA = sessionA.results.map((r) => r.operationsPerSecond);
  const validOpsB = sessionB.results.map((r) => r.operationsPerSecond);

  const meanOpsA = validOpsA.length
    ? validOpsA.reduce((sum, v) => sum + v, 0) / validOpsA.length
    : 0;
  const meanOpsB = validOpsB.length
    ? validOpsB.reduce((sum, v) => sum + v, 0) / validOpsB.length
    : 0;

  const speedupRatio = meanOpsA > 0 ? meanOpsB / meanOpsA : 1;
  const throughputDeltaPercent =
    meanOpsA > 0 ? ((meanOpsB - meanOpsA) / meanOpsA) * 100 : 0;

  const workerTimesA = sessionA.results
    .map((r) => r.workerExecutionTime)
    .filter((v): v is number => v !== undefined);
  const workerTimesB = sessionB.results
    .map((r) => r.workerExecutionTime)
    .filter((v): v is number => v !== undefined);

  const meanWorkerA = workerTimesA.length
    ? workerTimesA.reduce((sum, v) => sum + v, 0) / workerTimesA.length
    : 0;
  const meanWorkerB = workerTimesB.length
    ? workerTimesB.reduce((sum, v) => sum + v, 0) / workerTimesB.length
    : 0;

  const workerTimeDeltaMs = meanWorkerB - meanWorkerA;

  const memA = sessionA.results
    .map((r) => r.memoryUsage)
    .filter((v): v is number => v !== undefined);
  const memB = sessionB.results
    .map((r) => r.memoryUsage)
    .filter((v): v is number => v !== undefined);

  const meanMemA = memA.length ? memA.reduce((sum, v) => sum + v, 0) / memA.length : 0;
  const meanMemB: number = memB.length ? memB.reduce((sum: number, v: number) => sum + v, 0) / memB.length : 0;

  const memoryDeltaBytes = meanMemB - meanMemA;

  const evaluatedDiffs = algorithmDiffs.filter(
    (d) => d.speedupFactor !== null,
  );

  const sortedBySpeedup = [...evaluatedDiffs].sort(
    (a, b) => (b.speedupFactor || 0) - (a.speedupFactor || 0),
  );

  return {
    sessionA,
    sessionB,
    speedupRatio,
    meanTimeDeltaMs,
    throughputDeltaPercent,
    workerTimeDeltaMs,
    memoryDeltaBytes,
    algorithmDiffs,
    fastestAlgorithm: sortedBySpeedup[0],
    slowestAlgorithm: sortedBySpeedup[sortedBySpeedup.length - 1],
  };
}
