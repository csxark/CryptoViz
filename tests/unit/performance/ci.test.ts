/* eslint-disable */
// @ts-nocheck
/**
 * Unit tests for PerformanceCI
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PerformanceCI } from '@/lib/performance/ci'
import { BaselineManager } from '@/lib/performance/baseline'
import type { PerformanceProfile } from '@/lib/performance/types'

describe('PerformanceCI', () => {
  const mockProfile: PerformanceProfile = {
    cipherId: 'test-cipher',
    cipherName: 'Test Cipher',
    category: 'symmetric',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    environment: {
      runtime: 'node',
      platform: 'linux',
      arch: 'x64',
      cpuCount: 4,
      totalMemory: 8 * 1024 * 1024 * 1024,
    },
    metrics: {
      executionTime: {
        averageMs: 10,
        minMs: 5,
        maxMs: 20,
        medianMs: 10,
        p95Ms: 15,
        p99Ms: 18,
        stdDevMs: 3,
        totalMs: 100,
      },
      memoryUsage: {
        averageBytes: 1000,
        minBytes: 500,
        maxBytes: 2000,
        peakBytes: 3000,
        baselineBytes: 1000,
      },
      throughput: {
        bytesPerSecond: 102400,
        operationsPerSecond: 100,
        formatted: '100.00 KB/s, 100 ops/s',
      },
    },
    operation: 'encrypt',
    inputSize: 1024,
    iterations: 100,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    BaselineManager.clearBaselines()
  })

  describe('runRegressionCheck', () => {
    it('should pass when no regressions', async () => {
      BaselineManager.saveBaseline(mockProfile, '1.0.0', 'abc123')
      
      const currentProfile = { 
        ...mockProfile, 
        metrics: { ...mockProfile.metrics, executionTime: { ...mockProfile.metrics.executionTime, averageMs: 9 } } // Improved
      }
      
      const result = await PerformanceCI.runRegressionCheck([currentProfile], { failOnRegression: true })
      
      expect(result.success).toBe(true)
      expect(result.summary.regressionCount).toBe(0)
      expect(result.exitCode).toBe(0)
    })

    it('should fail when regressions detected', async () => {
      BaselineManager.saveBaseline(mockProfile, '1.0.0', 'abc123')
      
      const currentProfile = { 
        ...mockProfile, 
        metrics: { ...mockProfile.metrics, executionTime: { ...mockProfile.metrics.executionTime, averageMs: 15 } } // Regressed
      }
      
      const result = await PerformanceCI.runRegressionCheck([currentProfile], { failOnRegression: true })
      
      expect(result.success).toBe(false)
      expect(result.summary.regressionCount).toBe(1)
      expect(result.exitCode).toBe(1)
    })

    it('should not fail when failOnRegression is false', async () => {
      BaselineManager.saveBaseline(mockProfile, '1.0.0', 'abc123')
      
      const currentProfile = { 
        ...mockProfile, 
        metrics: { ...mockProfile.metrics, executionTime: { ...mockProfile.metrics.executionTime, averageMs: 15 } } // Regressed
      }
      
      const result = await PerformanceCI.runRegressionCheck([currentProfile], { failOnRegression: false })
      
      expect(result.success).toBe(true)
      expect(result.summary.regressionCount).toBe(1)
      expect(result.exitCode).toBe(0)
    })

    it('should handle inconclusive results', async () => {
      BaselineManager.saveBaseline(mockProfile, '1.0.0', 'abc123')
      
      const currentProfile = { 
        ...mockProfile, 
        metrics: { 
          ...mockProfile.metrics, 
          executionTime: { ...mockProfile.metrics.executionTime, averageMs: 15 }, // Regressed
          memoryUsage: { ...mockProfile.metrics.memoryUsage, averageBytes: 500 } // Improved
        }
      }
      
      const result = await PerformanceCI.runRegressionCheck([currentProfile], { failOnInconclusive: true })
      
      expect(result.success).toBe(false)
      expect(result.summary.inconclusiveCount).toBe(1)
      expect(result.exitCode).toBe(2)
    })

    it('should handle profiles without baselines', async () => {
      const result = await PerformanceCI.runRegressionCheck([mockProfile], { failOnRegression: true })
      
      expect(result.success).toBe(true)
      expect(result.summary.totalChecked).toBe(0)
      expect(result.exitCode).toBe(0)
    })

    it('should use custom thresholds', async () => {
      BaselineManager.saveBaseline(mockProfile, '1.0.0', 'abc123')
      
      const currentProfile = { 
        ...mockProfile, 
        metrics: { ...mockProfile.metrics, executionTime: { ...mockProfile.metrics.executionTime, averageMs: 10.5 } } // 5% slower
      }
      
      // With 25% threshold, this should pass (since 5% < 25%)
      const result = await PerformanceCI.runRegressionCheck([currentProfile], { 
        failOnRegression: true,
        thresholds: { executionTimeRegressionPercent: 25, minimumChangePercent: 2 }
      })
      
      expect(result.success).toBe(true)
      expect(result.summary.regressionCount).toBe(0)
    })

    it('should generate appropriate message', async () => {
      BaselineManager.saveBaseline(mockProfile, '1.0.0', 'abc123')
      
      const currentProfile = { 
        ...mockProfile, 
        metrics: { ...mockProfile.metrics, executionTime: { ...mockProfile.metrics.executionTime, averageMs: 9 } }
      }
      
      const result = await PerformanceCI.runRegressionCheck([currentProfile], { verbose: true })
      
      expect(result.message).toContain('Performance Regression Check Results')
      expect(result.message).toContain('Total Checked: 1')
    })
  })

  describe('generateGitHubAnnotations', () => {
    it('should generate error annotations for regressions', () => {
      const mockComparison = {
        cipherId: 'test-cipher',
        current: mockProfile,
        baseline: {
          cipherId: 'test-cipher',
          version: '1.0.0',
          commitHash: 'abc123',
          timestamp: new Date(),
          metrics: mockProfile.metrics,
          environment: mockProfile.environment,
        },
        differences: {
          executionTime: {
            averageChange: 5,
            averageChangePercent: 50,
            p95Change: 7,
            p95ChangePercent: 50,
            status: 'degraded' as const,
          },
          memoryUsage: {
            averageChange: 500,
            averageChangePercent: 50,
            peakChange: 500,
            peakChangePercent: 16.67,
            status: 'degraded' as const,
          },
        },
        regression: 'regression' as const,
      }
      
      const annotations = PerformanceCI.generateGitHubAnnotations([mockComparison])
      
      expect(annotations).toHaveLength(1)
      expect(annotations[0]).toContain('::error')
      expect(annotations[0]).toContain('Performance Regression')
      expect(annotations[0]).toContain('Test Cipher')
    })

    it('should generate notice annotations for improvements', () => {
      const mockComparison = {
        cipherId: 'test-cipher',
        current: mockProfile,
        baseline: {
          cipherId: 'test-cipher',
          version: '1.0.0',
          commitHash: 'abc123',
          timestamp: new Date(),
          metrics: mockProfile.metrics,
          environment: mockProfile.environment,
        },
        differences: {
          executionTime: {
            averageChange: -5,
            averageChangePercent: -50,
            p95Change: -7,
            p95ChangePercent: -50,
            status: 'improved' as const,
          },
          memoryUsage: {
            averageChange: -500,
            averageChangePercent: -50,
            peakChange: -500,
            peakChangePercent: -16.67,
            status: 'improved' as const,
          },
        },
        regression: 'improvement' as const,
      }
      
      const annotations = PerformanceCI.generateGitHubAnnotations([mockComparison])
      
      expect(annotations).toHaveLength(1)
      expect(annotations[0]).toContain('::notice')
      expect(annotations[0]).toContain('Performance Improvement')
    })

    it('should not generate annotations for stable results', () => {
      const mockComparison = {
        cipherId: 'test-cipher',
        current: mockProfile,
        baseline: {
          cipherId: 'test-cipher',
          version: '1.0.0',
          commitHash: 'abc123',
          timestamp: new Date(),
          metrics: mockProfile.metrics,
          environment: mockProfile.environment,
        },
        differences: {
          executionTime: {
            averageChange: 0.1,
            averageChangePercent: 1,
            p95Change: 0.15,
            p95ChangePercent: 1,
            status: 'stable' as const,
          },
          memoryUsage: {
            averageChange: 10,
            averageChangePercent: 1,
            peakChange: 10,
            peakChangePercent: 0.33,
            status: 'stable' as const,
          },
        },
        regression: 'stable' as const,
      }
      
      const annotations = PerformanceCI.generateGitHubAnnotations([mockComparison])
      
      expect(annotations).toHaveLength(0)
    })
  })

  describe('generateJenkinsMarkup', () => {
    it('should generate HTML table', () => {
      const mockComparison = {
        cipherId: 'test-cipher',
        current: mockProfile,
        baseline: {
          cipherId: 'test-cipher',
          version: '1.0.0',
          commitHash: 'abc123',
          timestamp: new Date(),
          metrics: mockProfile.metrics,
          environment: mockProfile.environment,
        },
        differences: {
          executionTime: {
            averageChange: 5,
            averageChangePercent: 50,
            p95Change: 7,
            p95ChangePercent: 50,
            status: 'degraded' as const,
          },
          memoryUsage: {
            averageChange: 500,
            averageChangePercent: 50,
            peakChange: 500,
            peakChangePercent: 16.67,
            status: 'degraded' as const,
          },
        },
        regression: 'regression' as const,
      }
      
      const markup = PerformanceCI.generateJenkinsMarkup([mockComparison])
      
      expect(markup).toContain('<h2>Performance Regression Check</h2>')
      expect(markup).toContain('<table>')
      expect(markup).toContain('Test Cipher')
      expect(markup).toContain('regression')
      expect(markup).toContain('50.00')
    })
  })

  describe('checkPerformanceThresholds', () => {
    it('should pass when all thresholds are met', () => {
      const result = PerformanceCI.checkPerformanceThresholds(mockProfile, {
        maxExecutionTimeMs: 20,
        maxMemoryBytes: 2000,
        minThroughputBytesPerSecond: 50000,
      })
      
      expect(result.passed).toBe(true)
      expect(result.failures).toHaveLength(0)
    })

    it('should fail when execution time exceeds threshold', () => {
      const result = PerformanceCI.checkPerformanceThresholds(mockProfile, {
        maxExecutionTimeMs: 5,
      })
      
      expect(result.passed).toBe(false)
      expect(result.failures).toHaveLength(1)
      expect(result.failures[0]).toContain('Execution time')
    })

    it('should fail when memory exceeds threshold', () => {
      const result = PerformanceCI.checkPerformanceThresholds(mockProfile, {
        maxMemoryBytes: 500,
      })
      
      expect(result.passed).toBe(false)
      expect(result.failures).toHaveLength(1)
      expect(result.failures[0]).toContain('Memory usage')
    })

    it('should fail when throughput below threshold', () => {
      const result = PerformanceCI.checkPerformanceThresholds(mockProfile, {
        minThroughputBytesPerSecond: 200000,
      })
      
      expect(result.passed).toBe(false)
      expect(result.failures).toHaveLength(1)
      expect(result.failures[0]).toContain('Throughput')
    })

    it('should handle profile without throughput', () => {
      const profileWithoutThroughput = {
        ...mockProfile,
        metrics: { ...mockProfile.metrics, throughput: undefined },
      }
      
      const result = PerformanceCI.checkPerformanceThresholds(profileWithoutThroughput, {
        minThroughputBytesPerSecond: 200000,
      })
      
      // Should not fail if throughput is not available
      expect(result.passed).toBe(true)
    })
  })

  describe('generateTrendData', () => {
    it('should generate trend data from profiles', () => {
      const trendData = PerformanceCI.generateTrendData([mockProfile])
      
      expect(trendData).toHaveLength(1)
      expect(trendData[0]).toMatchObject({
        cipherId: 'test-cipher',
        timestamp: expect.any(Number),
        executionTimeMs: 10,
        memoryBytes: 1000,
        throughputBytesPerSecond: 102400,
      })
    })

    it('should handle multiple profiles', () => {
      const profile2 = { ...mockProfile, cipherId: 'test-cipher-2', timestamp: new Date('2024-01-02T00:00:00Z') }
      const trendData = PerformanceCI.generateTrendData([mockProfile, profile2])
      
      expect(trendData).toHaveLength(2)
      expect(trendData[0].cipherId).toBe('test-cipher')
      expect(trendData[1].cipherId).toBe('test-cipher-2')
    })
  })

  describe('exportPrometheusMetrics', () => {
    it('should export metrics in Prometheus format', () => {
      const metrics = PerformanceCI.exportPrometheusMetrics([mockProfile])
      
      expect(metrics).toContain('# HELP cipher_execution_time_ms')
      expect(metrics).toContain('# TYPE cipher_execution_time_ms gauge')
      expect(metrics).toContain('cipher_execution_time_ms{cipher="test-cipher",category="symmetric",operation="encrypt"}')
      expect(metrics).toContain('# HELP cipher_memory_bytes')
      expect(metrics).toContain('# TYPE cipher_memory_bytes gauge')
      expect(metrics).toContain('cipher_memory_bytes{cipher="test-cipher",category="symmetric",operation="encrypt"}')
    })

    it('should include throughput metrics when available', () => {
      const metrics = PerformanceCI.exportPrometheusMetrics([mockProfile])
      
      expect(metrics).toContain('# HELP cipher_throughput_bytes_per_second')
      expect(metrics).toContain('# TYPE cipher_throughput_bytes_per_second gauge')
      expect(metrics).toContain('cipher_throughput_bytes_per_second{cipher="test-cipher",category="symmetric",operation="encrypt"}')
    })

    it('should handle multiple profiles', () => {
      const profile2 = { ...mockProfile, cipherId: 'test-cipher-2' }
      const metrics = PerformanceCI.exportPrometheusMetrics([mockProfile, profile2])
      
      expect(metrics).toContain('cipher="test-cipher"')
      expect(metrics).toContain('cipher="test-cipher-2"')
    })
  })

  describe('createCIBaseline', () => {
    it('should create baselines for all profiles', () => {
      const profile2 = { ...mockProfile, cipherId: 'test-cipher-2' }
      
      PerformanceCI.createCIBaseline([mockProfile, profile2], '1.0.0', 'abc123')
      
      expect(BaselineManager.getBaseline('test-cipher')).not.toBeNull()
      expect(BaselineManager.getBaseline('test-cipher-2')).not.toBeNull()
      expect(BaselineManager.getBaseline('test-cipher')?.version).toBe('1.0.0')
    })
  })

  describe('validateBaselinesExist', () => {
    it('should return true when all baselines exist', () => {
      BaselineManager.saveBaseline(mockProfile, '1.0.0', 'abc123')
      
      const result = PerformanceCI.validateBaselinesExist([mockProfile])
      
      expect(result.allPresent).toBe(true)
      expect(result.missing).toHaveLength(0)
    })

    it('should return false when baselines are missing', () => {
      const result = PerformanceCI.validateBaselinesExist([mockProfile])
      
      expect(result.allPresent).toBe(false)
      expect(result.missing).toContain('test-cipher')
    })

    it('should handle mixed scenarios', () => {
      BaselineManager.saveBaseline(mockProfile, '1.0.0', 'abc123')
      
      const profile2 = { ...mockProfile, cipherId: 'test-cipher-2' }
      const result = PerformanceCI.validateBaselinesExist([mockProfile, profile2])
      
      expect(result.allPresent).toBe(false)
      expect(result.missing).toContain('test-cipher-2')
      expect(result.missing).not.toContain('test-cipher')
    })
  })

  describe('getRecommendedCIConfig', () => {
    it('should return configuration string', () => {
      const config = PerformanceCI.getRecommendedCIConfig()
      
      expect(config).toContain('Performance Profiling CI Configuration')
      expect(config).toContain('PERFORMANCE_FAIL_ON_REGRESSION')
      expect(config).toContain('npm run performance:profile')
    })
  })
})
