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
      result += hex[(randomValues[i] >> 4) & 0xf] + hex[randomValues[i] & 0xf]
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
 * Payload sizes for scaling benchmark sweeps
 */
export const SCALING_PAYLOAD_SIZES = [
  { label: '64 B', value: 64 },
  { label: '256 B', value: 256 },
  { label: '1 KB', value: 1024 },
  { label: '16 KB', value: 16384 },
  { label: '64 KB', value: 65536 },
  { label: '256 KB', value: 262144 },
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

/**
 * Calculate throughput in MB/s from time and input size
 */
export function calculateThroughput(inputSize: number, averageTime: number): number {
  if (averageTime <= 0) return 0
  const sizeInMB = inputSize / (1024 * 1024)
  const timeInSeconds = averageTime / 1000
  return sizeInMB / timeInSeconds
}

/**
 * Estimate algorithmic complexity from scaling data
 */
export function estimateComplexity(
  data: Array<{ payloadSize: number; averageTime: number }>
): "O(1)" | "O(n)" | "O(n log n)" | "O(n²)" | "O(n³)" {
  if (data.length < 2) return "O(n)"

  // Sort by payload size
  const sorted = [...data].sort((a, b) => a.payloadSize - b.payloadSize)

  // Calculate ratios between successive points
  const ratios: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const sizeRatio = sorted[i].payloadSize / sorted[i - 1].payloadSize
    const timeRatio = sorted[i].averageTime / sorted[i - 1].averageTime
    if (sizeRatio > 0 && timeRatio > 0) {
      ratios.push(timeRatio / sizeRatio)
    }
  }

  if (ratios.length === 0) return "O(n)"

  const avgRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length

  // Heuristic classification based on how time scales with input size
  if (avgRatio < 0.5) return "O(1)" // Constant time
  if (avgRatio < 1.5) return "O(n)" // Linear
  if (avgRatio < 3) return "O(n log n)" // Near-linear
  if (avgRatio < 10) return "O(n²)" // Quadratic
  return "O(n³)" // Cubic or worse
}

/**
 * Run scaling benchmark for a single cipher across multiple payload sizes
 */
export async function runScalingBenchmark(
  cipherId: string,
  payloadSizes: number[],
  iterations: number,
  runCipher: (direction: "encrypt" | "decrypt", cipherId: string, input: string, key: string, options?: Record<string, unknown>) => Promise<any>,
  getBenchmarkParams: (cipherId: string, category: string, inputSize: number, defaultKey: string) => { input: string; key: string; options: Record<string, unknown> },
  onProgress?: (current: number, total: number, currentSize: number) => void
): Promise<Array<{ payloadSize: number; averageTime: number; throughput: number; operationsPerSecond: number }>> {
  const cipherDef = CIPHER_REGISTRY.find((c) => c.id === cipherId)
  if (!cipherDef) {
    throw new Error(`Cipher not found: ${cipherId}`)
  }

  const results: Array<{ payloadSize: number; averageTime: number; throughput: number; operationsPerSecond: number }> = []

  for (let i = 0; i < payloadSizes.length; i++) {
    const payloadSize = payloadSizes[i]
    if (onProgress) {
      onProgress(i + 1, payloadSizes.length, payloadSize)
    }

    const cipherMeasurements: number[] = []
    const { input, key, options } = getBenchmarkParams(
      cipherId,
      cipherDef.category,
      payloadSize,
      cipherDef.defaultKey,
    )

    // Warm-up
    try {
      await runCipher("encrypt", cipherId, input, key, {
        ...options,
        bypassCache: true,
      })
    } catch {
      // Warm-up failures are handled by the measured iterations
    }

    // Actual measurements
    for (let iteration = 0; iteration < iterations; iteration++) {
      try {
        const result = await runCipher("encrypt", cipherId, input, key, {
          ...options,
          bypassCache: true,
        })
        cipherMeasurements.push(BenchmarkEngine.measureCipherTime(result))
      } catch (iterationError) {
        console.error(
          `Iteration ${iteration + 1} failed for ${cipherId} at ${payloadSize} bytes:`,
          iterationError,
        )
      }
    }

    if (cipherMeasurements.length > 0) {
      const stats = BenchmarkEngine.calculateStats(cipherMeasurements)
      const throughput = calculateThroughput(payloadSize, stats.average)
      const operationsPerSecond = stats.average > 0 ? 1000 / stats.average : 0

      results.push({
        payloadSize,
        averageTime: stats.average,
        throughput,
        operationsPerSecond,
      })
    }

    // Yield to event loop to prevent UI freezing, especially for large payloads
    await new Promise((resolve) => setTimeout(resolve, 10))
  }

  return results
}