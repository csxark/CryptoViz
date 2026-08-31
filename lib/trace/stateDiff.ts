/**
 * State-Diff Mechanism for Algorithm Execution Trace Comparison
 * Identifies divergences between two execution traces at step and byte levels
 */

import type { AlgorithmTrace, TraceStep } from './traceSchema';

/**
 * Represents a single byte-level difference
 */
export interface ByteDifference {
  /** Byte index in the field */
  byteIndex: number;
  /** Value in first trace */
  valueA: number;
  /** Value in second trace */
  valueB: number;
  /** Hex representation of difference */
  hexA: string;
  hexB: string;
}

/**
 * Represents field-level state changes
 */
export interface FieldDifference {
  /** Field name */
  fieldName: string;
  /** Value from trace A */
  valueA: unknown;
  /** Value from trace B */
  valueB: unknown;
  /** Byte-level differences if applicable */
  byteDifferences?: ByteDifference[];
  /** Human-readable change description */
  changeDescription: string;
}

/**
 * Represents a divergent step between two traces
 */
export interface StepDivergence {
  /** Step index where divergence occurs */
  stepIndex: number;
  /** Execution phase */
  phase: string;
  /** Name of transformation that differs */
  transformationName: string;
  /** Input state differences */
  inputDifferences: FieldDifference[];
  /** Output state differences */
  outputDifferences: FieldDifference[];
  /** Whether this is the first divergence */
  isFirstDivergence: boolean;
}

/**
 * Complete state comparison result between two traces
 */
export interface StateDiffResult {
  /** Trace A identifier */
  traceIdA: string;
  /** Trace B identifier */
  traceIdB: string;
  /** Algorithm being compared */
  algorithmId: string;
  /** Whether traces are identical */
  isIdentical: boolean;
  /** First step where divergence occurs (if any) */
  firstDivergenceStep?: number;
  /** All identified divergences */
  divergences: StepDivergence[];
  /** Summary statistics */
  statistics: {
    totalStepsA: number;
    totalStepsB: number;
    commonSteps: number;
    divergentSteps: number;
    affectedFields: Set<string>;
  };
  /** Timestamp of comparison */
  comparisonTimestamp: number;
}

/**
 * Compares two execution traces and identifies state-level differences
 *
 * @param traceA - First execution trace (baseline)
 * @param traceB - Second execution trace (candidate)
 * @param options - Comparison options
 * @returns StateDiffResult containing all differences
 */
export function compareExecutionTraces(
  traceA: AlgorithmTrace,
  traceB: AlgorithmTrace,
  options: { byteLevelDetail?: boolean; maxDivergences?: number } = {}
): StateDiffResult {
  const { byteLevelDetail = true, maxDivergences = 100 } = options;

  // Validate trace compatibility
  if (traceA.algorithmId !== traceB.algorithmId) {
    throw new Error(
      `Cannot compare traces of different algorithms: ${traceA.algorithmId} vs ${traceB.algorithmId}`
    );
  }

  const affectedFields = new Set<string>();
  const divergences: StepDivergence[] = [];
  let firstDivergenceStep: number | undefined;

  const maxSteps = Math.max(traceA.steps.length, traceB.steps.length);
  const minSteps = Math.min(traceA.steps.length, traceB.steps.length);

  // Compare common steps
  for (let i = 0; i < minSteps && divergences.length < maxDivergences; i++) {
    const stepA = traceA.steps[i];
    const stepB = traceB.steps[i];

    const stepDivergence = compareSteps(stepA, stepB, i, byteLevelDetail);

    if (stepDivergence) {
      divergences.push(stepDivergence);
      stepDivergence.inputDifferences.forEach((diff) =>
        affectedFields.add(diff.fieldName)
      );
      stepDivergence.outputDifferences.forEach((diff) =>
        affectedFields.add(diff.fieldName)
      );

      if (firstDivergenceStep === undefined) {
        firstDivergenceStep = i;
        stepDivergence.isFirstDivergence = true;
      }
    }
  }

  // Handle length mismatch
  if (traceA.steps.length !== traceB.steps.length && divergences.length < maxDivergences) {
    const extraSteps = Math.abs(traceA.steps.length - traceB.steps.length);
    affectedFields.add('trace_length');
  }

  // Compare terminal states if no divergence in steps
  if (divergences.length === 0) {
    const terminalDiff = compareTerminalStates(traceA, traceB);
    if (terminalDiff.length > 0 && firstDivergenceStep === undefined) {
      firstDivergenceStep = minSteps;
      terminalDiff.forEach((diff) => affectedFields.add(diff.fieldName));
    }
  }

  const isIdentical =
    divergences.length === 0 &&
    traceA.steps.length === traceB.steps.length &&
    compareTerminalStates(traceA, traceB).length === 0;

  return {
    traceIdA: traceA.traceId,
    traceIdB: traceB.traceId,
    algorithmId: traceA.algorithmId,
    isIdentical,
    firstDivergenceStep,
    divergences,
    statistics: {
      totalStepsA: traceA.steps.length,
      totalStepsB: traceB.steps.length,
      commonSteps: minSteps,
      divergentSteps: divergences.length,
      affectedFields,
    },
    comparisonTimestamp: Date.now(),
  };
}

