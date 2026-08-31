import {
  compareExecutionTraces,
  formatStateDiffSummary,
  type StateDiffResult,
} from '@/lib/trace/stateDiff';
import type { AlgorithmTrace, TraceStep } from '@/lib/trace';

describe('State Diff Viewer', () => {
  function createMockTrace(
    algorithmId: string,
    steps: Partial<TraceStep>[],
    result?: Record<string, unknown>
  ): AlgorithmTrace {
    return {
      schemaVersion: '1.0',
      traceId: `trace-${Date.now()}`,
      algorithmId,
      algorithmVersion: '256',
      timestamp: Date.now(),
      initialConfig: {
        key: 'mockKey',
        plaintext: 'mockPlaintext',
      },
      steps: steps.map((step, idx) => ({
        stepIndex: idx,
        phase: 'main_round',
        input: {},
        transformation: {
          name: 'MockOp',
          description: 'Mock transformation',
        },
        output: {},
        ...step,
      })),
      terminal: {
        result: result || { output: '00' },
        success: true,
        totalTimeMs: 100,
      },
      customMetadata: {},
    };
  }

  describe('compareExecutionTraces', () => {
    it('should identify identical traces', () => {
      const trace = createMockTrace('aes', [
        {
          input: { state: '0102' },
          output: { state: '0304' },
        },
      ]);

      const result = compareExecutionTraces(trace, trace);
      expect(result.isIdentical).toBe(true);
      expect(result.divergences).toHaveLength(0);
    });

    it('should detect divergence in different inputs', () => {
      const traceA = createMockTrace('aes', [
        {
          input: { state: '00000000' },
          output: { state: '11111111' },
        },
      ]);

      const traceB = createMockTrace('aes', [
        {
          input: { state: 'ffffffff' },
          output: { state: '11111111' },
        },
      ]);

      const result = compareExecutionTraces(traceA, traceB);
      expect(result.isIdentical).toBe(false);
      expect(result.firstDivergenceStep).toBe(0);
      expect(result.divergences).toHaveLength(1);
    });

    it('should detect divergence in outputs', () => {
      const traceA = createMockTrace('aes', [
        {
          input: { state: '0102' },
          output: { state: '0304' },
        },
      ]);

      const traceB = createMockTrace('aes', [
        {
          input: { state: '0102' },
          output: { state: 'aabb' },
        },
      ]);

      const result = compareExecutionTraces(traceA, traceB);
      expect(result.isIdentical).toBe(false);
      expect(result.divergences[0].outputDifferences).toHaveLength(1);
    });

    it('should identify first divergent step', () => {
      const traceA = createMockTrace('aes', [
        {
          input: { state: '00' },
          output: { state: '00' },
        },
        {
          input: { state: '00' },
          output: { state: '00' },
        },
        {
          input: { state: '00' },
          output: { state: 'ff' },
        },
      ]);

      const traceB = createMockTrace('aes', [
        {
          input: { state: '00' },
          output: { state: '00' },
        },
        {
          input: { state: 'aa' },
          output: { state: '00' },
        },
        {
          input: { state: '00' },
          output: { state: 'ff' },
        },
      ]);

      const result = compareExecutionTraces(traceA, traceB);
      expect(result.firstDivergenceStep).toBe(1);
    });

    it('should detect byte-level differences', () => {
      const traceA = createMockTrace('aes', [
        {
          input: { data: '0102030405060708' },
          output: { state: '00' },
        },
      ]);

      const traceB = createMockTrace('aes', [
        {
          input: { data: '01ff030405060708' },
          output: { state: '00' },
        },
      ]);

      const result = compareExecutionTraces(traceA, traceB, {
        byteLevelDetail: true,
      });
      const diff = result.divergences[0].inputDifferences[0];
      expect(diff.byteDifferences).toBeDefined();
      expect(diff.byteDifferences![0].byteIndex).toBe(1);
    });

    it('should handle different trace lengths', () => {
      const traceA = createMockTrace('aes', [
        { input: {}, output: {} },
        { input: {}, output: {} },
      ]);

      const traceB = createMockTrace('aes', [
        { input: {}, output: {} },
        { input: {}, output: {} },
        { input: {}, output: {} },
      ]);

      const result = compareExecutionTraces(traceA, traceB);
      expect(result.statistics.totalStepsA).toBe(2);
      expect(result.statistics.totalStepsB).toBe(3);
    });

    it('should handle different algorithm rejection', () => {
      const traceA = createMockTrace('aes', []);
      const traceB = createMockTrace('sha256', []);
      traceB.algorithmId = 'sha256';

      expect(() => compareExecutionTraces(traceA, traceB)).toThrow(
        'Cannot compare traces of different algorithms'
      );
    });

    it('should detect final state differences', () => {
      const traceA = createMockTrace('aes', [], { digest: 'aabbccdd' });
      const traceB = createMockTrace('aes', [], { digest: 'ddeeffaa' });

      const result = compareExecutionTraces(traceA, traceB);
      expect(result.isIdentical).toBe(false);
    });

    it('should report affected fields', () => {
      const traceA = createMockTrace('aes', [
        {
          input: { state: '00', key: '00' },
          output: { state: '00' },
        },
      ]);

      const traceB = createMockTrace('aes', [
        {
          input: { state: 'ff', key: 'aa' },
          output: { state: '00' },
        },
      ]);

      const result = compareExecutionTraces(traceA, traceB);
      expect(result.statistics.affectedFields.has('state')).toBe(true);
      expect(result.statistics.affectedFields.has('key')).toBe(true);
    });
  });

  describe('formatStateDiffSummary', () => {
    it('should format identical trace summary', () => {
      const result = {
        traceIdA: 'a',
        traceIdB: 'b',
        algorithmId: 'aes',
        isIdentical: true,
        divergences: [],
        statistics: {
          totalStepsA: 10,
          totalStepsB: 10,
          commonSteps: 10,
          divergentSteps: 0,
          affectedFields: new Set(),
        },
        comparisonTimestamp: Date.now(),
      } as StateDiffResult;

      const summary = formatStateDiffSummary(result);
      expect(summary).toContain('✓ Traces are identical');
      expect(summary).toContain('10 steps');
    });

    it('should format divergent trace summary', () => {
      const result = {
        traceIdA: 'a',
        traceIdB: 'b',
        algorithmId: 'aes',
        isIdentical: false,
        firstDivergenceStep: 5,
        divergences: [
          {
            stepIndex: 5,
            phase: 'main_round',
            transformationName: 'SubBytes',
            inputDifferences: [],
            outputDifferences: [],
            isFirstDivergence: true,
          },
        ],
        statistics: {
          totalStepsA: 10,
          totalStepsB: 10,
          commonSteps: 5,
          divergentSteps: 5,
          affectedFields: new Set(['state', 'key']),
        },
        comparisonTimestamp: Date.now(),
      } as StateDiffResult;

      const summary = formatStateDiffSummary(result);
      expect(summary).toContain('✗ Traces differ at step 5');
      expect(summary).toContain('5 divergences');
      expect(summary).toContain('SubBytes');
    });
  });
});