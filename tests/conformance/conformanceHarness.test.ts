/**
 * Cryptographic Conformance Testing Suite
 * Validates implementations against known-answer test vectors
 */

import { ConformanceHarness, formatConformanceResults } from '@/lib/testing/conformanceHarness';
import type { TestVectorSet, TestVector, ConformanceExecutor } from '@/lib/testing/testVectorFormat';

// Mock executor for testing
const createMockExecutor = (resultMap: Map<string, string>): ConformanceExecutor => ({
  async execute(vector: TestVector) {
    const key = `${vector.inputs.plaintext || vector.inputs.message || ''}`;
    const output = resultMap.get(key);

    if (!output) {
      throw new Error(`No result for input: ${key}`);
    }

    return {
      output: {
        ciphertext: output,
        digest: output,
      },
    };
  },
});

describe('Conformance Harness', () => {
  it('should pass all tests with correct outputs', async () => {
    const resultMap = new Map([
      ['6bc1bee22e409f96e93d7e117393172a', '3ad77bb40d7a3660a89ecaf32466ef97'],
    ]);

    const vectors: TestVectorSet = {
      algorithm: 'aes',
      variant: '128',
      schemaVersion: '1.0',
      vectors: [
        {
          testId: 'test-1',
          inputs: {
            key: 'mockkey',
            plaintext: '6bc1bee22e409f96e93d7e117393172a',
          },
          expectedOutput: {
            ciphertext: '3ad77bb40d7a3660a89ecaf32466ef97',
          },
        },
      ],
    };

    const harness = new ConformanceHarness('aes', '128', createMockExecutor(resultMap));
    const result = await harness.runTestVectorSet(vectors);

    expect(result.passedTests).toBe(1);
    expect(result.failedTests).toBe(0);
    expect(result.results[0].passed).toBe(true);
  });

  it('should detect mismatched outputs', async () => {
    const resultMap = new Map([['input', 'wrongoutput']]);

    const vectors: TestVectorSet = {
      algorithm: 'sha256',
      variant: '256',
      schemaVersion: '1.0',
      vectors: [
        {
          testId: 'test-mismatch',
          inputs: {
            key: '',
            message: 'input',
          },
          expectedOutput: {
            digest: 'expectedoutput',
          },
        },
      ],
    };

    const harness = new ConformanceHarness('sha256', '256', createMockExecutor(resultMap));
    const result = await harness.runTestVectorSet(vectors);

    expect(result.passedTests).toBe(0);
    expect(result.failedTests).toBe(1);
    expect(result.results[0].passed).toBe(false);
    expect(result.results[0].failedField).toBe('digest');
  });

  it('should reject mismatched algorithms', async () => {
    const vectors: TestVectorSet = {
      algorithm: 'sha256',
      variant: '256',
      schemaVersion: '1.0',
      vectors: [],
    };

    const harness = new ConformanceHarness('aes', '128', createMockExecutor(new Map()));

    await expect(harness.runTestVectorSet(vectors)).rejects.toThrow(
      'Algorithm mismatch'
    );
  });

  it('should format results for console output', async () => {
    const vectors: TestVectorSet = {
      algorithm: 'aes',
      variant: '128',
      schemaVersion: '1.0',
      vectors: [
        {
          testId: 'test-1',
          inputs: { key: 'k', plaintext: 'p' },
          expectedOutput: { ciphertext: 'c' },
        },
      ],
    };

    const resultMap = new Map([['p', 'c']]);
    const harness = new ConformanceHarness('aes', '128', createMockExecutor(resultMap));
    const result = await harness.runTestVectorSet(vectors);

    const formatted = formatConformanceResults(result);

    expect(formatted).toContain('aes');
    expect(formatted).toContain('Passed');
    expect(formatted).toContain('1');
  });
});