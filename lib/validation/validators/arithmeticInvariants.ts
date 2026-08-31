/**
 * Invariant Validators for Modular Arithmetic Operations (e.g., RSA, ECC)
 * Checks domain constraints, field operations, and mathematical invariants
 */

import type {
  AlgorithmInvariantValidator,
  InvariantCheckResult,
  ValidationResult,
} from '../invariantSchema';

/**
 * Modular arithmetic invariant validator
 */
export class ModularArithmeticInvariantValidator implements AlgorithmInvariantValidator {
  algorithmId: string;
  name: string;

  private invariants = [
    'modulus_bounds',
    'field_membership',
    'operation_closure',
    'exponent_validity',
  ];

  constructor(algorithmId: string = 'rsa') {
    this.algorithmId = algorithmId;
    this.name = `ModularArithmetic_${algorithmId}`;
  }

  validateStep(
    stepIndex: number,
    state: Record<string, unknown>,
    context?: Record<string, unknown>
  ): InvariantCheckResult[] {
    const results: InvariantCheckResult[] = [];

    if (!context?.modulus) {
      return results;
    }

    // Check 1: Values within modulus bounds
    results.push(this.checkModulusBounds(stepIndex, state, context));

    // Check 2: Field membership
    results.push(this.checkFieldMembership(stepIndex, state, context));

    // Check 3: Operation closure
    if (context?.operation) {
      results.push(this.checkOperationClosure(stepIndex, state, context));
    }

    // Check 4: Exponent validity
    if (context?.exponent) {
      results.push(this.checkExponentValidity(stepIndex, state, context));
    }

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

  private checkModulusBounds(
    stepIndex: number,
    state: Record<string, unknown>,
    context: Record<string, unknown>
  ): InvariantCheckResult {
    const modulus = context.modulus as bigint | number;
    const value = state.result as bigint | number;

    if (typeof value !== 'number' && typeof value !== 'bigint') {
      return {
        invariantName: 'modulus_bounds',
        passed: false,
        error: 'Value is not a number or bigint',
        stepIndex,
        expectedConstraint: 'All values must be numeric (number or bigint)',
      };
    }

    const bigValue = typeof value === 'bigint' ? value : BigInt(value);
    const bigMod = typeof modulus === 'bigint' ? modulus : BigInt(modulus);

    if (bigValue < 0n || bigValue >= bigMod) {
      return {
        invariantName: 'modulus_bounds',
        passed: false,
        error: `Value ${value} out of bounds [0, ${modulus})`,
        failedState: state,
        stepIndex,
        expectedConstraint: `All values must satisfy 0 ≤ value < ${modulus}`,
      };
    }

    return {
      invariantName: 'modulus_bounds',
      passed: true,
      stepIndex,
    };
  }

  private checkFieldMembership(
    stepIndex: number,
    state: Record<string, unknown>,
    context: Record<string, unknown>
  ): InvariantCheckResult {
    const fieldOrder = context.fieldOrder as bigint | number;
    const element = state.element as bigint | number;

    if (!element && element !== 0) {
      return {
        invariantName: 'field_membership',
        passed: true,
        stepIndex,
      };
    }

    const bigElement =
      typeof element === 'bigint' ? element : BigInt(element || 0);
    const bigOrder =
      typeof fieldOrder === 'bigint' ? fieldOrder : BigInt(fieldOrder || 0);

    if (bigElement < 0n || bigElement >= bigOrder) {
      return {
        invariantName: 'field_membership',
        passed: false,
        error: `Element ${element} not member of field with order ${fieldOrder}`,
        failedState: state,
        stepIndex,
        expectedConstraint: `Element must be in field [0, ${fieldOrder})`,
      };
    }

    return {
      invariantName: 'field_membership',
      passed: true,
      stepIndex,
    };
  }

  private checkOperationClosure(
    stepIndex: number,
    state: Record<string, unknown>,
    context: Record<string, unknown>
  ): InvariantCheckResult {
    const operation = context.operation as string;
    const result = state.result as bigint | number;
    const modulus = context.modulus as bigint | number;

    if (!result && result !== 0) {
      return {
        invariantName: 'operation_closure',
        passed: false,
        error: 'Operation result is missing',
        stepIndex,
        expectedConstraint: 'Operation must produce valid result',
      };
    }

    // Verify result is in valid range after operation
    const bigResult = typeof result === 'bigint' ? result : BigInt(result || 0);
    const bigMod = typeof modulus === 'bigint' ? modulus : BigInt(modulus || 0);

    if (bigResult < 0n || bigResult >= bigMod) {
      return {
        invariantName: 'operation_closure',
        passed: false,
        error: `${operation} result ${result} not closed under modulus`,
        failedState: state,
        stepIndex,
        phase: `operation_${operation}`,
        expectedConstraint: `Operation result must be in [0, ${modulus})`,
      };
    }

    return {
      invariantName: 'operation_closure',
      passed: true,
      stepIndex,
    };
  }

  private checkExponentValidity(
    stepIndex: number,
    state: Record<string, unknown>,
    context: Record<string, unknown>
  ): InvariantCheckResult {
    const exponent = context.exponent as bigint | number;
    const order = context.order as bigint | number;

    if (!exponent || exponent <= 0) {
      return {
        invariantName: 'exponent_validity',
        passed: false,
        error: `Invalid exponent: ${exponent}`,
        stepIndex,
        expectedConstraint: 'Exponent must be positive integer',
      };
    }

    if (order) {
      const bigExp = typeof exponent === 'bigint' ? exponent : BigInt(exponent);
      const bigOrd =
        typeof order === 'bigint' ? order : BigInt(order);

      if (bigExp >= bigOrd) {
        return {
          invariantName: 'exponent_validity',
          passed: false,
          error: `Exponent ${exponent} exceeds group order ${order}`,
          stepIndex,
          expectedConstraint: 'Exponent should be less than group order',
        };
      }
    }

    return {
      invariantName: 'exponent_validity',
      passed: true,
      stepIndex,
    };
  }
}