import { describe, expect, it } from "vitest";
import {
  reviveDateFields,
  reviveBenchmarkSession,
  reviveScalingResult,
} from "@/lib/utils/dateReviver";
import type { BenchmarkSession, ScalingBenchmarkResult } from "@/types/benchmark";

describe("dateReviver utilities", () => {
  describe("reviveDateFields", () => {
    it("converts ISO date strings to Date instances", () => {
      const input = {
        name: "test",
        createdAt: "2026-08-22T10:00:00.000Z",
        updatedAt: "2026-08-22T12:00:00.000Z",
      };

      const result = reviveDateFields(input, ["createdAt", "updatedAt"]);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.createdAt.toISOString()).toBe("2026-08-22T10:00:00.000Z");
      expect(result.updatedAt.toISOString()).toBe("2026-08-22T12:00:00.000Z");
      expect(result.name).toBe("test");
    });

    it("converts timestamp numbers to Date instances", () => {
      const timestamp = 1787308800000;
      const input = { timestamp };

      const result = reviveDateFields(input, ["timestamp"]);

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBe(timestamp);
    });

    it("keeps existing Date instances intact", () => {
      const now = new Date();
      const input = { createdAt: now };

      const result = reviveDateFields(input, ["createdAt"]);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.createdAt.getTime()).toBe(now.getTime());
    });

    it("handles undefined or null date fields gracefully", () => {
      const input = {
        name: "test",
        createdAt: undefined,
        updatedAt: null,
      };

      const result = reviveDateFields(input, ["createdAt", "updatedAt"]);

      expect(result.createdAt).toBeUndefined();
      expect(result.updatedAt).toBeNull();
      expect(result.name).toBe("test");
    });

    it("returns null or non-object inputs as-is", () => {
      expect(reviveDateFields(null as any, ["createdAt"])).toBeNull();
      expect(reviveDateFields(undefined as any, ["createdAt"])).toBeUndefined();
      expect(reviveDateFields("string" as any, ["createdAt"])).toBe("string");
    });
  });

  describe("reviveBenchmarkSession", () => {
    it("revives timestamp fields in benchmark session and nested results", () => {
      const rawSession = {
        id: "session-123",
        timestamp: "2026-08-22T10:00:00.000Z" as unknown as Date,
        deviceInfo: {
          userAgent: "Vitest Runner",
          hardwareConcurrency: 8,
          language: "en",
          platform: "Win32",
          timezone: "UTC",
          screen: { width: 1920, height: 1080, colorDepth: 24, pixelDepth: 24 },
        },
        results: [
          {
            cipherId: "aes",
            cipherName: "AES-GCM",
            category: "symmetric" as const,
            inputSize: 1024,
            direction: "encrypt" as const,
            iterations: 100,
            averageTime: 1.2,
            minTime: 1.0,
            maxTime: 1.5,
            stdDev: 0.1,
            totalTime: 120,
            operationsPerSecond: 833.33,
            timestamp: "2026-08-22T10:01:00.000Z" as unknown as Date,
          },
        ],
      } as BenchmarkSession;

      const revived = reviveBenchmarkSession(rawSession);

      expect(revived.timestamp).toBeInstanceOf(Date);
      expect(revived.timestamp.toISOString()).toBe("2026-08-22T10:00:00.000Z");
      expect(revived.results[0].timestamp).toBeInstanceOf(Date);
      expect(revived.results[0].timestamp.toISOString()).toBe("2026-08-22T10:01:00.000Z");
      expect(revived.id).toBe("session-123");
    });

    it("handles sessions with missing or non-array results gracefully", () => {
      const rawSession = {
        id: "session-456",
        timestamp: "2026-08-22T10:00:00.000Z" as unknown as Date,
        deviceInfo: {
          userAgent: "Test",
          hardwareConcurrency: 4,
          language: "en",
          platform: "Linux",
          timezone: "UTC",
          screen: { width: 800, height: 600, colorDepth: 24, pixelDepth: 24 },
        },
        results: null as unknown as [],
      } as BenchmarkSession;

      const revived = reviveBenchmarkSession(rawSession);

      expect(revived.timestamp).toBeInstanceOf(Date);
      expect(revived.results).toEqual([]);
    });

    it("returns falsy session as-is", () => {
      expect(reviveBenchmarkSession(null as any)).toBeNull();
      expect(reviveBenchmarkSession(undefined as any)).toBeUndefined();
    });
  });

  describe("reviveScalingResult", () => {
    it("revives timestamp on ScalingBenchmarkResult", () => {
      const rawResult = {
        cipherId: "chacha20",
        cipherName: "ChaCha20",
        category: "symmetric" as const,
        results: [
          {
            payloadSize: 1024,
            averageTime: 0.5,
            throughput: 2.048,
            operationsPerSecond: 2000,
          },
        ],
        estimatedComplexity: "O(n)" as const,
        timestamp: "2026-08-22T11:00:00.000Z" as unknown as Date,
      } as ScalingBenchmarkResult;

      const revived = reviveScalingResult(rawResult);

      expect(revived.timestamp).toBeInstanceOf(Date);
      expect(revived.timestamp.toISOString()).toBe("2026-08-22T11:00:00.000Z");
      expect(revived.cipherId).toBe("chacha20");
    });

    it("returns falsy scaling result as-is", () => {
      expect(reviveScalingResult(null as any)).toBeNull();
      expect(reviveScalingResult(undefined as any)).toBeUndefined();
    });
  });
});
