/**
 * Core performance profiling engine for cipher operations.
 * Provides high-precision timing and memory measurement capabilities.
 */

import type {
  PerformanceProfile,
  PerformanceMetrics,
  ExecutionTimeMetrics,
  MemoryMetrics,
  ThroughputMetrics,
  EnvironmentInfo,
  ProfilingOptions,
} from './types'
import { formatBytes } from '@/lib/formatters'

export class PerformanceProfiler {
  private static readonly DEFAULT_OPTIONS: Required<ProfilingOptions> = {
    iterations: 100,
    warmupIterations: 5,
    inputSize: 1024,
    collectMemory: true,
    collectThroughput: true,
    collectLatency: true,
    timeoutMs: 30000,
  }

  /**
   * Get current environment information
   */
  static async getEnvironmentInfo(): Promise<EnvironmentInfo> {
    const isNode = typeof process !== 'undefined' && process.versions?.node

    if (isNode) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const os = await import('node:os')
        return {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          cpuCount: process.env?.UV_THREADPOOL_SIZE
            ? parseInt(process.env.UV_THREADPOOL_SIZE, 10)
            : (os.cpus()?.length || 1),
          totalMemory: os.totalmem(),
          runtime: 'node',
        }
      } catch {
        // Fallback if os module is not available
        return {
          nodeVersion: process.version,
          platform: process.platform || 'unknown',
          arch: process.arch || 'unknown',
          cpuCount: 1,
          totalMemory: 8 * 1024 * 1024 * 1024,
          runtime: 'node',
        }
      }
    }

    return {
      platform: navigator.platform,
      arch: this.detectArch(),
      cpuCount: navigator.hardwareConcurrency || 1,
      totalMemory: this.estimateBrowserMemory(),
      runtime: 'browser',
      userAgent: navigator.userAgent,
    }
  }

  /**
   * Detect browser architecture
   */
  private static detectArch(): string {
    const ua = navigator.userAgent
    if (ua.includes('x86_64') || ua.includes('x86-64') || ua.includes('Win64')) return 'x64'
    if (ua.includes('arm64') || ua.includes('aarch64')) return 'arm64'
    if (ua.includes('i686') || ua.includes('i386')) return 'x86'
    if (ua.includes('arm')) return 'arm'
    return 'unknown'
  }

  private static estimateBrowserMemory(): number {
    // Conservative estimate for browser memory
    return 8 * 1024 * 1024 * 1024 // 8GB
  }

  /**
   * Measure execution time with high precision
   */
  static measureExecutionTime(
    fn: () => void | Promise<void>,
    iterations: number,
  ): Promise<number[]> {
    const measurements: number[] = []

    const runIteration = async (): Promise<number> => {
      const start = performance.now()
      await fn()
      const end = performance.now()
      return end - start
    }

    return (async () => {
      for (let i = 0; i < iterations; i++) {
        const duration = await runIteration()
        measurements.push(duration)
      }
      return measurements
    })()
  }

  /**
   * Measure memory usage during execution
   */
  static measureMemoryUsage(
    fn: () => void | Promise<void>,
    iterations: number,
  ): Promise<number[]> {
    const measurements: number[] = []

    const getMemoryUsage = (): number => {
      // Browser memory API
      if (typeof performance !== 'undefined' && 'memory' in performance && (performance as { memory?: { usedJSHeapSize?: number } }).memory) {
        return (performance as { memory: { usedJSHeapSize?: number } }).memory.usedJSHeapSize || 0
      }
      // Node.js memory API
      if (typeof process !== 'undefined' && process.memoryUsage) {
        try {
          return process.memoryUsage().heapUsed
        } catch {
          return 0
        }
      }
      return 0
    }

    const runIteration = async (): Promise<number> => {
      const before = getMemoryUsage()
      await fn()
      const after = getMemoryUsage()
      // Force garbage collection if available (Node.js with --expose-gc)
      try {
        const globalWithGc = global as { gc?: () => void }
        if (typeof globalWithGc.gc === 'function') {
          globalWithGc.gc()
        }
      } catch {
        // Ignore if gc is not available
      }
      return Math.max(0, after - before)
    }

    return (async () => {
      for (let i = 0; i < iterations; i++) {
        const delta = await runIteration()
        measurements.push(delta)
      }
      return measurements
    })()
  }

  /**
   * Calculate execution time statistics
   */
  static calculateExecutionTimeMetrics(measurements: number[]): ExecutionTimeMetrics {
    if (measurements.length === 0) {
      throw new Error('No measurements provided')
    }

    const sorted = [...measurements].sort((a, b) => a - b)
    const sum = measurements.reduce((a, b) => a + b, 0)
    const average = sum / measurements.length
    const min = sorted[0]
    const max = sorted[sorted.length - 1]

    const middle = Math.floor(sorted.length / 2)
    const median =
      sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle]

    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
    const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))]

    const variance = measurements.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / measurements.length
    const stdDev = Math.sqrt(variance)

    return {
      averageMs: average,
      minMs: min,
      maxMs: max,
      medianMs: median,
      p95Ms: p95,
      p99Ms: p99,
      stdDevMs: stdDev,
      totalMs: sum,
    }
  }

  /**
   * Calculate memory usage statistics
   */
  static calculateMemoryMetrics(measurements: number[], baseline: number): MemoryMetrics {
    if (measurements.length === 0) {
      return {
        averageBytes: 0,
        minBytes: 0,
        maxBytes: 0,
        peakBytes: baseline,
        baselineBytes: baseline,
      }
    }

    const sorted = [...measurements].sort((a, b) => a - b)
    const sum = measurements.reduce((a, b) => a + b, 0)
    const average = sum / measurements.length

    return {
      averageBytes: average,
      minBytes: sorted[0],
      maxBytes: sorted[sorted.length - 1],
      peakBytes: baseline + sorted[sorted.length - 1],
      baselineBytes: baseline,
    }
  }

  /**
   * Calculate throughput metrics
   */
  static calculateThroughputMetrics(
    totalBytes: number,
    totalTimeMs: number,
    operations: number,
  ): ThroughputMetrics {
    const bytesPerSecond = totalTimeMs > 0 ? (totalBytes * 1000) / totalTimeMs : 0
    const operationsPerSecond = totalTimeMs > 0 ? (operations * 1000) / totalTimeMs : 0

    let formatted = `${this.formatBytes(bytesPerSecond)}/s`
    if (operationsPerSecond > 1000) {
      formatted += `, ${(operationsPerSecond / 1000).toFixed(2)}k ops/s`
    } else {
      formatted += `, ${operationsPerSecond.toFixed(0)} ops/s`
    }

    return {
      bytesPerSecond,
      operationsPerSecond,
      formatted,
    }
  }

  /**
   * Calculate latency metrics
   */
  static calculateLatencyMetrics(executionTimeMetrics: ExecutionTimeMetrics): LatencyMetrics {
    return {
      averageMs: executionTimeMetrics.averageMs,
      p95Ms: executionTimeMetrics.p95Ms,
      p99Ms: executionTimeMetrics.p99Ms,
    }
  }

  /**
   * Format bytes to human-readable string
   */
  static formatBytes(bytes: number): string {
    return formatBytes(bytes, '0 B')
  }

  /**
   * Merge all metrics into a complete PerformanceMetrics object
   */
  static mergeMetrics(
    executionTimeMetrics: ExecutionTimeMetrics,
    memoryMetrics: MemoryMetrics,
    throughputMetrics?: ThroughputMetrics,
    latencyMetrics?: LatencyMetrics,
  ): PerformanceMetrics {
    const metrics: PerformanceMetrics = {
      executionTime: executionTimeMetrics,
      memoryUsage: memoryMetrics,
    }

    if (throughputMetrics) {
      metrics.throughput = throughputMetrics
    }

    if (latencyMetrics) {
      metrics.latency = latencyMetrics
    }

    return metrics
  }

  /**
   * Run a complete performance profile with warmup
   */
  static async profile(
    cipherId: string,
    cipherName: string,
    category: 'classical' | 'symmetric' | 'asymmetric' | 'hash',
    operation: 'encrypt' | 'decrypt' | 'hash',
    fn: () => void | Promise<void>,
    inputSize: number,
    options: Partial<ProfilingOptions> = {},
  ): Promise<PerformanceProfile> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options }

    // Warmup phase
    for (let i = 0; i < opts.warmupIterations; i++) {
      await fn()
    }

    // Force garbage collection if available
    try {
      const globalWithGc = global as { gc?: () => void }
      if (typeof globalWithGc.gc === 'function') {
        globalWithGc.gc()
      }
    } catch {
      // Ignore if gc is not available
    }

    const environment = await this.getEnvironmentInfo()

    // Collect baseline memory
    const baselineMemory = this.getBaselineMemory()

    // Measure execution time
    const timeMeasurements = await this.measureExecutionTime(fn, opts.iterations)

    // Measure memory usage if requested
    let memoryMeasurements: number[] = []
    if (opts.collectMemory) {
      memoryMeasurements = await this.measureMemoryUsage(fn, opts.iterations)
    }

    // Calculate metrics
    const executionTimeMetrics = this.calculateExecutionTimeMetrics(timeMeasurements)
    const memoryMetrics = this.calculateMemoryMetrics(memoryMeasurements, baselineMemory)

    let throughputMetrics: ThroughputMetrics | undefined
    if (opts.collectThroughput) {
      throughputMetrics = this.calculateThroughputMetrics(
        inputSize * opts.iterations,
        executionTimeMetrics.totalMs,
        opts.iterations,
      )
    }

    let latencyMetrics: LatencyMetrics | undefined
    if (opts.collectLatency) {
      latencyMetrics = this.calculateLatencyMetrics(executionTimeMetrics)
    }

    const metrics = this.mergeMetrics(executionTimeMetrics, memoryMetrics, throughputMetrics, latencyMetrics)

    return {
      cipherId,
      cipherName,
      category,
      timestamp: new Date(),
      environment,
      metrics,
      operation,
      inputSize,
      iterations: opts.iterations,
    }
  }

  /**
   * Get baseline memory
   */
  private static getBaselineMemory(): number {
    // Browser memory API
    if (typeof performance !== 'undefined' && 'memory' in performance && (performance as { memory?: { usedJSHeapSize?: number } }).memory) {
      return (performance as { memory: { usedJSHeapSize?: number } }).memory.usedJSHeapSize || 0
    }
    // Node.js memory API
    if (typeof process !== 'undefined' && process.memoryUsage) {
      try {
        return process.memoryUsage().heapUsed
      } catch {
        return 0
      }
    }
    return 0
  }
}
