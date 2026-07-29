/**
 * Pure calculation utilities for the Birthday Attack Simulator.
 */

/**
 * Calculates the probability of at least one collision in a set of k randomly chosen values
 * from a hash space of size N (where N = 2^bits).
 */
export function calculateCollisionProbability(k: number, N: number): number {
  if (k <= 1 || N <= 0) return 0;
  if (k > N) return 1.0;

  // Use exact calculation for small k to preserve precision and avoid floating point issues
  if (k < 100) {
    let p = 1.0;
    for (let i = 0; i < k; i++) {
      p *= (N - i) / N;
    }
    return 1.0 - p;
  }

  // Use the standard exponential approximation for larger k: 1 - exp(-k * (k - 1) / (2 * N))
  // We use standard numbers as floating point precision is sufficient for probability values
  const exponent = -(k * (k - 1)) / (2 * N);
  return 1.0 - Math.exp(exponent);
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
 */
export function formatHash(value: number, bits: number): string {
  const hexChars = Math.ceil(bits / 4);
  const maxValue = (1 << bits) - 1;
  const clampedValue = Math.min(Math.max(0, value), maxValue);
  return clampedValue.toString(16).toUpperCase().padStart(hexChars, "0");
}
