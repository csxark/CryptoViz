/**
 * Performance report generation and formatting.
 * Creates structured reports for performance profiling results.
 */

import type {
  PerformanceProfile,
  PerformanceComparison,
  PerformanceReport,
  PerformanceSummary,
  EnvironmentInfo,
} from './types'
import { formatBytes } from '@/lib/formatters'

export class PerformanceReporter {
  /**
   * Generate a comprehensive performance report
   */
  static async generateReport(
    profiles: PerformanceProfile[],
    comparisons: PerformanceComparison[],
  ): Promise<PerformanceReport> {
    const summary = this.generateSummary(profiles, comparisons)
    const environment = profiles.length > 0 ? profiles[0].environment : await this.getFallbackEnvironment()

    return {
      generatedAt: new Date(),
      environment,
      profiles,
      comparisons,
      summary,
    }
  }

  /**
   * Generate performance summary statistics
   */
  private static generateSummary(
    profiles: PerformanceProfile[],
    comparisons: PerformanceComparison[],
  ): PerformanceSummary {
    const regressionCount = comparisons.filter((c) => c.regression === 'regression').length
    const improvementCount = comparisons.filter((c) => c.regression === 'improvement').length
    const stableCount = comparisons.filter((c) => c.regression === 'stable').length
    const inconclusiveCount = comparisons.filter((c) => c.regression === 'inconclusive').length

    let avgExecTimeChange = 0
    let avgMemoryChange = 0

    if (comparisons.length > 0) {
      const totalExecChange = comparisons.reduce(
        (sum, c) => sum + c.differences.executionTime.averageChangePercent,
        0,
      )
      const totalMemChange = comparisons.reduce(
        (sum, c) => sum + c.differences.memoryUsage.averageChangePercent,
        0,
      )

      avgExecTimeChange = totalExecChange / comparisons.length
      avgMemoryChange = totalMemChange / comparisons.length
    }

    return {
      totalCiphers: profiles.length,
      regressions: regressionCount,
      improvements: improvementCount,
      stable: stableCount,
      inconclusive: inconclusiveCount,
      averageExecutionTimeChange: avgExecTimeChange,
      averageMemoryChange: avgMemoryChange,
    }
  }

