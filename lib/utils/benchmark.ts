import { BenchmarkResult } from '@/types/benchmark'
import { CIPHER_REGISTRY } from '@/lib/cipher/registry'
import { CipherResult } from '@/lib/cipher/types'

/**
 * Core benchmarking engine - Note: Must be used with useCipherWorker hook in components
 */
export class BenchmarkEngine {
  /**
   * Generates random input data
   */
  static generateInput(sizeInBytes: number): string {
    const chars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()'

const randomValues = new Uint32Array(sizeInBytes)
crypto.getRandomValues(randomValues)

let result = ''

for (let i = 0; i < sizeInBytes; i++) {
  result += chars[randomValues[i] % chars.length]
}

return result
  }
  /**
   * Generates random key for cipher
   */
  static generateKey(lengthInBytes: number): string {
    const hex = '0123456789abcdef'

const randomValues = new Uint8Array(lengthInBytes)
crypto.getRandomValues(randomValues)

let result = ''

for (let i = 0; i < lengthInBytes; i++) {
  result += hex[randomValues[i] % hex.length]
}

return result
    return result
  }

  /**
   * Helper to measure time for cipher execution
   * This measures ONLY the cipher execution time, not including worker overhead
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
    stdDev: number
  } {
    const average = measurements.reduce((a, b) => a + b, 0) / measurements.length
    const min = Math.min(...measurements)
    const max = Math.max(...measurements)
    
    const variance = measurements.reduce((sum, m) => sum + Math.pow(m - average, 2), 0) / measurements.length
    const stdDev = Math.sqrt(variance)

    return { average, min, max, stdDev }
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
    const cipherDef = CIPHER_REGISTRY.find((c) => c.id === cipherId)
    if (!cipherDef) {
      throw new Error(`Cipher not found: ${cipherId}`)
    }

    const stats = this.calculateStats(measurements)
    const totalTime = measurements.reduce((a, b) => a + b, 0)
    const operationsPerSecond = 1000 / stats.average

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
  const fastest = results.reduce((prev, current) =>
    current.averageTime < prev.averageTime ? current : prev,
  )
  const slowest = results.reduce((prev, current) =>
    current.averageTime > prev.averageTime ? current : prev,
  )

  const speedupRatio = slowest.averageTime / fastest.averageTime

  return { fastest, slowest, speedupRatio }
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
