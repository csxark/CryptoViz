/**
 * CI integration utilities for automated performance regression detection.
 * Provides programmatic interfaces for CI/CD pipelines to detect performance regressions.
 */

import type {
  PerformanceProfile,
  PerformanceComparison,
  RegressionThresholds,
} from './types'
import { BaselineManager } from './baseline'
import { PerformanceReporter } from './reporter'

export interface CIRegressionCheckResult {
  success: boolean
  regressions: PerformanceComparison[]
  improvements: PerformanceComparison[]
  summary: {
    totalChecked: number
    regressionCount: number
    improvementCount: number
    stableCount: number
    inconclusiveCount: number
  }
  exitCode: number
  message: string
}

export interface CIOptions {
  failOnRegression?: boolean
  failOnInconclusive?: boolean
  thresholds?: Partial<RegressionThresholds>
  outputFormat?: 'text' | 'json' | 'markdown' | string
  outputFile?: string
  verbose?: boolean
}

export class PerformanceCI {
  /**
   * Run automated regression check for CI/CD
   */
  static async runRegressionCheck(
    profiles: PerformanceProfile[],
    options: CIOptions = {},
  ): Promise<CIRegressionCheckResult> {
    const opts = {
      failOnRegression: true,
      failOnInconclusive: false,
      outputFormat: 'text',
      verbose: false,
      ...options,
    }

    // Compare profiles against baselines
    const comparisons = await BaselineManager.batchCompare(profiles, opts.thresholds)

    // Categorize results
    const regressions = comparisons.filter((c) => c.regression === 'regression')
    const improvements = comparisons.filter((c) => c.regression === 'improvement')
    const stable = comparisons.filter((c) => c.regression === 'stable')
    const inconclusive = comparisons.filter((c) => c.regression === 'inconclusive')

    const summary = {
      totalChecked: comparisons.length,
      regressionCount: regressions.length,
      improvementCount: improvements.length,
      stableCount: stable.length,
      inconclusiveCount: inconclusive.length,
    }

    // Determine success
    let success = true
    if (opts.failOnRegression && regressions.length > 0) {
      success = false
    }
    if (opts.failOnInconclusive && inconclusive.length > 0) {
      success = false
    }

    // Generate message
    const message = this.generateCheckMessage(summary, opts.verbose)

    // Generate report if output file specified
    if (opts.outputFile) {
      const report = await PerformanceReporter.generateReport(profiles, comparisons)
      const format: 'text' | 'json' | 'markdown' = (opts.outputFormat as 'text' | 'json' | 'markdown') || 'text'
      PerformanceReporter.exportReportToFile(report, opts.outputFile, format)
    }

    // Determine exit code
    let exitCode = 0
    if (!success) {
      exitCode = regressions.length > 0 ? 1 : 2
    }

    return {
      success,
      regressions,
      improvements,
      summary,
      exitCode,
      message,
    }
  }

  /**
   * Generate human-readable check message
   */
  private static generateCheckMessage(
    summary: {
      totalChecked: number
      regressionCount: number
      improvementCount: number
      stableCount: number
      inconclusiveCount: number
    },
    verbose: boolean,
  ): string {
    const lines: string[] = []

    lines.push('Performance Regression Check Results:')
    lines.push(`  Total Checked: ${summary.totalChecked}`)
    lines.push(`  Regressions: ${summary.regressionCount}`)
    lines.push(`  Improvements: ${summary.improvementCount}`)
    lines.push(`  Stable: ${summary.stableCount}`)
    lines.push(`  Inconclusive: ${summary.inconclusiveCount}`)

    if (summary.regressionCount > 0) {
      lines.push('')
      lines.push('❌ Performance regressions detected!')
    } else if (summary.improvementCount > 0) {
      lines.push('')
      lines.push('✅ Performance improvements detected!')
    } else {
      lines.push('')
      lines.push('✅ Performance is stable!')
    }

    if (verbose) {
      lines.push('')
      lines.push('Run with detailed report output for more information.')
    }

    return lines.join('\n')
  }

