/**
 * Reusable Conformance Testing Harness
 * Validates algorithm implementations against known-answer test vectors
 */

import type {
  TestVectorSet,
  TestVector,
  ConformanceTestResult,
  ConformanceSummary,
} from './testVectorFormat';

/**
 * Algorithm execution interface for conformance testing
 */
export interface ConformanceExecutor {
  /** Execute algorithm and return result */
  execute(vector: TestVector): Promise<{
    output: Record<string, string>;
    intermediateStates?: Array<{ step: number | string; state: Record<string, string> }>;
  }>;
}

/**
 * Main conformance harness
 */
export class ConformanceHarness {
  private executor: ConformanceExecutor;
  private algorithm: string;
  private variant: string;

  constructor(algorithm: string, variant: string, executor: ConformanceExecutor) {
    this.algorithm = algorithm;
    this.variant = variant;
    this.executor = executor;
  }

  /**
   * Run conformance tests against a test vector set
   */
  async runTestVectorSet(vectors: TestVectorSet): Promise<ConformanceSummary> {
    if (vectors.algorithm !== this.algorithm) {
      throw new Error(
        `Algorithm mismatch: harness expects ${this.algorithm}, vectors contain ${vectors.algorithm}`
      );
    }

    const results: ConformanceTestResult[] = [];
    const startTime = Date.now();

    for (const vector of vectors.vectors) {
      const testResult = await this.executeTestVector(vector);
      results.push(testResult);
    }

    const passedTests = results.filter((r) => r.passed).length;
    const failedTests = results.filter((r) => !r.passed).length;

    return {
      algorithm: this.algorithm,
      variant: this.variant,
      totalTests: results.length,
      passedTests,
      failedTests,
      results,
      timestamp: Date.now(),
      totalTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Execute single test vector
   */
  private async executeTestVector(vector: TestVector): Promise<ConformanceTestResult> {
    const startTime = Date.now();

    try {
      const result = await this.executor.execute(vector);

      // Validate final output
      const outputValidation = this.validateOutput(vector.expectedOutput as any, result.output as any);
      if (outputValidation.failed) {
        return {
          testId: vector.testId,
          passed: false,
          error: 'Output mismatch',
          failedField: outputValidation.field,
          expected: outputValidation.expected,
          actual: outputValidation.actual,
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Validate intermediate states if provided
      if (vector.intermediateStates && result.intermediateStates) {
        const stateValidation = this.validateIntermediateStates(
          vector.intermediateStates,
          result.intermediateStates
        );
        if (stateValidation.failed) {
          return {
            testId: vector.testId,
            passed: false,
            error: `Intermediate state mismatch at ${stateValidation.step}`,
            failedField: stateValidation.field,
            expected: stateValidation.expected,
            actual: stateValidation.actual,
            executionTimeMs: Date.now() - startTime,
          };
        }
      }

      return {
        testId: vector.testId,
        passed: true,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        testId: vector.testId,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate final output against expected
   */
  private validateOutput(
    expected: Record<string, string>,
    actual: Record<string, string>
  ): { failed: boolean; field?: string; expected?: string; actual?: string } {
    for (const [key, expectedValue] of Object.entries(expected)) {
      if (expectedValue === undefined) continue;

      const actualValue = actual[key];
      if (actualValue !== expectedValue) {
        return {
          failed: true,
          field: key,
          expected: expectedValue,
          actual: actualValue,
        };
      }
    }

    return { failed: false };
  }

  /**
   * Validate intermediate states
   */
  private validateIntermediateStates(
    expected: Array<{ step: number | string; state: Record<string, string> }>,
    actual: Array<{ step: number | string; state: Record<string, string> }>
  ): {
    failed: boolean;
    step?: string;
    field?: string;
    expected?: string;
    actual?: string;
  } {
    const actualMap = new Map(actual.map((s) => [String(s.step), s.state]));

    for (const expectedStep of expected) {
      const stepKey = String(expectedStep.step);
      const actualState = actualMap.get(stepKey);

      if (!actualState) {
        return {
          failed: true,
          step: stepKey,
           
        };
      }

      for (const [key, expectedValue] of Object.entries(expectedStep.state)) {
        const actualValue = actualState[key];
        if (actualValue !== expectedValue) {
          return {
            failed: true,
            step: stepKey,
            field: key,
            expected: expectedValue,
            actual: actualValue,
          };
        }
      }
    }

    return { failed: false };
  }
}

/**
 * Format conformance results for CLI output
 */
export function formatConformanceResults(summary: ConformanceSummary): string {
  const lines: string[] = [];

  lines.push(`\n${'='.repeat(60)}`);
  lines.push(`Conformance Test Results: ${summary.algorithm} (${summary.variant})`);
  lines.push(`${'='.repeat(60)}`);

  lines.push(`Total Tests:    ${summary.totalTests}`);
  lines.push(`Passed:         ${summary.passedTests} ✓`);
  lines.push(`Failed:         ${summary.failedTests} ✗`);
  lines.push(`Execution Time: ${summary.totalTimeMs}ms`);

  if (summary.failedTests > 0) {
    lines.push(`\n${'─'.repeat(60)}`);
    lines.push('Failed Tests:');
    lines.push(`${'─'.repeat(60)}`);

    summary.results
      .filter((r) => !r.passed)
      .slice(0, 10)
      .forEach((result) => {
        lines.push(`\n  ${result.testId}`);
        lines.push(`    Error: ${result.error}`);
        if (result.failedField) {
          lines.push(`    Field: ${result.failedField}`);
          lines.push(`    Expected: ${result.expected}`);
          lines.push(`    Actual:   ${result.actual}`);
        }
      });

    if (summary.failedTests > 10) {
      lines.push(`\n  ... and ${summary.failedTests - 10} more failures`);
    }
  }

  lines.push(`\n${'='.repeat(60)}\n`);

  return lines.join('\n');
}