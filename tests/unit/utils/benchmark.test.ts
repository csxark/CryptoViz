import { describe, expect, it, afterEach, vi } from 'vitest'
import {
  BenchmarkEngine,
  isWebCryptoSupported,
  calculateComparison,
  PRESET_INPUT_SIZES,
  PRESET_ITERATIONS,
} from '@/lib/utils/benchmark'
import type { BenchmarkResult } from '@/types/benchmark'

describe('BenchmarkEngine Utility Unit Tests', () => {
  describe('isWebCryptoSupported', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('returns true if window, window.crypto, and window.crypto.subtle are defined', () => {
      vi.stubGlobal('window', {
        crypto: {
          subtle: {},
        },
      })
      expect(isWebCryptoSupported()).toBe(true)
    })

    it('returns false if window is undefined', () => {
      vi.stubGlobal('window', undefined)
      expect(isWebCryptoSupported()).toBe(false)
    })

    it('returns false if window.crypto is undefined', () => {
      vi.stubGlobal('window', {
        crypto: undefined,
      })
      expect(isWebCryptoSupported()).toBe(false)
    })

    it('returns false if window.crypto.subtle is undefined', () => {
      vi.stubGlobal('window', {
        crypto: {
          subtle: undefined,
        },
      })
      expect(isWebCryptoSupported()).toBe(false)
    })
  })

  describe('generateInput', () => {
    it('generates random input strings with the expected length and characters', () => {
      const input = BenchmarkEngine.generateInput(16)
      expect(input).toHaveLength(16)
      expect(input).toMatch(/^[A-Za-z0-9!@#$%^&*()]+$/)
    })

    it('handles boundary size of 1 correctly', () => {
      const input = BenchmarkEngine.generateInput(1)
      expect(input).toHaveLength(1)
      expect(input).toMatch(/^[A-Za-z0-9!@#$%^&*()]+$/)
    })

    it('handles very large sizes correctly', () => {
      const size = 10000
      const input = BenchmarkEngine.generateInput(size)
      expect(input).toHaveLength(size)
    })

    it('rejects size of 0 and negative sizes', () => {
      expect(() => BenchmarkEngine.generateInput(0)).toThrow(
        'sizeInBytes must be greater than 0',
      )
      expect(() => BenchmarkEngine.generateInput(-5)).toThrow(
        'sizeInBytes must be greater than 0',
      )
    })
  })

  describe('generateKey', () => {
    it('generates random hex key strings with the expected length', () => {
      const key = BenchmarkEngine.generateKey(8)
      expect(key).toHaveLength(8)
      expect(key).toMatch(/^[0-9a-f]+$/)
    })

    it('handles boundary length of 1 correctly', () => {
      const key = BenchmarkEngine.generateKey(1)
      expect(key).toHaveLength(1)
      expect(key).toMatch(/^[0-9a-f]+$/)
    })

    it('handles large lengths correctly', () => {
      const length = 1000
      const key = BenchmarkEngine.generateKey(length)
      expect(key).toHaveLength(length)
    })

    it('rejects length of 0 and negative lengths', () => {
      expect(() => BenchmarkEngine.generateKey(0)).toThrow(
        'lengthInBytes must be greater than 0',
      )
      expect(() => BenchmarkEngine.generateKey(-10)).toThrow(
        'lengthInBytes must be greater than 0',
      )
    })
  })

  describe('measureCipherTime', () => {
    it('returns the durationMs from CipherResult', () => {
      const mockResult = {
        durationMs: 45.67,
        ciphertext: 'test-ciphertext',
      }
      expect(BenchmarkEngine.measureCipherTime(mockResult as any)).toBe(45.67)
    })
  })

  describe('calculateStats', () => {
    it('calculates average, min, max, median, p95, p99, variance, stdDev correctly for odd number of elements', () => {
      const measurements = [10, 20, 30, 40, 50]
      const stats = BenchmarkEngine.calculateStats(measurements)

      expect(stats.average).toBe(30)
      expect(stats.min).toBe(10)
      expect(stats.max).toBe(50)
      expect(stats.median).toBe(30)
      expect(stats.p95).toBe(50) // Math.floor(5 * 0.95) = 4, sorted[4] = 50
      expect(stats.p99).toBe(50) // Math.floor(5 * 0.99) = 4, sorted[4] = 50
      expect(stats.variance).toBe(200) // ((10-30)^2 + (20-30)^2 + ...)/5 = 1000/5 = 200
      expect(stats.stdDev).toBeCloseTo(14.1421356, 5)
    })

    it('calculates average, min, max, median, p95, p99, variance, stdDev correctly for even number of elements', () => {
      const measurements = [10, 20, 30, 40]
      const stats = BenchmarkEngine.calculateStats(measurements)

      expect(stats.average).toBe(25)
      expect(stats.min).toBe(10)
      expect(stats.max).toBe(40)
      expect(stats.median).toBe(25) // (20 + 30) / 2 = 25
      expect(stats.p95).toBe(40) // Math.floor(4 * 0.95) = 3, sorted[3] = 40
      expect(stats.p99).toBe(40) // Math.floor(4 * 0.99) = 3, sorted[3] = 40
      expect(stats.variance).toBe(125) // ((10-25)^2 + (20-25)^2 + (30-25)^2 + (40-25)^2)/4 = 500/4 = 125
      expect(stats.stdDev).toBeCloseTo(11.1803398, 5)
    })

    it('handles a single measurement correctly (boundary case)', () => {
      const stats = BenchmarkEngine.calculateStats([15])
      expect(stats.average).toBe(15)
      expect(stats.min).toBe(15)
      expect(stats.max).toBe(15)
      expect(stats.median).toBe(15)
      expect(stats.p95).toBe(15)
      expect(stats.p99).toBe(15)
      expect(stats.variance).toBe(0)
      expect(stats.stdDev).toBe(0)
    })

    it('handles very large measurement arrays correctly (boundary case)', () => {
      const size = 10000
      const largeMeasurements = Array.from({ length: size }, (_, i) => i)
      const stats = BenchmarkEngine.calculateStats(largeMeasurements)
      expect(stats.average).toBe((size - 1) / 2)
      expect(stats.min).toBe(0)
      expect(stats.max).toBe(size - 1)
      expect(stats.median).toBe((size - 1) / 2)
      expect(stats.variance).toBeGreaterThan(0)
      expect(stats.stdDev).toBeGreaterThan(0)
    })

    it('handles repeated values correctly', () => {
      const stats = BenchmarkEngine.calculateStats([10, 10, 10, 10])
      expect(stats.average).toBe(10)
      expect(stats.min).toBe(10)
      expect(stats.max).toBe(10)
      expect(stats.median).toBe(10)
      expect(stats.p95).toBe(10)
      expect(stats.p99).toBe(10)
      expect(stats.variance).toBe(0)
      expect(stats.stdDev).toBe(0)
    })

    it('handles decimal timings and high-precision values correctly', () => {
      const measurements = [0.00012, 0.00034, 0.00056]
      const stats = BenchmarkEngine.calculateStats(measurements)
      expect(stats.average).toBeCloseTo(0.00034, 6)
      expect(stats.min).toBe(0.00012)
      expect(stats.max).toBe(0.00056)
      expect(stats.median).toBe(0.00034)
      expect(stats.stdDev).toBeGreaterThan(0)
    })

    it('throws error for empty measurement arrays and missing values', () => {
      expect(() => BenchmarkEngine.calculateStats([])).toThrow(
        'Measurement array cannot be empty',
      )
      expect(() => BenchmarkEngine.calculateStats(null as any)).toThrow(
        'Measurement array cannot be empty',
      )
      expect(() => BenchmarkEngine.calculateStats(undefined as any)).toThrow(
        'Measurement array cannot be empty',
      )
    })

    it("throws error for measurement arrays containing invalid values (NaN, Infinity, negative, undefined/null inside)", () => {
      expect(() => BenchmarkEngine.calculateStats([10, NaN, 20])).toThrow(
        'Measurement values must be valid non-negative numbers',
      )
      expect(() => BenchmarkEngine.calculateStats([10, Infinity, 20])).toThrow(
        'Measurement values must be valid non-negative numbers',
      )
      expect(() => BenchmarkEngine.calculateStats([10, -5, 20])).toThrow(
        'Measurement values must be valid non-negative numbers',
      )
      expect(() => BenchmarkEngine.calculateStats([10, null as any])).toThrow(
        'Measurement values must be valid non-negative numbers',
      )
    })
  })

  describe('createBenchmarkResult', () => {
    it('generates non-hash benchmark result correctly and preserves metadata/labels', () => {
      const cipherId = 'caesar'
      const measurements = [1.2, 1.4, 1.6]
      const inputSize = 100
      const iterations = 50

      const result = BenchmarkEngine.createBenchmarkResult(
        cipherId,
        measurements,
        inputSize,
        iterations,
      )

      expect(result.cipherId).toBe('caesar')
      expect(result.cipherName).toBe('Caesar Cipher')
      expect(result.category).toBe('classical')
      expect(result.inputSize).toBe(inputSize)
      expect(result.direction).toBe('encrypt')
      expect(result.iterations).toBe(iterations)
      expect(result.averageTime).toBeCloseTo(1.4, 5)
      expect(result.minTime).toBe(1.2)
      expect(result.maxTime).toBe(1.6)
      expect(result.totalTime).toBeCloseTo(4.2, 5)
      expect(result.operationsPerSecond).toBeCloseTo(1000 / 1.4, 5)
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('generates hash benchmark result correctly with direction set to hash', () => {
      const cipherId = 'sha256'
      const measurements = [0.8, 1.0, 1.2]
      const inputSize = 500
      const iterations = 200

      const result = BenchmarkEngine.createBenchmarkResult(
        cipherId,
        measurements,
        inputSize,
        iterations,
      )

      expect(result.cipherId).toBe('sha256')
      expect(result.cipherName).toBe('SHA-256')
      expect(result.category).toBe('hash')
      expect(result.direction).toBe('hash')
    })

    it('handles 0 average time and maps operationsPerSecond to 0', () => {
      const result = BenchmarkEngine.createBenchmarkResult(
        'caesar',
        [0, 0, 0],
        10,
        10,
      )
      expect(result.operationsPerSecond).toBe(0)
    })

    it('supports single measurement boundary case', () => {
      const result = BenchmarkEngine.createBenchmarkResult(
        'caesar',
        [10],
        10,
        1,
      )
      expect(result.averageTime).toBe(10)
      expect(result.minTime).toBe(10)
      expect(result.maxTime).toBe(10)
      expect(result.stdDev).toBe(0)
      expect(result.iterations).toBe(1)
    })

    it('supports maximum iterations boundary case', () => {
      const result = BenchmarkEngine.createBenchmarkResult(
        'caesar',
        [5],
        10,
        1000000,
      )
      expect(result.iterations).toBe(1000000)
    })

    it('rejects invalid inputs (0 or negative sizes/iterations/empty measurements/invalid cipher)', () => {
      expect(() =>
        BenchmarkEngine.createBenchmarkResult('caesar', [1.0], 0, 10),
      ).toThrow('inputSize must be greater than 0')

      expect(() =>
        BenchmarkEngine.createBenchmarkResult('caesar', [1.0], 10, -5),
      ).toThrow('iterations must be greater than 0')

      expect(() =>
        BenchmarkEngine.createBenchmarkResult('caesar', [], 10, 10),
      ).toThrow('Measurement array cannot be empty')

      expect(() =>
        BenchmarkEngine.createBenchmarkResult('invalid-cipher-id', [1.0], 10, 10),
      ).toThrow('Cipher not found: invalid-cipher-id')
    })
  })

  describe('calculateComparison', () => {
    const makeBenchmark = (
      id: string,
      average: number,
    ): BenchmarkResult => ({
      cipherId: id,
      cipherName: id.toUpperCase(),
      category: 'symmetric',
      inputSize: 100,
      direction: 'encrypt',
      iterations: 10,
      averageTime: average,
      minTime: average * 0.9,
      maxTime: average * 1.1,
      stdDev: average * 0.05,
      totalTime: average * 10,
      operationsPerSecond: average > 0 ? 1000 / average : 0,
      timestamp: new Date(),
    })

    it('identifies the fastest and slowest benchmarks and computes speedup ratio', () => {
      const results = [
        makeBenchmark('c1', 10),
        makeBenchmark('c2', 5),
        makeBenchmark('c3', 20),
      ]

      const comparison = calculateComparison(results)
      expect(comparison.fastest.cipherId).toBe('c2')
      expect(comparison.slowest.cipherId).toBe('c3')
      expect(comparison.speedupRatio).toBe(4) // 20 / 5 = 4
    })

    it('handles single benchmark result correctly', () => {
      const results = [makeBenchmark('c1', 12)]
      const comparison = calculateComparison(results)
      expect(comparison.fastest.cipherId).toBe('c1')
      expect(comparison.slowest.cipherId).toBe('c1')
      expect(comparison.speedupRatio).toBe(1)
    })

    it('handles averageTime of 0 gracefully', () => {
      const results = [
        makeBenchmark('c1', 0),
        makeBenchmark('c2', 15),
      ]
      const comparison = calculateComparison(results)
      expect(comparison.fastest.cipherId).toBe('c1')
      expect(comparison.slowest.cipherId).toBe('c2')
      expect(comparison.speedupRatio).toBe(0)
    })

    it('resolves ties by returning the first matching element from reduce', () => {
      const r1 = makeBenchmark('c1', 10)
      const r2 = makeBenchmark('c2', 5)
      const r3 = makeBenchmark('c3', 5) // tied for fastest

      // For fastest: r2 (first 5) should win over r3
      const comparison1 = calculateComparison([r1, r2, r3])
      expect(comparison1.fastest.cipherId).toBe('c2')

      const r4 = makeBenchmark('c4', 20) // tied for slowest
      const r5 = makeBenchmark('c5', 20) // tied for slowest
      const r6 = makeBenchmark('c6', 10)

      // For slowest: r4 (first 20) should win over r5
      const comparison2 = calculateComparison([r6, r4, r5])
      expect(comparison2.slowest.cipherId).toBe('c4')
    })

    it('handles identical values for all results', () => {
      const r1 = makeBenchmark('c1', 10)
      const r2 = makeBenchmark('c2', 10)
      const r3 = makeBenchmark('c3', 10)

      const comparison = calculateComparison([r1, r2, r3])
      expect(comparison.fastest.cipherId).toBe('c1')
      expect(comparison.slowest.cipherId).toBe('c1')
      expect(comparison.speedupRatio).toBe(1)
    })

    it('throws error if results array is empty or null/undefined', () => {
      expect(() => calculateComparison([])).toThrow(
        'Benchmark results cannot be empty',
      )
      expect(() => calculateComparison(null as any)).toThrow(
        'Benchmark results cannot be empty',
      )
      expect(() => calculateComparison(undefined as any)).toThrow(
        'Benchmark results cannot be empty',
      )
    })
  })

  describe('Presets', () => {
    it('exports preset input sizes and iteration counts', () => {
      expect(PRESET_INPUT_SIZES).toBeInstanceOf(Array)
      expect(PRESET_INPUT_SIZES.length).toBeGreaterThan(0)
      expect(PRESET_INPUT_SIZES[0]).toHaveProperty('label')
      expect(PRESET_INPUT_SIZES[0]).toHaveProperty('value')

      expect(PRESET_ITERATIONS).toBeInstanceOf(Array)
      expect(PRESET_ITERATIONS.length).toBeGreaterThan(0)
      expect(PRESET_ITERATIONS[0]).toHaveProperty('label')
      expect(PRESET_ITERATIONS[0]).toHaveProperty('value')
    })
  })
})