  /**
   * Generate GitHub Actions annotations for regressions
   */
  static generateGitHubAnnotations(comparisons: PerformanceComparison[]): string[] {
    const annotations: string[] = []

    for (const comparison of comparisons) {
      if (comparison.regression === 'regression') {
        const execChange = comparison.differences.executionTime.averageChangePercent
        const memChange = comparison.differences.memoryUsage.averageChangePercent

        annotations.push(
          `::error title=Performance Regression::${comparison.current.cipherName}: Execution time changed by ${execChange.toFixed(2)}%, Memory changed by ${memChange.toFixed(2)}%`,
        )
      } else if (comparison.regression === 'improvement') {
        const execChange = comparison.differences.executionTime.averageChangePercent
        annotations.push(
          `::notice title=Performance Improvement::${comparison.current.cipherName}: Execution time changed by ${execChange.toFixed(2)}%`,
        )
      }
    }

    return annotations
  }

  /**
   * Generate Jenkins-like markup for regressions
   */
  static generateJenkinsMarkup(comparisons: PerformanceComparison[]): string {
    const lines: string[] = []

    lines.push('<h2>Performance Regression Check</h2>')
    lines.push('<table>')
    lines.push('<tr><th>Cipher</th><th>Status</th><th>Execution Time Change</th><th>Memory Change</th></tr>')

    for (const comparison of comparisons) {
      const statusColor = comparison.regression === 'regression' ? 'red' : comparison.regression === 'improvement' ? 'green' : 'gray'
      const execChange = comparison.differences.executionTime.averageChangePercent.toFixed(2)
      const memChange = comparison.differences.memoryUsage.averageChangePercent.toFixed(2)

      lines.push(
        `<tr><td>${comparison.current.cipherName}</td><td style="color: ${statusColor}">${comparison.regression}</td><td>${execChange}%</td><td>${memChange}%</td></tr>`,
      )
    }

    lines.push('</table>')

    return lines.join('\n')
  }

  /**
   * Check if performance profile meets minimum performance requirements
   */
  static checkPerformanceThresholds(
    profile: PerformanceProfile,
    thresholds: {
      maxExecutionTimeMs?: number
      maxMemoryBytes?: number
      minThroughputBytesPerSecond?: number
    },
  ): {
    passed: boolean
    failures: string[]
  } {
    const failures: string[] = []

    if (thresholds.maxExecutionTimeMs && profile.metrics.executionTime.averageMs > thresholds.maxExecutionTimeMs) {
      failures.push(
        `Execution time ${profile.metrics.executionTime.averageMs.toFixed(3)}ms exceeds threshold ${thresholds.maxExecutionTimeMs}ms`,
      )
    }

    if (thresholds.maxMemoryBytes && profile.metrics.memoryUsage.averageBytes > thresholds.maxMemoryBytes) {
      failures.push(
        `Memory usage ${profile.metrics.memoryUsage.averageBytes} bytes exceeds threshold ${thresholds.maxMemoryBytes} bytes`,
      )
    }

    if (thresholds.minThroughputBytesPerSecond && profile.metrics.throughput) {
      if (profile.metrics.throughput.bytesPerSecond < thresholds.minThroughputBytesPerSecond) {
        failures.push(
          `Throughput ${profile.metrics.throughput.bytesPerSecond.toFixed(0)} bytes/s below threshold ${thresholds.minThroughputBytesPerSecond} bytes/s`,
        )
      }
    }

    return {
      passed: failures.length === 0,
      failures,
    }
  }

