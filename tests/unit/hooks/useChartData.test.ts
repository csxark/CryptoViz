import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useChartData } from "@/hooks/useChartData";
import type { SessionDelta } from "@/lib/utils/sessionComparison";

describe("useChartData", () => {
  it("returns an empty array when delta is null or undefined", () => {
    const { result: res1 } = renderHook(() => useChartData(null));
    expect(res1.current).toEqual([]);

    const { result: res2 } = renderHook(() => useChartData(undefined));
    expect(res2.current).toEqual([]);
  });

  it("transforms SessionDelta algorithmDiffs into chart data items", () => {
    const mockDelta: SessionDelta = {
      sessionA: { id: "sA", name: "Session A", timestamp: 1000, environment: {} as any, results: [] },
      sessionB: { id: "sB", name: "Session B", timestamp: 2000, environment: {} as any, results: [] },
      speedupRatio: 1.5,
      meanTimeDeltaMs: -2.5,
      throughputDeltaPercent: 50,
      workerTimeDeltaMs: -1.0,
      memoryDeltaBytes: 1024,
      algorithmDiffs: [
        {
          cipherId: "aes-gcm",
          cipherName: "AES-GCM",
          category: "symmetric",
          resultA: { cipherId: "aes-gcm", cipherName: "AES-GCM", category: "symmetric", averageTime: 10, minTime: 8, maxTime: 12, operationsPerSecond: 100000, workerExecutionTime: 0.5, memoryUsage: 2048 },
          resultB: { cipherId: "aes-gcm", cipherName: "AES-GCM", category: "symmetric", averageTime: 5, minTime: 4, maxTime: 6, operationsPerSecond: 200000, workerExecutionTime: 0.2, memoryUsage: 1024 },
          opsPerSecA: 100000,
          opsPerSecB: 200000,
          opsPerSecDeltaPercent: 100,
          avgTimeA: 10,
          avgTimeB: 5,
          avgTimeDeltaMs: -5,
          speedupFactor: 2.0,
          status: "faster",
        },
      ],
    };

    const { result } = renderHook(() => useChartData(mockDelta));

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toEqual({
      name: "AES-GCM",
      category: "symmetric",
      sessionA_ops: 100000,
      sessionB_ops: 200000,
      sessionA_time: 10,
      sessionB_time: 5,
      sessionA_worker: 0.5,
      sessionB_worker: 0.2,
      sessionA_memory: 2, // 2048 / 1024
      sessionB_memory: 1, // 1024 / 1024
      speedup: 2.0,
    });
  });

  it("handles missing worker and memory values gracefully with fallback defaults", () => {
    const mockDelta: SessionDelta = {
      sessionA: { id: "sA", name: "Session A", timestamp: 1000, environment: {} as any, results: [] },
      sessionB: { id: "sB", name: "Session B", timestamp: 2000, environment: {} as any, results: [] },
      speedupRatio: 1.0,
      meanTimeDeltaMs: 0,
      throughputDeltaPercent: 0,
      workerTimeDeltaMs: 0,
      memoryDeltaBytes: 0,
      algorithmDiffs: [
        {
          cipherId: "sha256",
          cipherName: "SHA-256",
          category: "hash",
          resultA: null,
          resultB: null,
          opsPerSecA: null,
          opsPerSecB: null,
          opsPerSecDeltaPercent: null,
          avgTimeA: null,
          avgTimeB: null,
          avgTimeDeltaMs: null,
          speedupFactor: null,
          status: "missing",
        },
      ],
    };

    const { result } = renderHook(() => useChartData(mockDelta));

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toEqual({
      name: "SHA-256",
      category: "hash",
      sessionA_ops: 0,
      sessionB_ops: 0,
      sessionA_time: 0,
      sessionB_time: 0,
      sessionA_worker: 0,
      sessionB_worker: 0,
      sessionA_memory: 0,
      sessionB_memory: 0,
      speedup: 1,
    });
  });
});
