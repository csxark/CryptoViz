import type { KnownAnswerTestVector } from "@/tests/vectors/types";

/**
 * Distinguishes *why* a vector did not pass, so failures are actionable
 * instead of a bare boolean.
 */
export type VectorMismatchType =
  | "NONE"
  | "OUTPUT_MISMATCH"
  | "EXECUTION_ERROR"
  | "UNSUPPORTED_ALGORITHM";

export interface VectorRunResult {
  vector: KnownAnswerTestVector;
  passed: boolean;
  mismatchType: VectorMismatchType;
  expectedHex: string;
  actualHex: string | null;
  error?: string;
}

/**
 * An executor independently re-derives a vector's expected output (hex
 * string) by calling into CryptoViz's own cipher implementation - never the
 * UI, and never simply echoing `vector.ciphertextHex`.
 */
export type CipherVectorExecutor = (vector: KnownAnswerTestVector) => string;

export type CipherDispatchTable = Record<string, CipherVectorExecutor>;

/**
 * Runs a single known-answer vector against the dispatch table and reports
 * a structured result instead of throwing, so a whole suite can be executed
 * and summarized in one pass.
 */
export function runKnownAnswerVector(
  vector: KnownAnswerTestVector,
  dispatch: CipherDispatchTable,
): VectorRunResult {
  const expectedHex = vector.ciphertextHex.toLowerCase();
  const executor = dispatch[vector.algorithm];

  if (!executor) {
    return {
      vector,
      passed: false,
      mismatchType: "UNSUPPORTED_ALGORITHM",
      expectedHex,
      actualHex: null,
      error: `No executor registered for algorithm "${vector.algorithm}"`,
    };
  }

  try {
    const actualHex = executor(vector).toLowerCase();
    return {
      vector,
      passed: actualHex === expectedHex,
      mismatchType: actualHex === expectedHex ? "NONE" : "OUTPUT_MISMATCH",
      expectedHex,
      actualHex,
    };
  } catch (err) {
    return {
      vector,
      passed: false,
      mismatchType: "EXECUTION_ERROR",
      expectedHex,
      actualHex: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Runs every vector in a suite against the dispatch table. */
export function runKnownAnswerVectorSuite(
  vectors: KnownAnswerTestVector[],
  dispatch: CipherDispatchTable,
): VectorRunResult[] {
  return vectors.map((vector) => runKnownAnswerVector(vector, dispatch));
}

/** Human-readable diagnostic used as a test assertion message on failure. */
export function formatMismatchDiagnostic(result: VectorRunResult): string {
  if (result.passed) return `${result.vector.id}: PASS`;

  if (result.mismatchType === "UNSUPPORTED_ALGORITHM") {
    return `${result.vector.id}: SKIPPED (${result.error})`;
  }

  if (result.mismatchType === "EXECUTION_ERROR") {
    return `${result.vector.id}: EXECUTION ERROR - ${result.error}`;
  }

  return [
    `${result.vector.id}: OUTPUT MISMATCH`,
    `  algorithm: ${result.vector.algorithm} (${result.vector.standard})`,
    `  expected:  ${result.expectedHex}`,
    `  actual:    ${result.actualHex}`,
  ].join("\n");
}

/**
 * Run conformance tests for an algorithm
 * @param algorithm - Algorithm to test
 * @param variant - Algorithm variant
 * @param vectorPath - Path to vector JSON file
 * @param executor - Executor for the algorithm
 */
export async function runConformanceTest(
  algorithm: string,
  variant: string,
  vectorPath: string,
  executor: any
): Promise<any> {
  const { ConformanceHarness } = await import('@/lib/testing/conformanceHarness');
  
  // Dynamically import vector file
  const vectorModule = await import(vectorPath);
  const vectorSet = vectorModule.default || vectorModule;

  const harness = new ConformanceHarness(algorithm, variant, executor);
  return harness.runTestVectorSet(vectorSet);
}