/**
 * Trace Schema Validation Utilities
 */

import type { AlgorithmTrace, InvalidTrace, ValidatedTrace } from './traceSchema';

/**
 * Validate trace against schema version 1.0
 */
export function validateTrace(trace: unknown): trace is ValidatedTrace {
  if (!trace || typeof trace !== 'object') return false;

  const t = trace as any;

  // Required fields
  const hasRequired =
    t.schemaVersion === '1.0' &&
    typeof t.traceId === 'string' &&
    typeof t.algorithmId === 'string' &&
    typeof t.algorithmVersion === 'string' &&
    typeof t.timestamp === 'number' &&
    Array.isArray(t.steps) &&
    t.terminal &&
    typeof t.terminal.success === 'boolean';

  if (!hasRequired) return false;

  // Validate steps
  for (let i = 0; i < t.steps.length; i++) {
    const step = t.steps[i];
    if (
      typeof step.stepIndex !== 'number' ||
      typeof step.phase !== 'string' ||
      !step.transformation ||
      !step.output
    ) {
      return false;
    }
  }

  // Validate terminal state
  if (!t.terminal.result || typeof t.terminal.totalTimeMs !== 'number') {
    return false;
  }

  return true;
}

/**
 * Check for trace transition validity
 */
export function isValidTransition(
  fromPhase: string,
  toPhase: string,
  phaseOrder: string[]
): boolean {
  const fromIdx = phaseOrder.indexOf(fromPhase);
  const toIdx = phaseOrder.indexOf(toPhase);

  if (fromIdx === -1 || toIdx === -1) return false;

  // Can stay in same phase or advance
  return toIdx >= fromIdx;
}

/**
 * Validate entire trace for schema compliance and logical consistency
 */
export function performDeepValidation(
  trace: AlgorithmTrace
): ValidatedTrace | InvalidTrace {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Schema validation
  if (trace.schemaVersion !== '1.0') {
    errors.push(`Unsupported schema version: ${trace.schemaVersion}`);
  }

  // Trace ID validation
  if (!trace.traceId || trace.traceId.length === 0) {
    errors.push('Missing or empty traceId');
  }

  // Steps validation
  if (!Array.isArray(trace.steps) || trace.steps.length === 0) {
    errors.push('Steps array missing or empty');
  } else {
    for (let i = 0; i < trace.steps.length; i++) {
      const step = trace.steps[i];
      if (step.stepIndex !== i) {
        errors.push(`Step index mismatch at position ${i}: expected ${i}, got ${step.stepIndex}`);
      }
    }
  }

  // Terminal state validation
  if (!trace.terminal) {
    errors.push('Missing terminal state');
  } else if (typeof trace.terminal.success !== 'boolean') {
    errors.push('Terminal state missing success flag');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      traceId: trace.traceId,
      algorithmId: trace.algorithmId,
    };
  }

  return {
    ...trace,
    isValid: true,
    validationWarnings: warnings.length > 0 ? warnings : undefined,
  };
}