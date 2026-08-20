/**
 * Cryptographic Benchmark Constants & Performance Thresholds
 */

/**
 * Speedup ratio threshold (1.02 = 2% improvement).
 * Speeds at or above this ratio are categorized as performance gains.
 */
export const SPEEDUP_THRESHOLD = 1.02;

/**
 * Slowdown ratio threshold (0.98 = 2% regression).
 * Speeds at or below this ratio are categorized as performance regressions.
 */
export const SLOWDOWN_THRESHOLD = 0.98;