  /**
   * Get fallback environment info when no profiles are available
   */
  private static async getFallbackEnvironment(): Promise<EnvironmentInfo> {
    const isNode = typeof process !== 'undefined' && process.versions?.node

    if (isNode) {
      try {
         
        const os = await import('node:os')
        return {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          cpuCount: os.cpus()?.length || 1,
          totalMemory: os.totalmem(),
          runtime: 'node',
        }
      } catch {
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
      arch: 'unknown',
      cpuCount: navigator.hardwareConcurrency || 1,
      totalMemory: 8 * 1024 * 1024 * 1024,
      runtime: 'browser',
      userAgent: navigator.userAgent,
    }
  }

  /**
   * Format report as human-readable text
   */
  static formatTextReport(report: PerformanceReport): string {
    const lines: string[] = []

    lines.push('='.repeat(80))
    lines.push('CIPHER PERFORMANCE PROFILING REPORT')
    lines.push('='.repeat(80))
    lines.push(`Generated: ${report.generatedAt.toISOString()}`)
    lines.push('')

    // Environment information
    lines.push('-'.repeat(80))
    lines.push('ENVIRONMENT')
    lines.push('-'.repeat(80))
    lines.push(`Runtime: ${report.environment.runtime}`)
    if (report.environment.nodeVersion) {
      lines.push(`Node Version: ${report.environment.nodeVersion}`)
    }
    if (report.environment.userAgent) {
      lines.push(`User Agent: ${report.environment.userAgent}`)
    }
    lines.push(`Platform: ${report.environment.platform}`)
    lines.push(`Architecture: ${report.environment.arch}`)
    lines.push(`CPU Count: ${report.environment.cpuCount}`)
    lines.push(`Total Memory: ${this.formatBytes(report.environment.totalMemory)}`)
    lines.push('')

    // Summary
    lines.push('-'.repeat(80))
    lines.push('SUMMARY')
    lines.push('-'.repeat(80))
    lines.push(`Total Ciphers Profiled: ${report.summary.totalCiphers}`)
    lines.push(`Regressions: ${report.summary.regressions}`)
    lines.push(`Improvements: ${report.summary.improvements}`)
    lines.push(`Stable: ${report.summary.stable}`)
    lines.push(`Inconclusive: ${report.summary.inconclusive}`)
    lines.push(`Average Execution Time Change: ${report.summary.averageExecutionTimeChange.toFixed(2)}%`)
    lines.push(`Average Memory Change: ${report.summary.averageMemoryChange.toFixed(2)}%`)
    lines.push('')

    // Individual profiles
    lines.push('-'.repeat(80))
    lines.push('INDIVIDUAL CIPHER PROFILES')
    lines.push('-'.repeat(80))

    for (const profile of report.profiles) {
      lines.push('')
      lines.push(`Cipher: ${profile.cipherName} (${profile.cipherId})`)
      lines.push(`Category: ${profile.category}`)
      lines.push(`Operation: ${profile.operation}`)
      lines.push(`Input Size: ${this.formatBytes(profile.inputSize)}`)
      lines.push(`Iterations: ${profile.iterations}`)
      lines.push(`Timestamp: ${profile.timestamp.toISOString()}`)
      lines.push('')
      lines.push('Execution Time:')
      lines.push(`  Average: ${profile.metrics.executionTime.averageMs.toFixed(3)}ms`)
      lines.push(`  Min: ${profile.metrics.executionTime.minMs.toFixed(3)}ms`)
      lines.push(`  Max: ${profile.metrics.executionTime.maxMs.toFixed(3)}ms`)
      lines.push(`  Median: ${profile.metrics.executionTime.medianMs.toFixed(3)}ms`)
      lines.push(`  P95: ${profile.metrics.executionTime.p95Ms.toFixed(3)}ms`)
      lines.push(`  P99: ${profile.metrics.executionTime.p99Ms.toFixed(3)}ms`)
      lines.push(`  Std Dev: ${profile.metrics.executionTime.stdDevMs.toFixed(3)}ms`)
      lines.push('')
      lines.push('Memory Usage:')
      lines.push(`  Average: ${this.formatBytes(profile.metrics.memoryUsage.averageBytes)}`)
      lines.push(`  Min: ${this.formatBytes(profile.metrics.memoryUsage.minBytes)}`)
      lines.push(`  Max: ${this.formatBytes(profile.metrics.memoryUsage.maxBytes)}`)
      lines.push(`  Peak: ${this.formatBytes(profile.metrics.memoryUsage.peakBytes)}`)
      lines.push('')

      if (profile.metrics.throughput) {
        lines.push('Throughput:')
        lines.push(`  ${profile.metrics.throughput.formatted}`)
        lines.push('')
      }

      if (profile.metrics.latency) {
        lines.push('Latency:')
        lines.push(`  Average: ${profile.metrics.latency.averageMs.toFixed(3)}ms`)
        lines.push(`  P95: ${profile.metrics.latency.p95Ms.toFixed(3)}ms`)
        lines.push(`  P99: ${profile.metrics.latency.p99Ms.toFixed(3)}ms`)
        lines.push('')
      }
    }

    // Comparisons
    if (report.comparisons.length > 0) {
      lines.push('-'.repeat(80))
      lines.push('BASELINE COMPARISONS')
      lines.push('-'.repeat(80))

      for (const comparison of report.comparisons) {
        lines.push('')
        lines.push(`Cipher: ${comparison.current.cipherName} (${comparison.cipherId})`)
        lines.push(`Regression Status: ${comparison.regression.toUpperCase()}`)
        lines.push(`Baseline Version: ${comparison.baseline.version}`)
        lines.push(`Baseline Commit: ${comparison.baseline.commitHash}`)
        lines.push('')

        lines.push('Execution Time:')
        lines.push(
          `  Change: ${comparison.differences.executionTime.averageChange.toFixed(3)}ms (${comparison.differences.executionTime.averageChangePercent.toFixed(2)}%)`,
        )
        lines.push(`  Status: ${comparison.differences.executionTime.status.toUpperCase()}`)
        lines.push('')

        lines.push('Memory Usage:')
        lines.push(
          `  Change: ${this.formatBytes(comparison.differences.memoryUsage.averageChange)} (${comparison.differences.memoryUsage.averageChangePercent.toFixed(2)}%)`,
        )
        lines.push(`  Status: ${comparison.differences.memoryUsage.status.toUpperCase()}`)

        if (comparison.differences.throughput) {
          lines.push('')
          lines.push('Throughput:')
          lines.push(
            `  Change: ${this.formatBytes(comparison.differences.throughput.change)}/s (${comparison.differences.throughput.changePercent.toFixed(2)}%)`,
          )
          lines.push(`  Status: ${comparison.differences.throughput.status.toUpperCase()}`)
        }

        lines.push('')
      }
    }

    lines.push('='.repeat(80))
    lines.push('END OF REPORT')
    lines.push('='.repeat(80))

    return lines.join('\n')
  }

  /**
   * Format report as JSON
   */
  static formatJsonReport(report: PerformanceReport): string {
    return JSON.stringify(report, null, 2)
  }

  /**
   * Format report as Markdown
   */
  static formatMarkdownReport(report: PerformanceReport): string {
    const lines: string[] = []

    lines.push('# Cipher Performance Profiling Report')
    lines.push('')
    lines.push(`**Generated:** ${report.generatedAt.toISOString()}`)
    lines.push('')

    // Environment
    lines.push('## Environment')
    lines.push('')
    lines.push('| Property | Value |')
    lines.push('|----------|-------|')
    lines.push(`| Runtime | ${report.environment.runtime} |`)
    if (report.environment.nodeVersion) {
      lines.push(`| Node Version | ${report.environment.nodeVersion} |`)
    }
    if (report.environment.userAgent) {
      lines.push(`| User Agent | ${report.environment.userAgent} |`)
    }
    lines.push(`| Platform | ${report.environment.platform} |`)
    lines.push(`| Architecture | ${report.environment.arch} |`)
    lines.push(`| CPU Count | ${report.environment.cpuCount} |`)
    lines.push(`| Total Memory | ${this.formatBytes(report.environment.totalMemory)} |`)
    lines.push('')

    // Summary
    lines.push('## Summary')
    lines.push('')
    lines.push('| Metric | Count |')
    lines.push('|--------|-------|')
    lines.push(`| Total Ciphers | ${report.summary.totalCiphers} |`)
    lines.push(`| Regressions | ${report.summary.regressions} |`)
    lines.push(`| Improvements | ${report.summary.improvements} |`)
    lines.push(`| Stable | ${report.summary.stable} |`)
    lines.push(`| Inconclusive | ${report.summary.inconclusive} |`)
    lines.push(`| Avg Execution Time Change | ${report.summary.averageExecutionTimeChange.toFixed(2)}% |`)
    lines.push(`| Avg Memory Change | ${report.summary.averageMemoryChange.toFixed(2)}% |`)
    lines.push('')

    // Profiles
    lines.push('## Individual Cipher Profiles')
    lines.push('')

    for (const profile of report.profiles) {
      lines.push(`### ${profile.cipherName} (${profile.cipherId})`)
      lines.push('')
      lines.push(`- **Category:** ${profile.category}`)
      lines.push(`- **Operation:** ${profile.operation}`)
      lines.push(`- **Input Size:** ${this.formatBytes(profile.inputSize)}`)
      lines.push(`- **Iterations:** ${profile.iterations}`)
      lines.push(`- **Timestamp:** ${profile.timestamp.toISOString()}`)
      lines.push('')
      lines.push('#### Execution Time')
      lines.push('')
      lines.push('| Metric | Value |')
      lines.push('|--------|-------|')
      lines.push(`| Average | ${profile.metrics.executionTime.averageMs.toFixed(3)}ms |`)
      lines.push(`| Min | ${profile.metrics.executionTime.minMs.toFixed(3)}ms |`)
      lines.push(`| Max | ${profile.metrics.executionTime.maxMs.toFixed(3)}ms |`)
      lines.push(`| Median | ${profile.metrics.executionTime.medianMs.toFixed(3)}ms |`)
      lines.push(`| P95 | ${profile.metrics.executionTime.p95Ms.toFixed(3)}ms |`)
      lines.push(`| P99 | ${profile.metrics.executionTime.p99Ms.toFixed(3)}ms |`)
      lines.push(`| Std Dev | ${profile.metrics.executionTime.stdDevMs.toFixed(3)}ms |`)
      lines.push('')

      lines.push('#### Memory Usage')
      lines.push('')
      lines.push('| Metric | Value |')
      lines.push('|--------|-------|')
      lines.push(`| Average | ${this.formatBytes(profile.metrics.memoryUsage.averageBytes)} |`)
      lines.push(`| Min | ${this.formatBytes(profile.metrics.memoryUsage.minBytes)} |`)
      lines.push(`| Max | ${this.formatBytes(profile.metrics.memoryUsage.maxBytes)} |`)
      lines.push(`| Peak | ${this.formatBytes(profile.metrics.memoryUsage.peakBytes)} |`)
      lines.push('')

      if (profile.metrics.throughput) {
        lines.push('#### Throughput')
        lines.push('')
        lines.push(`- ${profile.metrics.throughput.formatted}`)
        lines.push('')
      }

      if (profile.metrics.latency) {
        lines.push('#### Latency')
        lines.push('')
        lines.push('| Metric | Value |')
        lines.push('|--------|-------|')
        lines.push(`| Average | ${profile.metrics.latency.averageMs.toFixed(3)}ms |`)
        lines.push(`| P95 | ${profile.metrics.latency.p95Ms.toFixed(3)}ms |`)
        lines.push(`| P99 | ${profile.metrics.latency.p99Ms.toFixed(3)}ms |`)
        lines.push('')
      }
    }

    // Comparisons
    if (report.comparisons.length > 0) {
      lines.push('## Baseline Comparisons')
      lines.push('')

      for (const comparison of report.comparisons) {
        lines.push(`### ${comparison.current.cipherName} (${comparison.cipherId})`)
        lines.push('')
        lines.push(`- **Regression Status:** ${comparison.regression.toUpperCase()}`)
        lines.push(`- **Baseline Version:** ${comparison.baseline.version}`)
        lines.push(`- **Baseline Commit:** ${comparison.baseline.commitHash}`)
        lines.push('')

        lines.push('#### Execution Time')
        lines.push('')
        lines.push(`- **Change:** ${comparison.differences.executionTime.averageChange.toFixed(3)}ms (${comparison.differences.executionTime.averageChangePercent.toFixed(2)}%)`)
        lines.push(`- **Status:** ${comparison.differences.executionTime.status.toUpperCase()}`)
        lines.push('')

        lines.push('#### Memory Usage')
        lines.push('')
        lines.push(`- **Change:** ${this.formatBytes(comparison.differences.memoryUsage.averageChange)} (${comparison.differences.memoryUsage.averageChangePercent.toFixed(2)}%)`)
        lines.push(`- **Status:** ${comparison.differences.memoryUsage.status.toUpperCase()}`)

        if (comparison.differences.throughput) {
          lines.push('')
          lines.push('#### Throughput')
          lines.push('')
          lines.push(`- **Change:** ${this.formatBytes(comparison.differences.throughput.change)}/s (${comparison.differences.throughput.changePercent.toFixed(2)}%)`)
          lines.push(`- **Status:** ${comparison.differences.throughput.status.toUpperCase()}`)
        }

        lines.push('')
      }
    }

    return lines.join('\n')
  }

  /**
   * Format bytes to human-readable string
   */
  private static formatBytes(bytes: number): string {
    return formatBytes(bytes, '0 B')
  }

  /**
   * Export report to file (Node.js only)
   */
  static async exportReportToFile(
    report: PerformanceReport, 
    filePath: string, 
    format: 'text' | 'json' | 'markdown' = 'text'): Promise<void> {
    if (typeof process === 'undefined') {
      throw new Error('File export is only available in Node.js environment')
    }

     
    const fs = await import('node:fs')
     
    const path = await import('node:path')

    const content = format === 'json' 
      ? this.formatJsonReport(report)
      : format === 'markdown'
      ? this.formatMarkdownReport(report)
      : this.formatTextReport(report)

    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(filePath, content, 'utf-8')
  }
}