  /**
   * Generate performance trend data for time-series plotting
   */
  static generateTrendData(
    profiles: PerformanceProfile[],
  ): {
    cipherId: string
    timestamp: number
    executionTimeMs: number
    memoryBytes: number
    throughputBytesPerSecond?: number
  }[] {
    return profiles.map((profile) => ({
      cipherId: profile.cipherId,
      timestamp: profile.timestamp.getTime(),
      executionTimeMs: profile.metrics.executionTime.averageMs,
      memoryBytes: profile.metrics.memoryUsage.averageBytes,
      throughputBytesPerSecond: profile.metrics.throughput?.bytesPerSecond,
    }))
  }

  /**
   * Export performance metrics in Prometheus format
   */
  static exportPrometheusMetrics(profiles: PerformanceProfile[]): string {
    const lines: string[] = []

    lines.push('# HELP cipher_execution_time_ms Average execution time in milliseconds')
    lines.push('# TYPE cipher_execution_time_ms gauge')

    for (const profile of profiles) {
      lines.push(
        `cipher_execution_time_ms{cipher="${profile.cipherId}",category="${profile.category}",operation="${profile.operation}"} ${profile.metrics.executionTime.averageMs}`,
      )
    }

    lines.push('# HELP cipher_memory_bytes Average memory usage in bytes')
    lines.push('# TYPE cipher_memory_bytes gauge')

    for (const profile of profiles) {
      lines.push(
        `cipher_memory_bytes{cipher="${profile.cipherId}",category="${profile.category}",operation="${profile.operation}"} ${profile.metrics.memoryUsage.averageBytes}`,
      )
    }

    if (profiles.some((p) => p.metrics.throughput)) {
      lines.push('# HELP cipher_throughput_bytes_per_second Throughput in bytes per second')
      lines.push('# TYPE cipher_throughput_bytes_per_second gauge')

      for (const profile of profiles) {
        if (profile.metrics.throughput) {
          lines.push(
            `cipher_throughput_bytes_per_second{cipher="${profile.cipherId}",category="${profile.category}",operation="${profile.operation}"} ${profile.metrics.throughput.bytesPerSecond}`,
          )
        }
      }
    }

    return lines.join('\n')
  }

  /**
   * Create performance baseline from current profiles for CI
   */
  static createCIBaseline(
    profiles: PerformanceProfile[],
    version: string,
    commitHash: string,
  ): void {
    for (const profile of profiles) {
      BaselineManager.saveBaseline(profile, version, commitHash)
    }
  }

  /**
   * Validate that all profiles have corresponding baselines
   */
  static validateBaselinesExist(profiles: PerformanceProfile[]): {
    missing: string[]
    allPresent: boolean
  } {
    const missing: string[] = []

    for (const profile of profiles) {
      const baseline = BaselineManager.getBaseline(profile.cipherId)
      if (!baseline) {
        missing.push(profile.cipherId)
      }
    }

    return {
      missing,
      allPresent: missing.length === 0,
    }
  }

  /**
   * Get recommended CI configuration
   */
  static getRecommendedCIConfig(): string {
    return `# Performance Profiling CI Configuration
# Add this to your CI/CD pipeline

# Environment variables to set:
# - PERFORMANCE_FAIL_ON_REGRESSION: "true" (default)
# - PERFORMANCE_FAIL_ON_INCONCLUSIVE: "false" (default)
# - PERFORMANCE_OUTPUT_FORMAT: "text" (options: text, json, markdown)
# - PERFORMANCE_THRESHOLD_EXECUTION_TIME: "10" (percentage)
# - PERFORMANCE_THRESHOLD_MEMORY: "15" (percentage)
# - PERFORMANCE_THRESHOLD_THROUGHPUT: "10" (percentage)

# Example workflow steps:
# 1. Run performance profiling
# 2. Compare against baselines
# 3. Fail if regressions detected
# 4. Generate performance report
# 5. Upload artifacts

# Node.js example:
# npm run performance:profile
# npm run performance:check

# Browser example:
# Run performance profiling in browser environment
# Export results as JSON
# Run comparison in CI environment
`
  }
}
