// src/schemas/workloadValidation.ts

export interface WorkloadParameters {
    inputSize: number;
    searchSpaceSize: number;
    iterations: number;
    concurrency: number;
    timeoutMs: number;
}

export interface ValidationResult {
    valid: boolean;
    error?: string;
    sanitizedParams?: WorkloadParameters;
}

// Hard safety limits to prevent browser freezing and excessive resource consumption (#1335)
export const WORKLOAD_LIMITS = {
    MAX_INPUT_SIZE: 1024,              // Max 1 KB string input
    MAX_SEARCH_SPACE: 1000000000,      // Max 1 billion combinations
    MAX_ITERATIONS: 1000000,           // Max 1 million loop iterations
    MAX_CONCURRENCY: 16,               // Max 16 worker threads
    MAX_TIMEOUT_MS: 30000              // Max 30 seconds timeout
};

/**
 * Strictly validates benchmark and attack workload parameters.
 */
export function validateWorkloadParameters(params: Partial<WorkloadParameters>): ValidationResult {
    const inputSize = params.inputSize ?? 0;
    const searchSpaceSize = params.searchSpaceSize ?? 0;
    const iterations = params.iterations ?? 0;
    const concurrency = params.concurrency ?? 1;
    const timeoutMs = params.timeoutMs ?? 5000;

    if (inputSize <= 0 || inputSize > WORKLOAD_LIMITS.MAX_INPUT_SIZE) {
        return { valid: false, error: `Input size (${inputSize}) exceeds maximum allowed limit of ${WORKLOAD_LIMITS.MAX_INPUT_SIZE} bytes.` };
    }

    if (searchSpaceSize < 0 || searchSpaceSize > WORKLOAD_LIMITS.MAX_SEARCH_SPACE) {
        return { valid: false, error: `Search space size (${searchSpaceSize}) exceeds maximum allowed limit of ${WORKLOAD_LIMITS.MAX_SEARCH_SPACE}.` };
    }

    if (iterations <= 0 || iterations > WORKLOAD_LIMITS.MAX_ITERATIONS) {
        return { valid: false, error: `Iteration count (${iterations}) exceeds maximum allowed limit of ${WORKLOAD_LIMITS.MAX_ITERATIONS}.` };
    }

    if (concurrency <= 0 || concurrency > WORKLOAD_LIMITS.MAX_CONCURRENCY) {
        return { valid: false, error: `Worker concurrency (${concurrency}) exceeds maximum allowed limit of ${WORKLOAD_LIMITS.MAX_CONCURRENCY}.` };
    }

    if (timeoutMs <= 0 || timeoutMs > WORKLOAD_LIMITS.MAX_TIMEOUT_MS) {
        return { valid: false, error: `Timeout (${timeoutMs}ms) exceeds maximum allowed limit of ${WORKLOAD_LIMITS.MAX_TIMEOUT_MS}ms.` };
    }

    return {
        valid: true,
        sanitizedParams: {
            inputSize,
            searchSpaceSize,
            iterations,
            concurrency,
            timeoutMs
        }
    };
}