/**
 * Compares two individual steps
 */
function compareSteps(
  stepA: TraceStep,
  stepB: TraceStep,
  stepIndex: number,
  byteLevelDetail: boolean
): StepDivergence | null {
  const inputDifferences = compareStateObjects(
    stepA.input,
    stepB.input,
    byteLevelDetail
  );
  const outputDifferences = compareStateObjects(
    stepA.output,
    stepB.output,
    byteLevelDetail
  );

  if (inputDifferences.length === 0 && outputDifferences.length === 0) {
    return null;
  }

  return {
    stepIndex,
    phase: stepA.phase,
    transformationName: stepA.transformation.name,
    inputDifferences,
    outputDifferences,
    isFirstDivergence: false,
  };
}

/**
 * Compares two state objects field by field
 */
function compareStateObjects(
  stateA: Record<string, unknown>,
  stateB: Record<string, unknown>,
  byteLevelDetail: boolean
): FieldDifference[] {
  const differences: FieldDifference[] = [];
  const allKeys = new Set([...Object.keys(stateA), ...Object.keys(stateB)]);

  for (const key of allKeys) {
    const valueA = stateA[key];
    const valueB = stateB[key];

    if (
      valueA === valueB ||
      (valueA === undefined && valueB === undefined)
    ) {
      continue;
    }

    const fieldDiff = createFieldDifference(key, valueA, valueB, byteLevelDetail);
    differences.push(fieldDiff);
  }

  return differences;
}

/**
 * Creates a field difference object with optional byte-level analysis
 */
function createFieldDifference(
  fieldName: string,
  valueA: unknown,
  valueB: unknown,
  byteLevelDetail: boolean
): FieldDifference {
  let byteDifferences: ByteDifference[] | undefined;
  let changeDescription: string;

  if (byteLevelDetail && typeof valueA === 'string' && typeof valueB === 'string') {
    byteDifferences = compareByteStrings(valueA, valueB);
    changeDescription = `${byteDifferences.length} bytes differ`;
  } else if (typeof valueA === 'number' && typeof valueB === 'number') {
    const diff = Math.abs(valueB - valueA);
    changeDescription = `${valueA} → ${valueB} (Δ: ${diff})`;
  } else {
    changeDescription = `${JSON.stringify(valueA)} → ${JSON.stringify(valueB)}`;
  }

  return {
    fieldName,
    valueA,
    valueB,
    byteDifferences,
    changeDescription,
  };
}

/**
 * Performs byte-level comparison of hex or binary strings
 */
function compareByteStrings(strA: string, strB: string): ByteDifference[] {
  const differences: ByteDifference[] = [];
  const minLen = Math.min(strA.length, strB.length);

  for (let i = 0; i < minLen; i += 2) {
    const byteA = strA.substring(i, i + 2);
    const byteB = strB.substring(i, i + 2);

    if (byteA !== byteB) {
      differences.push({
        byteIndex: i / 2,
        valueA: parseInt(byteA, 16),
        valueB: parseInt(byteB, 16),
        hexA: byteA.toUpperCase(),
        hexB: byteB.toUpperCase(),
      });
    }
  }

  // Handle length differences
  if (strA.length !== strB.length) {
    differences.push({
      byteIndex: minLen / 2,
      valueA: strA.length,
      valueB: strB.length,
      hexA: `(len:${strA.length})`,
      hexB: `(len:${strB.length})`,
    });
  }

  return differences;
}

/**
 * Compares terminal (final) states of two traces
 */
function compareTerminalStates(
  traceA: AlgorithmTrace,
  traceB: AlgorithmTrace
): FieldDifference[] {
  return compareStateObjects(
    traceA.terminal.result as Record<string, unknown>,
    traceB.terminal.result as Record<string, unknown>,
    true
  );
}

/**
 * Formats a state diff result for human-readable output
 */
export function formatStateDiffSummary(result: StateDiffResult): string {
  if (result.isIdentical) {
    return `✓ Traces are identical (${result.statistics.totalStepsA} steps)`;
  }

  const lines = [
    `✗ Traces differ at step ${result.firstDivergenceStep ?? 'N/A'}`,
    `  Total divergences: ${result.statistics.divergentSteps}`,
    `  Affected fields: ${result.statistics.affectedFields.size}`,
  ];

  if (result.divergences.length > 0) {
    const first = result.divergences[0];
    lines.push(
      `  First diff: ${first.transformationName} (phase: ${first.phase})`
    );
  }

  return lines.join('\n');
}