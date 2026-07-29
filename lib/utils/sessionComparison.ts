import type { BenchmarkResult, BenchmarkSession } from "@/types/benchmark";
import { formatBytes } from "@/lib/utils/benchmarkHistory";

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

export interface SessionPreset {
  id: string;
  title: string;
  description: string;
  badge: string;
  sessionA: BenchmarkSession;
  sessionB: BenchmarkSession;
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
  const meanMemB = memB.length ? memB.reduce((sum, v) => sum + v, 0) / memB.length : 0;

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

/**
 * Built-in comparison presets for educational exploration.
 */
export const DEFAULT_SESSION_PRESETS: SessionPreset[] = [
  {
    id: "hardware-vs-js",
    title: "WebCrypto Hardware vs JavaScript Engine",
    description:
      "Compare hardware-accelerated WebCrypto implementations (AES-GCM, SHA-256) against pure JavaScript cipher routines.",
    badge: "Hardware Acceleration",
    sessionA: {
      id: "preset-js-engine",
      timestamp: new Date("2026-07-28T10:00:00Z"),
      inputSize: 1024,
      iterations: 100,
      deviceInfo: {
        userAgent: "Mozilla/5.0 (JS Fallback Engine)",
        hardwareConcurrency: 4,
        deviceMemory: 8,
        language: "en-US",
        platform: "Win32",
        timezone: "UTC",
        screen: { width: 1920, height: 1080, colorDepth: 24, pixelDepth: 24 },
      },
      results: [
        {
          cipherId: "aes",
          cipherName: "AES-GCM (128-bit)",
          category: "symmetric",
          inputSize: 1024,
          direction: "encrypt",
          iterations: 100,
          averageTime: 0.8542,
          minTime: 0.721,
          maxTime: 1.452,
          stdDev: 0.12,
          totalTime: 85.42,
          operationsPerSecond: 1170.68,
          timestamp: new Date("2026-07-28T10:00:00Z"),
          workerExecutionTime: 1.12,
          memoryUsage: 45056,
          implementation: "JavaScript",
          status: "success",
        },
        {
          cipherId: "sha256",
          cipherName: "SHA-256",
          category: "hash",
          inputSize: 1024,
          direction: "hash",
          iterations: 100,
          averageTime: 0.4215,
          minTime: 0.385,
          maxTime: 0.912,
          stdDev: 0.08,
          totalTime: 42.15,
          operationsPerSecond: 2372.47,
          timestamp: new Date("2026-07-28T10:00:00Z"),
          workerExecutionTime: 0.65,
          memoryUsage: 20480,
          implementation: "JavaScript",
          status: "success",
        },
        {
          cipherId: "rsa",
          cipherName: "RSA-OAEP (2048-bit)",
          category: "asymmetric",
          inputSize: 1024,
          direction: "encrypt",
          iterations: 50,
          averageTime: 14.821,
          minTime: 13.52,
          maxTime: 18.91,
          stdDev: 1.15,
          totalTime: 741.05,
          operationsPerSecond: 67.47,
          timestamp: new Date("2026-07-28T10:00:00Z"),
          workerExecutionTime: 15.45,
          memoryUsage: 184320,
          implementation: "JavaScript",
          status: "success",
        },
        {
          cipherId: "caesar",
          cipherName: "Caesar Cipher",
          category: "classical",
          inputSize: 1024,
          direction: "encrypt",
          iterations: 100,
          averageTime: 0.0912,
          minTime: 0.078,
          maxTime: 0.215,
          stdDev: 0.02,
          totalTime: 9.12,
          operationsPerSecond: 10964.91,
          timestamp: new Date("2026-07-28T10:00:00Z"),
          workerExecutionTime: 0.28,
          memoryUsage: 8192,
          implementation: "JavaScript",
          status: "success",
        },
      ],
    },
    sessionB: {
      id: "preset-webcrypto-native",
      timestamp: new Date("2026-07-28T10:05:00Z"),
      inputSize: 1024,
      iterations: 100,
      deviceInfo: {
        userAgent: "Mozilla/5.0 (WebCrypto Native AES-NI)",
        hardwareConcurrency: 8,
        deviceMemory: 16,
        language: "en-US",
        platform: "Win32",
        timezone: "UTC",
        screen: { width: 1920, height: 1080, colorDepth: 24, pixelDepth: 24 },
      },
      results: [
        {
          cipherId: "aes",
          cipherName: "AES-GCM (128-bit)",
          category: "symmetric",
          inputSize: 1024,
          direction: "encrypt",
          iterations: 100,
          averageTime: 0.1821,
          minTime: 0.152,
          maxTime: 0.312,
          stdDev: 0.03,
          totalTime: 18.21,
          operationsPerSecond: 5491.48,
          timestamp: new Date("2026-07-28T10:05:00Z"),
          workerExecutionTime: 0.32,
          memoryUsage: 12288,
          implementation: "WebCrypto",
          status: "success",
        },
        {
          cipherId: "sha256",
          cipherName: "SHA-256",
          category: "hash",
          inputSize: 1024,
          direction: "hash",
          iterations: 100,
          averageTime: 0.0984,
          minTime: 0.082,
          maxTime: 0.198,
          stdDev: 0.015,
          totalTime: 9.84,
          operationsPerSecond: 10162.6,
          timestamp: new Date("2026-07-28T10:05:00Z"),
          workerExecutionTime: 0.21,
          memoryUsage: 6144,
          implementation: "WebCrypto",
          status: "success",
        },
        {
          cipherId: "rsa",
          cipherName: "RSA-OAEP (2048-bit)",
          category: "asymmetric",
          inputSize: 1024,
          direction: "encrypt",
          iterations: 50,
          averageTime: 3.912,
          minTime: 3.42,
          maxTime: 5.12,
          stdDev: 0.34,
          totalTime: 195.6,
          operationsPerSecond: 255.62,
          timestamp: new Date("2026-07-28T10:05:00Z"),
          workerExecutionTime: 4.25,
          memoryUsage: 49152,
          implementation: "WebCrypto",
          status: "success",
        },
        {
          cipherId: "caesar",
          cipherName: "Caesar Cipher",
          category: "classical",
          inputSize: 1024,
          direction: "encrypt",
          iterations: 100,
          averageTime: 0.0885,
          minTime: 0.075,
          maxTime: 0.198,
          stdDev: 0.018,
          totalTime: 8.85,
          operationsPerSecond: 11299.43,
          timestamp: new Date("2026-07-28T10:05:00Z"),
          workerExecutionTime: 0.25,
          memoryUsage: 7168,
          implementation: "JavaScript",
          status: "success",
        },
      ],
    },
  },
  {
    id: "input-scaling",
    title: "1 KB vs 64 KB Input Payload Scaling",
    description:
      "Observe how cipher execution time grows as message payload size increases 64-fold.",
    badge: "Payload Scaling O(N)",
    sessionA: {
      id: "preset-1kb-payload",
      timestamp: new Date("2026-07-28T11:00:00Z"),
      inputSize: 1024,
      iterations: 100,
      deviceInfo: {
        userAgent: "Mozilla/5.0 (Standard CPU)",
        hardwareConcurrency: 8,
        language: "en-US",
        platform: "Win32",
        timezone: "UTC",
        screen: { width: 1920, height: 1080, colorDepth: 24, pixelDepth: 24 },
      },
      results: [
        {
          cipherId: "aes",
          cipherName: "AES-GCM (128-bit)",
          category: "symmetric",
          inputSize: 1024,
          direction: "encrypt",
          iterations: 100,
          averageTime: 0.215,
          minTime: 0.18,
          maxTime: 0.38,
          stdDev: 0.04,
          totalTime: 21.5,
          operationsPerSecond: 4651.16,
          timestamp: new Date("2026-07-28T11:00:00Z"),
          workerExecutionTime: 0.35,
          memoryUsage: 14336,
          status: "success",
        },
        {
          cipherId: "sha256",
          cipherName: "SHA-256",
          category: "hash",
          inputSize: 1024,
          direction: "hash",
          iterations: 100,
          averageTime: 0.112,
          minTime: 0.09,
          maxTime: 0.22,
          stdDev: 0.02,
          totalTime: 11.2,
          operationsPerSecond: 8928.57,
          timestamp: new Date("2026-07-28T11:00:00Z"),
          workerExecutionTime: 0.23,
          memoryUsage: 8192,
          status: "success",
        },
      ],
    },
    sessionB: {
      id: "preset-64kb-payload",
      timestamp: new Date("2026-07-28T11:05:00Z"),
      inputSize: 65536,
      iterations: 100,
      deviceInfo: {
        userAgent: "Mozilla/5.0 (Standard CPU)",
        hardwareConcurrency: 8,
        language: "en-US",
        platform: "Win32",
        timezone: "UTC",
        screen: { width: 1920, height: 1080, colorDepth: 24, pixelDepth: 24 },
      },
      results: [
        {
          cipherId: "aes",
          cipherName: "AES-GCM (128-bit)",
          category: "symmetric",
          inputSize: 65536,
          direction: "encrypt",
          iterations: 100,
          averageTime: 2.915,
          minTime: 2.45,
          maxTime: 4.82,
          stdDev: 0.32,
          totalTime: 291.5,
          operationsPerSecond: 343.05,
          timestamp: new Date("2026-07-28T11:05:00Z"),
          workerExecutionTime: 3.45,
          memoryUsage: 262144,
          status: "success",
        },
        {
          cipherId: "sha256",
          cipherName: "SHA-256",
          category: "hash",
          inputSize: 65536,
          direction: "hash",
          iterations: 100,
          averageTime: 1.542,
          minTime: 1.28,
          maxTime: 2.85,
          stdDev: 0.21,
          totalTime: 154.2,
          operationsPerSecond: 648.5,
          timestamp: new Date("2026-07-28T11:05:00Z"),
          workerExecutionTime: 1.89,
          memoryUsage: 147456,
          status: "success",
        },
      ],
    },
  },
  {
    id: "thread-concurrency",
    title: "2-Core Low-Power vs 16-Core Multi-Thread Worker",
    description:
      "Analyze Web Worker thread pool throughput gains and message queue latency under different hardware concurrency conditions.",
    badge: "Thread Concurrency",
    sessionA: {
      id: "preset-2core-cpu",
      timestamp: new Date("2026-07-28T12:00:00Z"),
      inputSize: 4096,
      iterations: 200,
      deviceInfo: {
        userAgent: "Mozilla/5.0 (Dual-Core Mobile)",
        hardwareConcurrency: 2,
        deviceMemory: 4,
        language: "en-US",
        platform: "Linux armv8l",
        timezone: "UTC",
        screen: { width: 390, height: 844, colorDepth: 24, pixelDepth: 3 },
      },
      results: [
        {
          cipherId: "aes",
          cipherName: "AES-GCM",
          category: "symmetric",
          inputSize: 4096,
          direction: "encrypt",
          iterations: 200,
          averageTime: 1.254,
          minTime: 0.98,
          maxTime: 2.85,
          stdDev: 0.28,
          totalTime: 250.8,
          operationsPerSecond: 797.45,
          timestamp: new Date("2026-07-28T12:00:00Z"),
          workerExecutionTime: 2.45,
          memoryUsage: 81920,
          status: "success",
        },
        {
          cipherId: "bcrypt",
          cipherName: "Bcrypt (KDF)",
          category: "kdf",
          inputSize: 64,
          direction: "hash",
          iterations: 10,
          averageTime: 85.42,
          minTime: 79.2,
          maxTime: 105.4,
          stdDev: 6.2,
          totalTime: 854.2,
          operationsPerSecond: 11.71,
          timestamp: new Date("2026-07-28T12:00:00Z"),
          workerExecutionTime: 87.12,
          memoryUsage: 524288,
          status: "success",
        },
      ],
    },
    sessionB: {
      id: "preset-16core-cpu",
      timestamp: new Date("2026-07-28T12:05:00Z"),
      inputSize: 4096,
      iterations: 200,
      deviceInfo: {
        userAgent: "Mozilla/5.0 (16-Core Workstation)",
        hardwareConcurrency: 16,
        deviceMemory: 32,
        language: "en-US",
        platform: "Win32",
        timezone: "UTC",
        screen: { width: 2560, height: 1440, colorDepth: 24, pixelDepth: 1 },
      },
      results: [
        {
          cipherId: "aes",
          cipherName: "AES-GCM",
          category: "symmetric",
          inputSize: 4096,
          direction: "encrypt",
          iterations: 200,
          averageTime: 0.312,
          minTime: 0.25,
          maxTime: 0.62,
          stdDev: 0.05,
          totalTime: 62.4,
          operationsPerSecond: 3205.13,
          timestamp: new Date("2026-07-28T12:05:00Z"),
          workerExecutionTime: 0.52,
          memoryUsage: 28672,
          status: "success",
        },
        {
          cipherId: "bcrypt",
          cipherName: "Bcrypt (KDF)",
          category: "kdf",
          inputSize: 64,
          direction: "hash",
          iterations: 10,
          averageTime: 22.15,
          minTime: 20.1,
          maxTime: 28.5,
          stdDev: 1.8,
          totalTime: 221.5,
          operationsPerSecond: 45.15,
          timestamp: new Date("2026-07-28T12:05:00Z"),
          workerExecutionTime: 22.95,
          memoryUsage: 262144,
          status: "success",
        },
      ],
    },
  },
];

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
