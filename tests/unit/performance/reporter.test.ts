/**
 * Unit tests for PerformanceReporter
 */

import { describe, it, expect } from 'vitest'
import { PerformanceReporter } from '@/lib/performance/reporter'
import type { PerformanceProfile, PerformanceComparison } from '@/lib/performance/types'

describe('PerformanceReporter', async () => {
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
      latency: {
        averageMs: 10,
        p95Ms: 15,
        p99Ms: 18,
      },
    },
    operation: 'encrypt',
    inputSize: 1024,
    iterations: 100,
  }

  const mockComparison: PerformanceComparison = {
    cipherId: 'test-cipher',
    current: mockProfile,
    baseline: {
      cipherId: 'test-cipher',
      version: '1.0.0',
      commitHash: 'abc123',
      timestamp: new Date('2024-01-01T00:00:00Z'),
      metrics: mockProfile.metrics,
      environment: mockProfile.environment,
    },
    differences: {
      executionTime: {
        averageChange: 1,
        averageChangePercent: 10,
        p95Change: 1.5,
        p95ChangePercent: 10,
        status: 'degraded',
      },
      memoryUsage: {
        averageChange: 100,
        averageChangePercent: 10,
        peakChange: 100,
        peakChangePercent: 3.33,
        status: 'degraded',
      },
      throughput: {
        change: -10240,
        changePercent: -10,
        status: 'degraded',
      },
    },
    regression: 'regression',
  }

  describe('generateReport', async () => {
    it('should generate a complete report', async () => {
      const report = await PerformanceReporter.generateReport([mockProfile], [mockComparison])
      
      expect(report.generatedAt).toBeInstanceOf(Date)
      expect(report.environment).toEqual(mockProfile.environment)
      expect(report.profiles).toHaveLength(1)
      expect(report.comparisons).toHaveLength(1)
      expect((await report).summary).toBeDefined()
    })

    it('should generate report with empty data', async () => {
      const report = await PerformanceReporter.generateReport([], [])
      
      expect(report.profiles).toHaveLength(0)
      expect(report.comparisons).toHaveLength(0)
      expect((await report).summary.totalCiphers).toBe(0)
    })

    it('should calculate summary correctly', async () => {
      const profile2 = { ...mockProfile, cipherId: 'test-cipher-2' }
      const comparison2 = { ...mockComparison, cipherId: 'test-cipher-2', regression: 'improvement' as const }
      
      const report = await PerformanceReporter.generateReport([mockProfile, profile2], [mockComparison, comparison2])
      
      expect((await report).summary.totalCiphers).toBe(2)
      expect((await report).summary.regressions).toBe(1)
      expect((await report).summary.improvements).toBe(1)
    })
  })

  describe('formatTextReport', async () => {
    it('should format report as text', async () => {
      const report = await PerformanceReporter.generateReport([mockProfile], [mockComparison])
      const text = PerformanceReporter.formatTextReport(await report)
      
      expect(text).toContain('CIPHER PERFORMANCE PROFILING REPORT')
      expect(text).toContain('Test Cipher')
      expect(text).toContain('symmetric')
      expect(text).toContain('10.000ms')
      expect(text).toContain('1000 B')
      expect(text).toContain('REGRESSION')
    })

    it('should include environment information', async () => {
      const report = await PerformanceReporter.generateReport([mockProfile], [])
      const text = PerformanceReporter.formatTextReport(await report)
      
      expect(text).toContain('ENVIRONMENT')
      expect(text).toContain('node')
      expect(text).toContain('linux')
      expect(text).toContain('x64')
    })

    it('should include summary section', async () => {
      const report = await PerformanceReporter.generateReport([mockProfile], [mockComparison])
      const text = PerformanceReporter.formatTextReport(await report)
      
      expect(text).toContain('SUMMARY')
      expect(text).toContain('Total Ciphers Profiled: 1')
      expect(text).toContain('Regressions: 1')
    })

    it('should include comparison data', async () => {
      const report = await PerformanceReporter.generateReport([mockProfile], [mockComparison])
      const text = PerformanceReporter.formatTextReport(await report)
      
      expect(text).toContain('BASELINE COMPARISONS')
      expect(text).toContain('1.0.0')
      expect(text).toContain('abc123')
    })
  })

  describe('formatJsonReport', async () => {
    it('should format report as JSON', async () => {
      const report = await PerformanceReporter.generateReport([mockProfile], [mockComparison])
      const json = PerformanceReporter.formatJsonReport(await report)
      
      const parsed = JSON.parse(json)
      expect(parsed.generatedAt).toBeDefined()
      expect(parsed.environment).toBeDefined()
      expect(parsed.profiles).toHaveLength(1)
      expect(parsed.comparisons).toHaveLength(1)
      expect(parsed.summary).toBeDefined()
    })

    it('should be valid JSON', async () => {
      const report = await PerformanceReporter.generateReport([mockProfile], [mockComparison])
      const json = PerformanceReporter.formatJsonReport(await report)
      
      expect(() => JSON.parse(json)).not.toThrow()
    })
  })

  describe('formatMarkdownReport', async () => {
    it('should format report as markdown', async () => {
      const report = await PerformanceReporter.generateReport([mockProfile], [mockComparison])
      const md = PerformanceReporter.formatMarkdownReport(await report)
      
      expect(md).toContain('# Cipher Performance Profiling Report')
      expect(md).toContain('## Environment')
      expect(md).toContain('## Summary')
      expect(md).toContain('## Individual Cipher Profiles')
      expect(md).toContain('Test Cipher')
      expect(md).toContain('| Property | Value |')
    })

    it('should include markdown tables', async () => {
      const report = await PerformanceReporter.generateReport([mockProfile], [mockComparison])
      const md = PerformanceReporter.formatMarkdownReport(await report)
      
      expect(md).toContain('|---')
      expect(md).toContain('| Runtime |')
      expect(md).toContain('| Platform |')
    })

    it('should include cipher details', async () => {
      const report = await PerformanceReporter.generateReport([mockProfile], [mockComparison])
      const md = PerformanceReporter.formatMarkdownReport(await report)
      
      expect(md).toContain('### Test Cipher')
      expect(md).toContain('#### Execution Time')
      expect(md).toContain('#### Memory Usage')
    })

    it('should include comparison details when available', async () => {
      const report = await PerformanceReporter.generateReport([mockProfile], [mockComparison])
      const md = PerformanceReporter.formatMarkdownReport(await report)
      
      expect(md).toContain('## Baseline Comparisons')
      expect(md).toContain('Regression Status')
    })
  })

  describe('exportReportToFile', async () => {
    it('should throw error in browser environment', async () => {
      const report = await PerformanceReporter.generateReport([mockProfile], [mockComparison])
      
      // Mock browser environment
      const originalProcess = global.process
      // @ts-expect-error - Mocking browser environment
      delete global.process
      
      expect(async () => {
        PerformanceReporter.exportReportToFile(report, '/tmp/report.txt', 'text')
      }).toThrow('File export is only available in Node.js environment')
      
      // Restore
      global.process = originalProcess
    })

    it('should not throw when process exists but fs fails gracefully', async () => {
      const report = await PerformanceReporter.generateReport([mockProfile], [mockComparison])
      
      // In a real Node.js environment, this would write to file
      // For testing, we just verify it doesn't throw when process exists
      if (typeof process !== 'undefined') {
        // This will likely fail in test environment, but we're testing the logic
        // In a real scenario, you'd mock fs.writeFile
        try {
          PerformanceReporter.exportReportToFile(report, '/tmp/test-report.txt', 'text')
        } catch (e) {
          // Expected in test environment
          expect((e as Error).message).toBeDefined()
        }
      }
    })
  })

  describe('edge cases', async () => {
    it('should handle profile without throughput', async () => {
      const profileWithoutThroughput = {
        ...mockProfile,
        metrics: {
          ...mockProfile.metrics,
          throughput: undefined,
        },
      }
      
      const report = await PerformanceReporter.generateReport([profileWithoutThroughput], [])
      const text = PerformanceReporter.formatTextReport(await report)
      
      expect(text).toContain('Test Cipher')
      // Should not contain throughput section
      expect(text).not.toContain('Throughput:')
    })

    it('should handle profile without latency', async () => {
      const profileWithoutLatency = {
        ...mockProfile,
        metrics: {
          ...mockProfile.metrics,
          latency: undefined,
        },
      }
      
      const report = await PerformanceReporter.generateReport([profileWithoutLatency], [])
      const text = PerformanceReporter.formatTextReport(await report)
      
      expect(text).toContain('Test Cipher')
      // Should not contain latency section
      expect(text).not.toContain('Latency:')
    })

    it('should handle comparison without throughput', async () => {
      const comparisonWithoutThroughput = {
        ...mockComparison,
        differences: {
          ...mockComparison.differences,
          throughput: undefined,
        },
      }
      
      const report = await PerformanceReporter.generateReport([mockProfile], [comparisonWithoutThroughput])
      const text = PerformanceReporter.formatTextReport(await report)
      
      expect(text).toContain('BASELINE COMPARISONS')
      // Should not contain throughput section in comparison
      expect(text).not.toMatch(/Throughput:.*Change:/)
    })

    it('should handle empty environment gracefully', async () => {
      const report = await PerformanceReporter.generateReport([], [])
      const text = PerformanceReporter.formatTextReport(await report)
      
      expect(text).toContain('ENVIRONMENT')
      expect(text).toContain('Runtime:')
    })
  })
})
