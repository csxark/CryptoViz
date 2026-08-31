/**
 * Pure calculation utilities for the Birthday Attack Simulator.
 */

/**
 * Calculates the probability of at least one collision in a set of k randomly chosen values
 * from a hash space of size N (where N = 2^bits).
 * Uses -Math.expm1(-k * (k - 1) / (2 * N)) for numerical stability without floating point underflow.
 */
export function calculateCollisionProbability(k: number, N: number): number {
  if (k <= 1 || N <= 0) return 0;
  if (k > N) return 1.0;

  const exponent = -(k * (k - 1)) / (2 * N);
  return -Math.expm1(exponent);
}

/**
 * Calculates the number of samples required to reach a 50% probability of a collision
 * for a hash space of size N.
 * Formula: k ≈ sqrt(2 * N * ln(2)) ≈ 1.1774 * sqrt(N)
 */
export function calculate50PercentThreshold(N: number): number {
  if (N <= 0) return 0;
  return Math.round(1.1774100225154747 * Math.sqrt(N));
}

/**
 * Formats a hash value as a padded hexadecimal string based on the hash bit depth.
 * Correctly handles 32-bit and larger hash bit depths to avoid 32-bit signed bitshift overflow.
 */
export function formatHash(value: number, bits: number): string {
  const hexChars = Math.ceil(bits / 4);
  const maxValue = bits >= 32 ? (bits >= 53 ? Number.MAX_SAFE_INTEGER : Math.pow(2, bits) - 1) : ((1 << bits) - 1) >>> 0;
  const clampedValue = Math.min(Math.max(0, value), maxValue);
  return clampedValue.toString(16).toUpperCase().padStart(hexChars, "0");
}
