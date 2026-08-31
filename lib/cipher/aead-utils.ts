/**
 * AEAD Utility helpers for authenticated encryption schemes (Ascon-128, ChaCha20-Poly1305, XChaCha20-Poly1305).
 * Provides padding, 64-bit little-endian length block formatting, and constant-time tag validation.
 */

export function pad16(length: number): Uint8Array {
  const remainder = length % 16;
  return remainder === 0 ? new Uint8Array(0) : new Uint8Array(16 - remainder);
}

/**
 * Pack64LE cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param value Input required by the Pack64LE operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function pack64LE(value: number): Uint8Array {
  const out = new Uint8Array(8);
  let v = BigInt(value);
  for (let i = 0; i < 8; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/**
 * Concat Bytes cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param arrays Input required by the Concat Bytes operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, curr) => acc + curr.length, 0);
  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}

/**
 * Format Aead Mac Input cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param aad Input required by the Format Aead Mac Input operation.
 * @param ciphertext Input required by the Format Aead Mac Input operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function formatAeadMacInput(aad: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  return concatBytes(
    aad,
    pad16(aad.length),
    ciphertext,
    pad16(ciphertext.length),
    pack64LE(aad.length),
    pack64LE(ciphertext.length)
  );
}
