/* eslint-disable */
// @ts-nocheck
/**
 * Unit tests for PerformanceProfiler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PerformanceProfiler } from '@/lib/performance/profiler'
import type { ProfilingOptions } from '@/lib/performance/types'

describe('PerformanceProfiler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getEnvironmentInfo', () => {
    it('should return environment info in Node.js', () => {
      const env = PerformanceProfiler.getEnvironmentInfo()
      
      expect(env).toHaveProperty('runtime')
      expect(env).toHaveProperty('platform')
      expect(env).toHaveProperty('arch')
      expect(env).toHaveProperty('cpuCount')
      expect(env).toHaveProperty('totalMemory')
      expect(env.runtime).toBe('node')
    })

    it('should return browser environment info when in browser', () => {
      // Skip this test in Node.js environment
      if (typeof process !== 'undefined' && process.versions?.node) {
        return
      }

      // Mock browser environment
      const originalWindow = global.window
      const originalNavigator = global.navigator
      
      // @ts-expect-error - Mocking browser environment
      delete global.window
      // @ts-expect-error - Mocking browser environment
      delete global.navigator
      
      // @ts-expect-error - Mocking browser environment
      global.window = {}
      // @ts-expect-error - Mocking browser environment
      global.navigator = {
        platform: 'MacIntel',
        hardwareConcurrency: 8,
        userAgent: 'Mozilla/5.0',
      }

      const env = PerformanceProfiler.getEnvironmentInfo()
      
      expect(env.runtime).toBe('browser')
      expect(env.platform).toBe('MacIntel')
      expect(env.cpuCount).toBe(8)
      
      // Restore
      global.window = originalWindow
      global.navigator = originalNavigator
    })
  })

  describe('measureExecutionTime', () => {
    it('should measure execution time for synchronous function', async () => {
      const fn = () => {
        let current = 0
        for (let i = 0; i < 1000; i++) {
          current += i
        }
      }

      const measurements = await PerformanceProfiler.measureExecutionTime(fn, 10)
      
      expect(measurements).toHaveLength(10)
      expect(measurements.every((m) => m >= 0)).toBe(true)
    })

    it('should measure execution time for async function', async () => {
      const fn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 1))
      }

      const measurements = await PerformanceProfiler.measureExecutionTime(fn, 5)
      
      expect(measurements).toHaveLength(5)
      expect(measurements.every((m) => m >= 0)).toBe(true)
    })

    it('should handle zero iterations', async () => {
      const fn = () => {}
      const measurements = await PerformanceProfiler.measureExecutionTime(fn, 0)
      
      expect(measurements).toHaveLength(0)
    })
  })

  describe('calculateExecutionTimeMetrics', () => {
    it('should calculate correct statistics', () => {
      const measurements = [10, 20, 30, 40, 50]
      const stats = PerformanceProfiler.calculateExecutionTimeMetrics(measurements)
      
      expect(stats.averageMs).toBe(30)
      expect(stats.minMs).toBe(10)
      expect(stats.maxMs).toBe(50)
      expect(stats.medianMs).toBe(30)
      expect(stats.stdDevMs).toBeGreaterThan(0)
    })

    it('should throw error for empty measurements', () => {
      expect(() => {
        PerformanceProfiler.calculateExecutionTimeMetrics([])
      }).toThrow('No measurements provided')
    })

    it('should handle single measurement', () => {
      const measurements = [42]
      const metrics = PerformanceProfiler.calculateExecutionTimeMetrics(measurements)
      
      expect(metrics.averageMs).toBe(42)
      expect(metrics.minMs).toBe(42)
      expect(metrics.maxMs).toBe(42)
      expect(metrics.medianMs).toBe(42)
    })
  })

  describe('calculateMemoryMetrics', () => {
    it('should calculate memory statistics', () => {
      const measurements = [100, 200, 300, 400, 500]
      const baseline = 1000
      const metrics = PerformanceProfiler.calculateMemoryMetrics(measurements, baseline)
      
      expect(metrics.averageBytes).toBe(300)
      expect(metrics.minBytes).toBe(100)
      expect(metrics.maxBytes).toBe(500)
      expect(metrics.peakBytes).toBe(1500)
      expect(metrics.baselineBytes).toBe(1000)
    })

    it('should handle empty measurements', () => {
      const metrics = PerformanceProfiler.calculateMemoryMetrics([], 1000)
      
      expect(metrics.averageBytes).toBe(0)
      expect(metrics.peakBytes).toBe(1000)
      expect(metrics.baselineBytes).toBe(1000)
    })
  })

  describe('calculateThroughputMetrics', () => {
    it('should calculate throughput correctly', () => {
      const metrics = PerformanceProfiler.calculateThroughputMetrics(1024 * 100, 1000, 100)
      
      expect(metrics.bytesPerSecond).toBe(102400)
      expect(metrics.operationsPerSecond).toBe(100)
      expect(metrics.formatted).toContain('100.00 KB/s')
    })

    it('should handle zero time', () => {
      const metrics = PerformanceProfiler.calculateThroughputMetrics(1024, 0, 10)
      
      expect(metrics.bytesPerSecond).toBe(0)
      expect(metrics.operationsPerSecond).toBe(0)
    })
  })

  describe('calculateLatencyMetrics', () => {
    it('should calculate latency from execution time metrics', () => {
      const execMetrics = {
        averageMs: 10,
        minMs: 5,
        maxMs: 20,
        medianMs: 10,
        p95Ms: 15,
        p99Ms: 18,
        stdDevMs: 3,
        totalMs: 100,
      }
      
      const latencyMetrics = PerformanceProfiler.calculateLatencyMetrics(execMetrics)
      
      expect(latencyMetrics.averageMs).toBe(10)
      expect(latencyMetrics.p95Ms).toBe(15)
      expect(latencyMetrics.p99Ms).toBe(18)
    })
  })

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(PerformanceProfiler.formatBytes(0)).toBe('0 B')
      expect(PerformanceProfiler.formatBytes(1024)).toBe('1.00 KB')
      expect(PerformanceProfiler.formatBytes(1024 * 1024)).toBe('1.00 MB')
      expect(PerformanceProfiler.formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB')
    })

    it('should handle decimal values', () => {
      expect(PerformanceProfiler.formatBytes(1536)).toBe('1.50 KB')
      expect(PerformanceProfiler.formatBytes(1536 * 1024)).toBe('1.50 MB')
    })
  })

  describe('profile', () => {
    it('should create a complete performance profile', async () => {
      const testFn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 1))
      }

      const profile = await PerformanceProfiler.profile(
        'test-cipher',
        'Test Cipher',
        'symmetric',
        'encrypt',
        testFn,
        1024,
        { iterations: 5, warmupIterations: 1 },
      )

      expect(profile.cipherId).toBe('test-cipher')
      expect(profile.cipherName).toBe('Test Cipher')
      expect(profile.category).toBe('symmetric')
      expect(profile.operation).toBe('encrypt')
      expect(profile.inputSize).toBe(1024)
      expect(profile.iterations).toBe(5)
      expect(profile.metrics).toHaveProperty('executionTime')
      expect(profile.metrics).toHaveProperty('memoryUsage')
      expect(profile.environment).toHaveProperty('runtime')
    })

    it('should respect custom options', async () => {
      const testFn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 1))
      }

      const options: Partial<ProfilingOptions> = {
        iterations: 20,
        warmupIterations: 3,
        collectMemory: false,
        collectThroughput: false,
        collectLatency: false,
      }

      const profile = await PerformanceProfiler.profile(
        'test-cipher',
        'Test Cipher',
        'symmetric',
        'encrypt',
        testFn,
        512,
        options,
      )

      expect(profile.iterations).toBe(20)
      expect(profile.metrics.throughput).toBeUndefined()
      expect(profile.metrics.latency).toBeUndefined()
    })

    it('should include throughput when enabled', async () => {
      const testFn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 1))
      }

      const profile = await PerformanceProfiler.profile(
        'test-cipher',
        'Test Cipher',
        'symmetric',
        'encrypt',
        testFn,
        2048,
        { iterations: 5, collectThroughput: true },
      )

      expect(profile.metrics.throughput).toBeDefined()
      expect(profile.metrics.throughput?.bytesPerSecond).toBeGreaterThan(0)
    })

    it('should include latency when enabled', async () => {
      const testFn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 1))
      }

      const profile = await PerformanceProfiler.profile(
        'test-cipher',
        'Test Cipher',
        'symmetric',
        'encrypt',
        testFn,
        1024,
        { iterations: 5, collectLatency: true },
      )

      expect(profile.metrics.latency).toBeDefined()
      expect(profile.metrics.latency?.averageMs).toBeGreaterThan(0)
    })
  })

  describe('mergeMetrics', () => {
    it('should merge all metrics correctly', () => {
      const execMetrics = {
        averageMs: 10,
        minMs: 5,
        maxMs: 20,
        medianMs: 10,
        p95Ms: 15,
        p99Ms: 18,
        stdDevMs: 3,
        totalMs: 100,
      }

      const memMetrics = {
        averageBytes: 1000,
        minBytes: 500,
        maxBytes: 2000,
        peakBytes: 3000,
        baselineBytes: 1000,
      }

      const throughputMetrics = {
        bytesPerSecond: 102400,
        operationsPerSecond: 100,
        formatted: '100.00 KB/s, 100 ops/s',
      }

      const latencyMetrics = {
        averageMs: 10,
        p95Ms: 15,
        p99Ms: 18,
      }

      const merged = PerformanceProfiler.mergeMetrics(
        execMetrics,
        memMetrics,
        throughputMetrics,
        latencyMetrics,
      )

      expect(merged.executionTime).toEqual(execMetrics)
      expect(merged.memoryUsage).toEqual(memMetrics)
      expect(merged.throughput).toEqual(throughputMetrics)
      expect(merged.latency).toEqual(latencyMetrics)
    })

    it('should merge without optional metrics', () => {
      const execMetrics = {
        averageMs: 10,
        minMs: 5,
        maxMs: 20,
        medianMs: 10,
        p95Ms: 15,
        p99Ms: 18,
        stdDevMs: 3,
        totalMs: 100,
      }

      const memMetrics = {
        averageBytes: 1000,
        minBytes: 500,
        maxBytes: 2000,
        peakBytes: 3000,
        baselineBytes: 1000,
      }

      const merged = PerformanceProfiler.mergeMetrics(execMetrics, memMetrics)

      expect(merged.executionTime).toEqual(execMetrics)
      expect(merged.memoryUsage).toEqual(memMetrics)
      expect(merged.throughput).toBeUndefined()
      expect(merged.latency).toBeUndefined()
    })
  })
})
