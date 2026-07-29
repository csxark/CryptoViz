import { BenchmarkResult } from '@/types/benchmark'
import { CIPHER_REGISTRY } from '@/lib/cipher/registry'
import { CipherResult } from '@/lib/cipher/types'

/**
 * Checks if WebCrypto API is available in the current browser environment.
 */
export function isWebCryptoSupported(): boolean {
  return typeof window !== 'undefined' && !!window.crypto && !!window.crypto.subtle
}

/**
 * Core benchmarking engine - Note: Must be used with useCipherWorker hook in components
 */
export class BenchmarkEngine {
  /**
   * Generates random input data
   */
  static generateInput(sizeInBytes: number): string {
    if (sizeInBytes <= 0) {
      throw new Error('sizeInBytes must be greater than 0')
    }

    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()'
    const randomValues = new Uint32Array(sizeInBytes)
    crypto.getRandomValues(randomValues)

    let result = ''

    for (let i = 0; i < sizeInBytes; i += 1) {
      result += chars[randomValues[i] % chars.length]
    }

    return result
  }

  /**
   * Generates random key for cipher
   */
  static generateKey(lengthInBytes: number): string {
    if (lengthInBytes <= 0) {
      throw new Error('lengthInBytes must be greater than 0')
    }

    const hex = '0123456789abcdef'
    const randomValues = new Uint8Array(lengthInBytes)
    crypto.getRandomValues(randomValues)

    let result = ''

    for (let i = 0; i < lengthInBytes; i += 1) {
      result += hex[randomValues[i] % hex.length]
    }

    return result
  }

  /**
   * Helper to measure time for cipher execution
   */
  static measureCipherTime(cipherResult: CipherResult): number {
    return cipherResult.durationMs
  }

  /**
   * Calculate statistics from multiple measurements
   */
  static calculateStats(measurements: number[]): {
    average: number
    min: number
    max: number
    median: number
    p95: number
    p99: number
    variance: number
    stdDev: number
  } {
    if (!measurements || measurements.length === 0) {
      throw new Error('Measurement array cannot be empty')
    }

    if (measurements.some((m) => !Number.isFinite(m) || m < 0)) {
      throw new Error('Measurement values must be valid non-negative numbers')
    }

    const sorted = [...measurements].sort((a, b) => a - b)
    const average =
      measurements.reduce((a, b) => a + b, 0) / measurements.length
    const min = sorted[0]
    const max = sorted[sorted.length - 1]

    const middle = Math.floor(sorted.length / 2)
    const median =
      sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle]

    const p95 =
      sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
    const p99 =
      sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))]
    const variance =
      measurements.reduce(
        (sum, value) => sum + Math.pow(value - average, 2),
        0,
      ) / measurements.length
    const stdDev = Math.sqrt(variance)

    return {
      average,
      min,
      max,
      median,
      p95,
      p99,
      variance,
      stdDev,
    }
  }

  /**
   * Analyze and create benchmark result from measurements
   */
  static createBenchmarkResult(
    cipherId: string,
    measurements: number[],
    inputSize: number,
    iterations: number,
  ): BenchmarkResult {
    if (inputSize <= 0) {
      throw new Error('inputSize must be greater than 0')
    }

    if (iterations <= 0) {
      throw new Error('iterations must be greater than 0')
    }

    if (!measurements || measurements.length === 0) {
      throw new Error('Measurement array cannot be empty')
    }

    const cipherDef = CIPHER_REGISTRY.find((c) => c.id === cipherId)

    if (!cipherDef) {
      throw new Error(`Cipher not found: ${cipherId}`)
    }

    const stats = this.calculateStats(measurements)
    const totalTime = measurements.reduce((a, b) => a + b, 0)
    const operationsPerSecond =
      stats.average > 0 ? 1000 / stats.average : 0

    return {
      cipherId,
      cipherName: cipherDef.name,
      category: cipherDef.category,
      inputSize,
      direction: cipherDef.category === 'hash' ? 'hash' : 'encrypt',
      iterations,
      averageTime: stats.average,
      minTime: stats.min,
      maxTime: stats.max,
      stdDev: stats.stdDev,
      totalTime,
      operationsPerSecond,
      timestamp: new Date(),
    }
  }
}

/**
 * Calculate comparison metrics
 */
export function calculateComparison(results: BenchmarkResult[]): {
  fastest: BenchmarkResult
  slowest: BenchmarkResult
  speedupRatio: number
} {
  if (!results || results.length === 0) {
    throw new Error('Benchmark results cannot be empty')
  }

  const fastest = results.reduce((prev, current) =>
    current.averageTime < prev.averageTime ? current : prev,
  )

  const slowest = results.reduce((prev, current) =>
    current.averageTime > prev.averageTime ? current : prev,
  )

  const speedupRatio =
    fastest.averageTime > 0
      ? slowest.averageTime / fastest.averageTime
      : 0

  return {
    fastest,
    slowest,
    speedupRatio,
  }
}

/**
 * Get supported input sizes for scalability testing
 */
export const PRESET_INPUT_SIZES = [
  { label: '1 KB', value: 1024 },
  { label: '10 KB', value: 10240 },
  { label: '100 KB', value: 102400 },
  { label: '1 MB', value: 1048576 },
]

/**
 * Get preset iteration counts
 */
export const PRESET_ITERATIONS = [
  { label: 'Quick (10)', value: 10 },
  { label: 'Standard (100)', value: 100 },
  { label: 'Thorough (500)', value: 500 },
  { label: 'Comprehensive (1000)', value: 1000 },
]