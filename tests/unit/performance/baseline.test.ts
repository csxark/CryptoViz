/* eslint-disable */
// @ts-nocheck
/**
 * Unit tests for BaselineManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BaselineManager } from '@/lib/performance/baseline'
import type { PerformanceProfile } from '@/lib/performance/types'

describe('BaselineManager', () => {
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
    // Clear localStorage before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createBaseline', () => {
    it('should create baseline from profile', () => {
      const baseline = BaselineManager.createBaseline(mockProfile, '1.0.0', 'abc123')
      
      expect(baseline.cipherId).toBe('test-cipher')
      expect(baseline.version).toBe('1.0.0')
      expect(baseline.commitHash).toBe('abc123')
      expect(baseline.metrics).toEqual(mockProfile.metrics)
      expect(baseline.environment).toEqual(mockProfile.environment)
    })
  })

  describe('saveBaseline and getBaseline', () => {
    it('should save and retrieve baseline', () => {
      BaselineManager.saveBaseline(mockProfile, '1.0.0', 'abc123')
      const retrieved = BaselineManager.getBaseline('test-cipher')
      
      expect(retrieved).not.toBeNull()
      expect(retrieved?.cipherId).toBe('test-cipher')
      expect(retrieved?.version).toBe('1.0.0')
    })

    it('should return null for non-existent baseline', () => {
      const retrieved = BaselineManager.getBaseline('non-existent')
      expect(retrieved).toBeNull()
    })

    it('should overwrite existing baseline', () => {
      BaselineManager.saveBaseline(mockProfile, '1.0.0', 'abc123')
      
      const updatedProfile = { ...mockProfile, metrics: { ...mockProfile.metrics, executionTime: { ...mockProfile.metrics.executionTime, averageMs: 20 } } }
      BaselineManager.saveBaseline(updatedProfile, '2.0.0', 'def456')
      
      const retrieved = BaselineManager.getBaseline('test-cipher')
      expect(retrieved?.version).toBe('2.0.0')
      expect(retrieved?.metrics.executionTime.averageMs).toBe(20)
    })
  })

  describe('removeBaseline', () => {
    it('should remove existing baseline', () => {
      BaselineManager.saveBaseline(mockProfile, '1.0.0', 'abc123')
      BaselineManager.removeBaseline('test-cipher')
      
      const retrieved = BaselineManager.getBaseline('test-cipher')
      expect(retrieved).toBeNull()
    })

    it('should handle removing non-existent baseline', () => {
      expect(() => {
        BaselineManager.removeBaseline('non-existent')
      }).not.toThrow()
    })
  })

  describe('clearBaselines', () => {
    it('should clear all baselines', () => {
      BaselineManager.saveBaseline(mockProfile, '1.0.0', 'abc123')
      
      const profile2 = { ...mockProfile, cipherId: 'test-cipher-2' }
      BaselineManager.saveBaseline(profile2, '1.0.0', 'abc123')
      
      BaselineManager.clearBaselines()
      
      expect(BaselineManager.getBaseline('test-cipher')).toBeNull()
      expect(BaselineManager.getBaseline('test-cipher-2')).toBeNull()
    })
  })

  describe('compare', () => {
    it('should compare profile against baseline', () => {
      const baseline = BaselineManager.createBaseline(mockProfile, '1.0.0', 'abc123')
      
      const currentProfile = { 
        ...mockProfile, 
        timestamp: new Date('2024-01-02T00:00:00Z'),
        metrics: {
          ...mockProfile.metrics,
          executionTime: { ...mockProfile.metrics.executionTime, averageMs: 11 }, // 10% slower
        }
      }
      
      const comparison = BaselineManager.compare(currentProfile, baseline)
      
      expect(comparison.cipherId).toBe('test-cipher')
      expect(comparison.current).toEqual(currentProfile)
      expect(comparison.baseline).toEqual(baseline)
      expect(comparison.differences).toBeDefined()
      expect(comparison.regression).toBeDefined()
    })

    it('should detect performance regression', () => {
      const baseline = BaselineManager.createBaseline(mockProfile, '1.0.0', 'abc123')
      
      const currentProfile = { 
        ...mockProfile, 
        metrics: {
          ...mockProfile.metrics,
          executionTime: { ...mockProfile.metrics.executionTime, averageMs: 15 }, // 50% slower
        }
      }
      
      const comparison = BaselineManager.compare(currentProfile, baseline, { executionTimeRegressionPercent: 10 })
      
      expect(comparison.regression).toBe('regression')
      expect(comparison.differences.executionTime.status).toBe('degraded')
    })

    it('should detect performance improvement', () => {
      const baseline = BaselineManager.createBaseline(mockProfile, '1.0.0', 'abc123')
      
      const currentProfile = { 
        ...mockProfile, 
        metrics: {
          ...mockProfile.metrics,
          executionTime: { ...mockProfile.metrics.executionTime, averageMs: 5 }, // 50% faster
        }
      }
      
      const comparison = BaselineManager.compare(currentProfile, baseline, { executionTimeRegressionPercent: 10 })
      
      expect(comparison.regression).toBe('improvement')
      expect(comparison.differences.executionTime.status).toBe('improved')
    })

    it('should detect stable performance', () => {
      const baseline = BaselineManager.createBaseline(mockProfile, '1.0.0', 'abc123')
      
      const currentProfile = { 
        ...mockProfile, 
        metrics: {
          ...mockProfile.metrics,
          executionTime: { ...mockProfile.metrics.executionTime, averageMs: 10.1 }, // 1% change
        }
      }
      
      const comparison = BaselineManager.compare(currentProfile, baseline, { minimumChangePercent: 2 })
      
      expect(comparison.regression).toBe('stable')
      expect(comparison.differences.executionTime.status).toBe('stable')
    })

    it('should use custom thresholds', () => {
      const baseline = BaselineManager.createBaseline(mockProfile, '1.0.0', 'abc123')
      
      const currentProfile = { 
        ...mockProfile, 
        metrics: {
          ...mockProfile.metrics,
          executionTime: { ...mockProfile.metrics.executionTime, averageMs: 10.5 }, // 5% slower
        }
      }
      
      // With 25% threshold, this should be stable (since 5% < 25%)
      const comparison = BaselineManager.compare(currentProfile, baseline, { 
        executionTimeRegressionPercent: 25,
        minimumChangePercent: 2 
      })
      
      expect(comparison.differences.executionTime.status).toBe('stable')
    })
  })

  describe('batchCompare', () => {
    it('should compare multiple profiles', () => {
      BaselineManager.saveBaseline(mockProfile, '1.0.0', 'abc123')
      
      const profile2 = { ...mockProfile, cipherId: 'test-cipher-2', cipherName: 'Test Cipher 2' }
      BaselineManager.saveBaseline(profile2, '1.0.0', 'abc123')
      
      const currentProfiles = [
        { ...mockProfile, metrics: { ...mockProfile.metrics, executionTime: { ...mockProfile.metrics.executionTime, averageMs: 11 } } },
        { ...profile2, metrics: { ...profile2.metrics, executionTime: { ...profile2.metrics.executionTime, averageMs: 9 } } },
      ]
      
      const comparisons = BaselineManager.batchCompare(currentProfiles)
      
      expect(comparisons).toHaveLength(2)
      expect(comparisons[0].cipherId).toBe('test-cipher')
      expect(comparisons[1].cipherId).toBe('test-cipher-2')
    })

    it('should skip profiles without baselines', () => {
      const currentProfiles = [
        { ...mockProfile, cipherId: 'no-baseline' },
      ]
      
      const comparisons = BaselineManager.batchCompare(currentProfiles)
      
      expect(comparisons).toHaveLength(0)
    })
  })

  describe('exportBaselinesToString and importBaselinesFromString', () => {
    it('should export and import baselines', () => {
      BaselineManager.saveBaseline(mockProfile, '1.0.0', 'abc123')
      
      const exported = BaselineManager.exportBaselinesToString()
      expect(exported).toContain('test-cipher')
      expect(exported).toContain('1.0.0')
      
      BaselineManager.clearBaselines()
      expect(BaselineManager.getBaseline('test-cipher')).toBeNull()
      
      BaselineManager.importBaselinesFromString(exported)
      const retrieved = BaselineManager.getBaseline('test-cipher')
      expect(retrieved).not.toBeNull()
      expect(retrieved?.version).toBe('1.0.0')
    })

    it('should handle invalid import data', () => {
      expect(() => {
        BaselineManager.importBaselinesFromString('invalid json')
      }).toThrow()
    })
  })

  describe('getBaselineSummary', () => {
    it('should return summary of baselines', () => {
      BaselineManager.saveBaseline(mockProfile, '1.0.0', 'abc123')
      
      const profile2 = { ...mockProfile, cipherId: 'test-cipher-2' }
      BaselineManager.saveBaseline(profile2, '2.0.0', 'def456')
      
      const summary = BaselineManager.getBaselineSummary()
      
      expect(summary.count).toBe(2)
      expect(summary.ciphers).toContain('test-cipher')
      expect(summary.ciphers).toContain('test-cipher-2')
      expect(summary.versions).toContain('1.0.0')
      expect(summary.versions).toContain('2.0.0')
      expect(summary.dateRange).not.toBeNull()
    })

    it('should return empty summary when no baselines', () => {
      BaselineManager.clearBaselines()
      
      const summary = BaselineManager.getBaselineSummary()
      
      expect(summary.count).toBe(0)
      expect(summary.ciphers).toEqual([])
      expect(summary.versions).toEqual([])
      expect(summary.dateRange).toBeNull()
    })
  })

  describe('loadBaselines and saveBaselines', () => {
    it('should persist baselines across calls', () => {
      BaselineManager.saveBaseline(mockProfile, '1.0.0', 'abc123')
      
      const baselines1 = BaselineManager.loadBaselines()
      expect(baselines1.size).toBe(1)
      
      // Create new instance simulation
      const baselines2 = BaselineManager.loadBaselines()
      expect(baselines2.size).toBe(1)
      expect(baselines2.get('test-cipher')?.version).toBe('1.0.0')
    })
  })
})
