/**
 * Invariant Validators for Block Cipher Algorithms (e.g., AES)
 * Checks state dimensions, round structure, and key schedule consistency
 */

import type {
  AlgorithmInvariantValidator,
  InvariantCheckResult,
  ValidationResult,
} from '../invariantSchema';

/**
 * Block cipher invariant validator
 */
export class BlockCipherInvariantValidator implements AlgorithmInvariantValidator {
  algorithmId: string;
  name: string;

  private invariants = [
    'state_dimensions',
    'state_values_range',
    'round_key_consistency',
    'block_structure',
  ];

  constructor(algorithmId: string = 'aes', blockSize: number = 128) {
    this.algorithmId = algorithmId;
    this.name = `BlockCipher_${algorithmId}`;
  }

  validateStep(
    stepIndex: number,
    state: Record<string, unknown>,
    context?: Record<string, unknown>
  ): InvariantCheckResult[] {
    const results: InvariantCheckResult[] = [];

    // Check 1: State dimensions
    results.push(this.checkStateDimensions(stepIndex, state));

    // Check 2: State values in valid range (0-255 for bytes)
    results.push(this.checkStateValuesRange(stepIndex, state));

    // Check 3: Round key consistency
    if (context?.roundKey) {
      results.push(this.checkRoundKeyConsistency(stepIndex, state, context));
    }

    // Check 4: Block structure preserved
    results.push(this.checkBlockStructure(stepIndex, state));

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

  private checkStateDimensions(
    stepIndex: number,
    state: Record<string, unknown>
  ): InvariantCheckResult {
    const stateArray = state.state as any[];

    if (!Array.isArray(stateArray)) {
      return {
        invariantName: 'state_dimensions',
        passed: false,
        error: 'State is not an array',
        stepIndex,
        expectedConstraint: 'State must be array of bytes (4x4 for AES)',
      };
    }

    const expectedLength = 16; // AES block size
    if (stateArray.length !== expectedLength) {
      return {
        invariantName: 'state_dimensions',
        passed: false,
        error: `State length ${stateArray.length}, expected ${expectedLength}`,
        failedState: state,
        stepIndex,
        expectedConstraint: `State array length must be ${expectedLength}`,
      };
    }

    return {
      invariantName: 'state_dimensions',
      passed: true,
      stepIndex,
    };
  }

  private checkStateValuesRange(
    stepIndex: number,
    state: Record<string, unknown>
  ): InvariantCheckResult {
    const stateArray = state.state as number[];

    if (!Array.isArray(stateArray)) {
      return {
        invariantName: 'state_values_range',
        passed: true,
        stepIndex,
      };
    }

    const invalidByte = stateArray.find(b => typeof b !== 'number' || b < 0 || b > 255);

    if (invalidByte !== undefined) {
      return {
        invariantName: 'state_values_range',
        passed: false,
        error: `Invalid byte value: ${invalidByte}`,
        failedState: state,
        stepIndex,
        expectedConstraint: 'All state bytes must be in range [0, 255]',
      };
    }

    return {
      invariantName: 'state_values_range',
      passed: true,
      stepIndex,
    };
  }

  private checkRoundKeyConsistency(
    stepIndex: number,
    state: Record<string, unknown>,
    context: Record<string, unknown>
  ): InvariantCheckResult {
    const roundKey = context.roundKey as number[];
    const round = context.round as number;

    if (!Array.isArray(roundKey)) {
      return {
        invariantName: 'round_key_consistency',
        passed: true,
        stepIndex,
      };
    }

    if (roundKey.length !== 16) {
      return {
        invariantName: 'round_key_consistency',
        passed: false,
        error: `Round key length ${roundKey.length}, expected 16`,
        stepIndex,
        phase: `round_${round}`,
        expectedConstraint: 'Round key must be 16 bytes',
      };
    }

    return {
      invariantName: 'round_key_consistency',
      passed: true,
      stepIndex,
    };
  }

  private checkBlockStructure(
    stepIndex: number,
    state: Record<string, unknown>
  ): InvariantCheckResult {
    // Block structure is valid if state is properly formed array
    const stateArray = state.state as any[];

    if (!Array.isArray(stateArray) || stateArray.length === 0) {
      return {
        invariantName: 'block_structure',
        passed: false,
        error: 'Block structure invalid',
        stepIndex,
        expectedConstraint: 'Block must maintain 4x4 byte matrix structure',
      };
    }

    return {
      invariantName: 'block_structure',
      passed: true,
      stepIndex,
    };
  }
}