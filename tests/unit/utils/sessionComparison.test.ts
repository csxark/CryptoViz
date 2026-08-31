import { describe, expect, it } from "vitest";
import {
  computeSessionComparison,
  DEFAULT_SESSION_PRESETS,
  exportSessionComparisonJSON,
  exportSessionComparisonCSV,
  getMetricBg,
  getMetricTextColor,
} from "@/lib/utils/comparison";
import type { BenchmarkSession } from "@/types/benchmark";

describe("sessionComparison utility", () => {
  const mockSessionA: BenchmarkSession = {
    id: "session-a",
    timestamp: new Date("2026-07-28T10:00:00Z"),
    inputSize: 1024,
    iterations: 100,
    deviceInfo: {
      userAgent: "Test Browser A",
      hardwareConcurrency: 4,
      language: "en-US",
      platform: "Win32",
      timezone: "UTC",
      screen: { width: 1920, height: 1080, colorDepth: 24, pixelDepth: 24 },
    },
    results: [
      {
        cipherId: "caesar",
        cipherName: "Caesar Cipher",
        category: "classical",
        inputSize: 1024,
        direction: "encrypt",
        iterations: 100,
        averageTime: 1.0,
        minTime: 0.8,
        maxTime: 1.2,
        stdDev: 0.1,
        totalTime: 100,
        operationsPerSecond: 1000,
        timestamp: new Date("2026-07-28T10:00:00Z"),
        workerExecutionTime: 1.5,
        memoryUsage: 10000,
        status: "success",
      },
      {
        cipherId: "aes",
        cipherName: "AES-GCM",
        category: "symmetric",
        inputSize: 1024,
        direction: "encrypt",
        iterations: 100,
        averageTime: 2.0,
        minTime: 1.8,
        maxTime: 2.5,
        stdDev: 0.2,
        totalTime: 200,
        operationsPerSecond: 500,
        timestamp: new Date("2026-07-28T10:00:00Z"),
        workerExecutionTime: 2.5,
        memoryUsage: 20000,
        status: "success",
      },
    ],
  };

  const mockSessionB: BenchmarkSession = {
    id: "session-b",
    timestamp: new Date("2026-07-28T10:05:00Z"),
    inputSize: 1024,
    iterations: 100,
    deviceInfo: {
      userAgent: "Test Browser B (Hardware)",
      hardwareConcurrency: 8,
      language: "en-US",
      platform: "Win32",
      timezone: "UTC",
      screen: { width: 1920, height: 1080, colorDepth: 24, pixelDepth: 24 },
    },
    results: [
      {
        cipherId: "caesar",
        cipherName: "Caesar Cipher",
        category: "classical",
        inputSize: 1024,
        direction: "encrypt",
        iterations: 100,
        averageTime: 1.0,
        minTime: 0.8,
        maxTime: 1.2,
        stdDev: 0.1,
        totalTime: 100,
        operationsPerSecond: 1000,
        timestamp: new Date("2026-07-28T10:05:00Z"),
        workerExecutionTime: 1.2,
        memoryUsage: 9000,
        status: "success",
      },
      {
        cipherId: "aes",
        cipherName: "AES-GCM",
        category: "symmetric",
        inputSize: 1024,
        direction: "encrypt",
        iterations: 100,
        averageTime: 0.5,
        minTime: 0.4,
        maxTime: 0.7,
        stdDev: 0.05,
        totalTime: 50,
        operationsPerSecond: 2000,
        timestamp: new Date("2026-07-28T10:05:00Z"),
        workerExecutionTime: 0.8,
        memoryUsage: 12000,
        status: "success",
      },
    ],
  };

  it("correctly computes session comparison metrics", () => {
    const delta = computeSessionComparison(mockSessionA, mockSessionB);

    expect(delta.sessionA.id).toBe("session-a");
    expect(delta.sessionB.id).toBe("session-b");
    expect(delta.algorithmDiffs).toHaveLength(2);

    // Mean Ops/sec A: (1000+500)/2 = 750
    // Mean Ops/sec B: (1000+2000)/2 = 1500
    // Speedup ratio: 1500 / 750 = 2.0
    expect(delta.speedupRatio).toBeCloseTo(2.0, 1);
    expect(delta.throughputDeltaPercent).toBeCloseTo(100.0, 1);

    // AES speedup: 2000 / 500 = 4.0x
    const aesDiff = delta.algorithmDiffs.find((d) => d.cipherId === "aes");
    expect(aesDiff).toBeDefined();
    expect(aesDiff?.speedupFactor).toBe(4.0);
    expect(aesDiff?.status).toBe("faster");

    // Caesar status: 1000 vs 1000 -> similar
    const caesarDiff = delta.algorithmDiffs.find((d) => d.cipherId === "caesar");
    expect(caesarDiff).toBeDefined();
    expect(caesarDiff?.status).toBe("similar");
  });

  it("loads builtin educational session presets", () => {
    expect(DEFAULT_SESSION_PRESETS.length).toBeGreaterThan(0);
    const hardwarePreset = DEFAULT_SESSION_PRESETS[0];
    expect(hardwarePreset.id).toBe("hardware-vs-js");

    const delta = computeSessionComparison(
      hardwarePreset.sessionA,
      hardwarePreset.sessionB,
    );
    expect(delta.speedupRatio).toBeGreaterThan(1.0);
    expect(delta.algorithmDiffs.length).toBeGreaterThan(0);
  });

  it("exports valid JSON and CSV comparison reports", () => {
    const jsonStr = exportSessionComparisonJSON(mockSessionA, mockSessionB);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.tool).toBe("CryptoViz Benchmark Session Comparer");
    expect(parsed.summary.speedupRatio).toBeGreaterThan(0);
    expect(parsed.algorithmDiffs).toHaveLength(2);

    const csvStr = exportSessionComparisonCSV(mockSessionA, mockSessionB);
    expect(csvStr).toContain("Algorithm ID");
    expect(csvStr).toContain("AES-GCM");
    expect(csvStr).toContain("Caesar Cipher");
  });

  it("returns correct Tailwind classes from getMetricBg and getMetricTextColor", () => {
    // Speedup state
    expect(getMetricBg(true, false)).toContain("bg-emerald-100");
    expect(getMetricTextColor(true, false)).toContain("text-emerald-600");

    // Slowdown state
    expect(getMetricBg(false, true)).toContain("bg-rose-100");
    expect(getMetricTextColor(false, true)).toContain("text-rose-600");

    // Neutral state
    expect(getMetricBg(false, false)).toContain("bg-amber-100");
    expect(getMetricTextColor(false, false)).toContain("text-zinc-500");
  });
});
