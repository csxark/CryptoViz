/**
 * Invariant Validators for Hash Function Algorithms (e.g., SHA-256)
 * Checks working variable consistency, word structure, and state transitions
 */

import type {
  AlgorithmInvariantValidator,
  InvariantCheckResult,
  ValidationResult,
} from '../invariantSchema';

/**
 * Hash function invariant validator
 */
export class HashFunctionInvariantValidator implements AlgorithmInvariantValidator {
  algorithmId: string;
  name: string;

  private invariants = [
    'word_size_consistency',
    'working_variable_bounds',
    'message_schedule_integrity',
    'state_transition_validity',
  ];

  constructor(algorithmId: string = 'sha256', wordSize: number = 32) {
    this.algorithmId = algorithmId;
    this.name = `HashFunction_${algorithmId}`;
  }

  validateStep(
    stepIndex: number,
    state: Record<string, unknown>,
    context?: Record<string, unknown>
  ): InvariantCheckResult[] {
    const results: InvariantCheckResult[] = [];

    // Check 1: Word size consistency
    results.push(this.checkWordSizeConsistency(stepIndex, state));

    // Check 2: Working variables in valid range
    results.push(this.checkWorkingVariableBounds(stepIndex, state));

    // Check 3: Message schedule integrity
    if (context?.messageSchedule) {
      results.push(this.checkMessageScheduleIntegrity(stepIndex, state, context));
    }

    // Check 4: State transition validity
    results.push(this.checkStateTransitionValidity(stepIndex, state, context));

    return results;
  }

  validateTrace(
    trace: { steps: Array<{ stepIndex: number; output: Record<string, unknown> }> },
    context?: Record<string, unknown>
  ): ValidationResult {
    const checks: InvariantCheckResult[] = [];

    trace.steps.forEach(step => {
      const stepChecks = this.validateStep(step.stepIndex, step.output, context);
      checks.push(...stepChecks);
    });

    const failedInvariants = [
      ...new Set(checks.filter(c => !c.passed).map(c => c.invariantName)),
    ];

    return {
      isValid: failedInvariants.length === 0,
      checks,
      failedInvariants,
      totalChecks: checks.length,
      timestamp: Date.now(),
    };
  }

  getInvariants(): string[] {
    return this.invariants;
  }

  private checkWordSizeConsistency(
    stepIndex: number,
    state: Record<string, unknown>
  ): InvariantCheckResult {
    const workingVars = state.workingVariables as Record<string, number>;

    if (!workingVars || typeof workingVars !== 'object') {
      return {
        invariantName: 'word_size_consistency',
        passed: false,
        error: 'Missing or invalid working variables',
        stepIndex,
        expectedConstraint: 'Working variables must be defined',
      };
    }

    // SHA-256 uses 32-bit words
    const wordSize = 32;
    const maxValue = (1 << wordSize) - 1;

    for (const [key, value] of Object.entries(workingVars)) {
      if (typeof value !== 'number' || value < 0 || value > maxValue) {
        return {
          invariantName: 'word_size_consistency',
          passed: false,
          error: `Word ${key} exceeds ${wordSize}-bit range: ${value}`,
          failedState: state,
          stepIndex,
          expectedConstraint: `All words must fit in ${wordSize}-bit range [0, ${maxValue}]`,
        };
      }
    }

    return {
      invariantName: 'word_size_consistency',
      passed: true,
      stepIndex,
    };
  }

  private checkWorkingVariableBounds(
    stepIndex: number,
    state: Record<string, unknown>
  ): InvariantCheckResult {
    const workingVars = state.workingVariables as Record<string, number>;

    if (!workingVars) {
      return {
        invariantName: 'working_variable_bounds',
        passed: true,
        stepIndex,
      };
    }

    // SHA-256 works with 8 working variables (A-H)
    const expectedCount = 8;
    const actualCount = Object.keys(workingVars).length;

    if (actualCount !== expectedCount) {
      return {
        invariantName: 'working_variable_bounds',
        passed: false,
        error: `Expected ${expectedCount} variables, got ${actualCount}`,
        stepIndex,
        expectedConstraint: `Exactly ${expectedCount} working variables required`,
      };
    }

    return {
      invariantName: 'working_variable_bounds',
      passed: true,
      stepIndex,
    };
  }

  private checkMessageScheduleIntegrity(
    stepIndex: number,
    state: Record<string, unknown>,
    context: Record<string, unknown>
  ): InvariantCheckResult {
    const messageSchedule = context.messageSchedule as number[];

    if (!Array.isArray(messageSchedule)) {
      return {
        invariantName: 'message_schedule_integrity',
        passed: false,
        error: 'Message schedule is not an array',
        stepIndex,
        expectedConstraint: 'Message schedule must be array of 32-bit words',
      };
    }

    // SHA-256 message schedule has 64 words
    if (messageSchedule.length !== 64) {
      return {
        invariantName: 'message_schedule_integrity',
        passed: false,
        error: `Message schedule length ${messageSchedule.length}, expected 64`,
        stepIndex,
        expectedConstraint: 'SHA-256 message schedule must have exactly 64 words',
      };
    }

    return {
      invariantName: 'message_schedule_integrity',
      passed: true,
      stepIndex,
    };
  }

  private checkStateTransitionValidity(
    stepIndex: number,
    state: Record<string, unknown>,
    context?: Record<string, unknown>
  ): InvariantCheckResult {
    const workingVars = state.workingVariables as Record<string, number>;

    if (!workingVars || Object.keys(workingVars).length === 0) {
      return {
        invariantName: 'state_transition_validity',
        passed: false,
        error: 'No working variables in state',
        stepIndex,
        expectedConstraint: 'State must contain working variables after each step',
      };
    }

    return {
      invariantName: 'state_transition_validity',
      passed: true,
      stepIndex,
    };
  }
}