// tests/unit/workloadValidation.test.ts

import { validateWorkloadParameters, WORKLOAD_LIMITS } from '../../src/schemas/workloadValidation';

describe('Workload Input Validation Schemas (#1335)', () => {

    it('should successfully validate normal, safe workload parameters', () => {
        const result = validateWorkloadParameters({
            inputSize: 64,
            searchSpaceSize: 10000,
            iterations: 1000,
            concurrency: 4,
            timeoutMs: 5000
        });

        expect(result.valid).toBe(true);
        expect(result.sanitizedParams).toBeDefined();
    });

    it('should reject inputs exceeding maximum input size limits', () => {
        const result = validateWorkloadParameters({
            inputSize: WORKLOAD_LIMITS.MAX_INPUT_SIZE + 100,
            searchSpaceSize: 100,
            iterations: 100,
            concurrency: 2,
            timeoutMs: 1000
        });

        expect(result.valid).toBe(false);
        expect(result.error).toContain('Input size');
    });

    it('should reject search spaces exceeding maximum limits', () => {
        const result = validateWorkloadParameters({
            inputSize: 32,
            searchSpaceSize: WORKLOAD_LIMITS.MAX_SEARCH_SPACE + 1,
            iterations: 100,
            concurrency: 2,
            timeoutMs: 1000
        });

        expect(result.valid).toBe(false);
        expect(result.error).toContain('Search space size');
    });

    it('should reject excessive iterations that risk browser freezing', () => {
        const result = validateWorkloadParameters({
            inputSize: 32,
            searchSpaceSize: 100,
            iterations: WORKLOAD_LIMITS.MAX_ITERATIONS * 2,
            concurrency: 2,
            timeoutMs: 1000
        });

        expect(result.valid).toBe(false);
        expect(result.error).toContain('Iteration count');
    });

    it('should reject out-of-bounds concurrency and timeout values', () => {
        const result = validateWorkloadParameters({
            inputSize: 32,
            searchSpaceSize: 100,
            iterations: 100,
            concurrency: 64, // Exceeds max 16
            timeoutMs: 60000 // Exceeds max 30s
        });

        expect(result.valid).toBe(false);
    });
});
