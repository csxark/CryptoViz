/**
 * Helper utilities for Serpent block cipher (NESSIE / Anderson-Biham-Knudsen 1998)
 * Provides 32-bit rotations, bit-slice S-box permutations, linear transformations,
 * and byte/word conversion utilities.
 */

export const PHI = 0x9e3779b9;

/**
 * U32 cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param n Input required by the U32 operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function u32(n: number): number {
  return n >>> 0;
}

/**
 * Rotl32 cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param x Input required by the Rotl32 operation.
 * @param n Input required by the Rotl32 operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function rotl32(x: number, n: number): number {
  const shift = n & 31;
  return shift === 0 ? u32(x) : u32((x << shift) | (x >>> (32 - shift)));
}

/**
 * Rotr32 cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param x Input required by the Rotr32 operation.
 * @param n Input required by the Rotr32 operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function rotr32(x: number, n: number): number {
  const shift = n & 31;
  return shift === 0 ? u32(x) : u32((x >>> shift) | (x << (32 - shift)));
}

/**
 * Read Word LE cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param bytes Input required by the Read Word LE operation.
 * @param offset Input required by the Read Word LE operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function readWordLE(bytes: Uint8Array, offset: number): number {
  return u32(
    bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24),
  );
}

/**
 * Write Word LE cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param value Input required by the Write Word LE operation.
 * @param output Input required by the Write Word LE operation.
 * @param offset Input required by the Write Word LE operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function writeWordLE(value: number, output: Uint8Array, offset: number): void {
  output[offset] = value & 0xff;
  output[offset + 1] = (value >>> 8) & 0xff;
  output[offset + 2] = (value >>> 16) & 0xff;
  output[offset + 3] = (value >>> 24) & 0xff;
}

/**
 * Hex To Bytes cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param hex Input required by the Hex To Bytes operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, "").replace(/^0x/i, "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Bytes To Hex cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param bytes Input required by the Bytes To Hex operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/**
 * Standard 4-bit S-boxes for Serpent (S0 .. S7)
 */
export const SBOXES: readonly (readonly number[])[] = [
  [3, 8, 15, 1, 10, 6, 5, 11, 14, 13, 4, 2, 7, 0, 9, 12],
  [15, 12, 2, 7, 9, 0, 5, 10, 1, 11, 14, 8, 6, 13, 3, 4],
  [8, 6, 7, 9, 3, 12, 10, 15, 13, 1, 14, 4, 0, 11, 5, 2],
  [0, 15, 11, 8, 12, 9, 6, 3, 13, 1, 2, 4, 10, 7, 5, 14],
  [1, 15, 8, 3, 12, 0, 11, 6, 2, 5, 4, 10, 9, 14, 7, 13],
  [15, 5, 2, 11, 4, 10, 9, 12, 0, 3, 14, 8, 13, 6, 7, 1],
  [7, 2, 12, 5, 8, 4, 6, 11, 14, 9, 1, 15, 13, 3, 10, 0],
  [1, 13, 15, 0, 14, 8, 2, 11, 7, 4, 12, 10, 9, 3, 5, 6],
];

/**
 * INVERSE SBOXES cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const INVERSE_SBOXES: readonly (readonly number[])[] = SBOXES.map((box) => {
  const inv = new Array<number>(16);
  box.forEach((val, idx) => {
    inv[val] = idx;
  });
  return inv;
});

/**
 * Performs nibble-by-nibble substitution on four 32-bit words
 */
export function applySboxWords(words: number[], sboxIndex: number): number[] {
  const box = SBOXES[sboxIndex & 7];
  return words.map((w) => {
    let res = 0;
    for (let nib = 0; nib < 8; nib++) {
      const nibVal = (w >>> (nib * 4)) & 0xf;
      res |= box[nibVal] << (nib * 4);
    }
    return u32(res);
  });
}

/**
 * Apply Inverse Sbox Words cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param words Input required by the Apply Inverse Sbox Words operation.
 * @param sboxIndex Input required by the Apply Inverse Sbox Words operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function applyInverseSboxWords(words: number[], sboxIndex: number): number[] {
  const box = INVERSE_SBOXES[sboxIndex & 7];
  return words.map((w) => {
    let res = 0;
    for (let nib = 0; nib < 8; nib++) {
      const nibVal = (w >>> (nib * 4)) & 0xf;
      res |= box[nibVal] << (nib * 4);
    }
    return u32(res);
  });
}
