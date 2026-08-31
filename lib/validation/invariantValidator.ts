/**
 * Core Invariant Validation Framework
 * Manages algorithm validators and orchestrates validation
 */

import type {
  AlgorithmInvariantValidator,
  ValidationResult,
  ValidationConfig,
  InvariantCheckResult,
} from './invariantSchema';
import { InvariantValidationError } from './invariantSchema';

/**
 * Central validator that manages algorithm-specific validators
 */
export class InvariantValidationEngine {
  private validators: Map<string, AlgorithmInvariantValidator> = new Map();
  private config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV === 'development',
      failFast: false,
      verbose: process.env.NODE_ENV === 'development',
      throwOnError: false,
      ...config,
    };
  }

  /**
   * Register an algorithm validator
   */
  public registerValidator(validator: AlgorithmInvariantValidator): void {
    this.validators.set(validator.algorithmId, validator);
  }

  /**
   * Check if validator exists for algorithm
   */
  public hasValidator(algorithmId: string): boolean {
    return this.validators.has(algorithmId);
  }

  /**
   * Validate a single step
   */
  public validateStep(
    algorithmId: string,
    stepIndex: number,
    state: Record<string, unknown>,
    context?: Record<string, unknown>
  ): InvariantCheckResult[] {
    if (!this.config.enabled) return [];

    const validator = this.validators.get(algorithmId);
    if (!validator) {
      if (this.config.verbose) {
        console.warn(`No validator registered for algorithm: ${algorithmId}`);
      }
      return [];
    }

    try {
      const results = validator.validateStep(stepIndex, state, context);

      if (this.config.verbose) {
        this.logResults(algorithmId, stepIndex, results);
      }

      if (this.config.throwOnError) {
        const failed = results.find(r => !r.passed);
        if (failed) {
          throw new InvariantValidationError(
            algorithmId,
            stepIndex,
            failed.invariantName,
            failed.error || 'Invariant check failed',
            failed.failedState,
            failed.expectedConstraint
          );
        }
      }

      return results;
    } catch (error) {
      if (error instanceof InvariantValidationError) throw error;
      console.error(`Validation error for ${algorithmId}:`, error);
      return [];
    }
  }

  /**
   * Validate entire trace
   */
  public validateTrace(
    algorithmId: string,
    trace: { steps: Array<{ stepIndex: number; output: Record<string, unknown> }> },
    context?: Record<string, unknown>
  ): ValidationResult {
    if (!this.config.enabled) {
      return {
        isValid: true,
        checks: [],
        failedInvariants: [],
        totalChecks: 0,
        timestamp: Date.now(),
      };
    }

    const validator = this.validators.get(algorithmId);
    if (!validator) {
      return {
        isValid: true,
        checks: [],
        failedInvariants: [],
        totalChecks: 0,
        timestamp: Date.now(),
      };
    }

    try {
      const result = validator.validateTrace(trace, context);

      if (this.config.verbose) {
        console.log(
          `Trace validation for ${algorithmId}:`,
          result.isValid ? 'PASSED' : 'FAILED'
        );
        if (result.failedInvariants.length > 0) {
          console.log('Failed invariants:', result.failedInvariants);
        }
      }

      if (this.config.throwOnError && !result.isValid) {
        const firstError = result.checks.find(c => !c.passed);
        if (firstError) {
          throw new InvariantValidationError(
            algorithmId,
            firstError.stepIndex || 0,
            firstError.invariantName,
            firstError.error || 'Invariant check failed',
            firstError.failedState,
            firstError.expectedConstraint
          );
        }
      }

      return result;
    } catch (error) {
      if (error instanceof InvariantValidationError) throw error;
      console.error(`Trace validation error for ${algorithmId}:`, error);
      return {
        isValid: false,
        checks: [],
        failedInvariants: ['Validation engine error'],
        totalChecks: 0,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Update validation config
   */
  public setConfig(config: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get list of registered algorithms
   */
  public getRegisteredAlgorithms(): string[] {
    return Array.from(this.validators.keys());
  }

  /**
   * Get supported invariants for algorithm
   */
  public getInvariants(algorithmId: string): string[] {
    return this.validators.get(algorithmId)?.getInvariants() || [];
  }

  private logResults(
    algorithmId: string,
    stepIndex: number,
    results: InvariantCheckResult[]
  ): void {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    console.log(
      `[${algorithmId}] Step ${stepIndex}: ${passed} passed, ${failed} failed`
    );

    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.warn(`  ✗ ${r.invariantName}: ${r.error}`);
      });
  }
}

/**
 * Global validation engine instance
 */
let globalEngine: InvariantValidationEngine | null = null;

/**
 * Get or create global validation engine
 */
export function getValidationEngine(
  config?: Partial<ValidationConfig>
): InvariantValidationEngine {
  if (!globalEngine) {
    globalEngine = new InvariantValidationEngine(config);
  }
  return globalEngine;
}