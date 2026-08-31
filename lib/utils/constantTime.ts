/**
 * Constant-time comparison utilities for security-sensitive operations.
 *
 * These functions prevent timing attacks by ensuring that comparison operations
 * take the same amount of time regardless of the input values. This is critical
 * for:
 * - MAC/tag verification (HMAC, Poly1305, AES-GCM, ChaCha20-Poly1305)
 * - Password/hash comparison
 * - Signature verification
 * - Authentication token validation
 *
 * The key principle is that the function must always examine all bytes/characters
 * and not short-circuit on the first mismatch, which would leak timing information.
 */

/**
 * Constant-time byte-array equality comparison.
 *
 * This function compares two Uint8Arrays in constant time by:
 * 1. Always iterating through the full length of the longer array
 * 2. Folding all mismatches into a single accumulator
 * 3. Including length mismatch in the accumulator to prevent length-based timing
 *
 * @param a - First byte array
 * @param b - Second byte array
 * @returns true if arrays are equal, false otherwise
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length; // Length mismatch folds into result
  for (let i = 0; i < len; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Constant-time hex string equality comparison.
 *
 * Converts hex strings to byte arrays and compares them in constant time.
 * This is useful for comparing MAC tags, hashes, and other hex-encoded values.
 *
 * @param a - First hex string
 * @param b - Second hex string
 * @returns true if hex strings represent equal byte arrays, false otherwise
 */
export function constantTimeHexEqual(a: string, b: string): boolean {
  const cleanA = a.replace(/\s/g, '');
  const cleanB = b.replace(/\s/g, '');
  
  // Length check folds into the comparison
  const len = Math.max(cleanA.length, cleanB.length);
  let diff = cleanA.length ^ cleanB.length;
  
  for (let i = 0; i < len; i++) {
    const charA = cleanA[i] ?? '0';
    const charB = cleanB[i] ?? '0';
    diff |= charA.charCodeAt(0) ^ charB.charCodeAt(0);
  }
  
  return diff === 0;
}

/**
 * Constant-time string equality comparison.
 *
 * Compares two strings in constant time by examining all characters.
 * Useful for comparing authentication tokens, API keys, and other sensitive strings.
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal, false otherwise
 */
export function constantTimeStringEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  return constantTimeEqual(aBytes, bBytes);
}

/**
 * Constant-time comparison for selecting between two values based on a condition.
 *
 * This is a building block for constant-time algorithms. It returns `a` if condition
 * is true, `b` if condition is false, but does so without branching that could leak
 * timing information.
 *
 * @param condition - Boolean condition (true selects a, false selects b)
 * @param a - Value to return if condition is true
 * @param b - Value to return if condition is false
 * @returns Either a or b based on condition, selected in constant time
 */
export function constantTimeSelect(condition: boolean, a: number, b: number): number {
  // Convert condition to 0 or 1 without branching
  const mask = -Number(condition);
  // If condition is true (mask = -1 = all 1s), return a
  // If condition is false (mask = 0), return b
  return (a & mask) | (b & ~mask);
}

/**
 * Constant-time PKCS#7 padding validation.
 *
 * Validates PKCS#7 padding in constant time by:
 * 1. Walking every byte of the block regardless of padding validity
 * 2. Folding all validation checks into a single result
 * 3. Not branching on early failures
 *
 * Unlike a naive implementation that would return early on the first bad byte,
 * this always processes the entire block to prevent timing attacks.
 *
 * @param block - Data block to validate for PKCS#7 padding
 * @returns true if padding is valid, false otherwise
 */
export function constantTimeValidatePadding(block: Uint8Array): boolean {
  const len = block.length;
  const padLen = block[len - 1];

  const padLenInRange = padLen >= 1 && padLen <= len ? 1 : 0;
  // Only used to keep the loop well-defined; doesn't change the timing
  // profile since every byte is still visited either way.
  const effectivePadLen = padLenInRange ? padLen : len;

  let mismatch = 0;
  for (let i = 0; i < len; i++) {
    const isPadByte = i >= len - effectivePadLen ? 1 : 0;
    // When isPadByte is 0 this contributes nothing (0 * anything), but the
    // XOR and multiply still execute — no branch, no early exit.
    mismatch |= isPadByte * (block[i] ^ padLen);
  }

  return padLenInRange === 1 && mismatch === 0;
}

/**
 * Constant-time integer comparison.
 *
 * Compares two integers in constant time, useful for comparing counters,
 * sequence numbers, or other numeric values in security-sensitive contexts.
 *
 * @param a - First integer
 * @param b - Second integer
 * @returns true if integers are equal, false otherwise
 */
export function constantTimeIntEqual(a: number, b: number): boolean {
  return (a ^ b) === 0;
}

/**
 * Constant-time check if value is within range [min, max].
 *
 * Performs a bounds check without branching that could leak timing information.
 * Useful for validating array indices, lengths, and other numeric parameters.
 *
 * @param value - Value to check
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns true if value is within range, false otherwise
 */
export function constantTimeInRange(value: number, min: number, max: number): boolean {
  // Compute (value - min) and (max - value) without branching
  const aboveMin = value - min;
  const belowMax = max - value;
  // Both must be non-negative for value to be in range
  // Use sign bit extraction without branching
  const signBit = 0x80000000;
  const minOk = (aboveMin & signBit) === 0;
  const maxOk = (belowMax & signBit) === 0;
  return minOk && maxOk;
}
