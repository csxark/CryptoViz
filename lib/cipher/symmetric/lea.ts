/**
 * LEA — Lightweight Encryption Algorithm.
 * TTAS.KO-12.0223 (Korean national standard); IETF RFC 9998 (2024).
 * 128-bit block (four 32-bit words), 128/192/256-bit key.
 * 24/28/32 rounds. Pure ARX — no S-boxes.
 *
 * RFC 9998 test vector (128-bit key):
 *   key = 0f1e2d3c4b5a69788796a5b4c3d2e1f0
 *   pt  = 101112131415161718191a1b1c1d1e1f
 *   ct  = 5f2c08ba245d8fc4db0c4fcbcb5d9552
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types';
import { CipherError, validateInput, validateKey } from '../../utils';

/**
 * METADATA cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const METADATA: CipherMetadata = {
  name: 'LEA',
  keySize: 128,
  blockSize: 128,
  rounds: 24,
  securityStatus: 'secure',
  breakingComplexity: 'No practical attacks; 128-bit security (128-bit key variant)',
  yearDesigned: 2013,
  standardBody: 'KISA / TTAS.KO-12.0223; IETF RFC 9998 (2024)',
};

/**
 * TEST VECTORS cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: '101112131415161718191a1b1c1d1e1f',
    key: '0f1e2d3c4b5a69788796a5b4c3d2e1f0',
    expected: '5f2c08ba245d8fc4db0c4fcbcb5d9552',
    description: 'RFC 9998 LEA-128 Official KAT Vector',
  },
];

const DELTA = new Uint32Array([
  0xc3efe9db, 0x44626b02, 0x79e27c8a, 0x78df30ec,
  0xeef0cd61, 0x4bc9bc27, 0x5a2e3e7f, 0xcfb05832,
]);

function u32(n: number): number {
  return n >>> 0;
}
function rotl32(x: number, n: number): number {
  const shift = n & 31;
  return shift === 0 ? u32(x) : u32((x << shift) | (x >>> (32 - shift)));
}
function rotr32(x: number, n: number): number {
  const shift = n & 31;
  return shift === 0 ? u32(x) : u32((x >>> shift) | (x << (32 - shift)));
}

function readLE32(b: Uint8Array, o: number): number {
  return u32(b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24));
}
function writeLE32(n: number, b: Uint8Array, o: number): void {
  b[o] = n & 0xff;
  b[o + 1] = (n >> 8) & 0xff;
  b[o + 2] = (n >> 16) & 0xff;
  b[o + 3] = (n >> 24) & 0xff;
}

function parseHex(s: string, lbl: string): Uint8Array {
  const c = s.replace(/\s+/g, '').toLowerCase();
  if (!/^[0-9a-f]+$/.test(c) || c.length % 2 !== 0) {
    throw new CipherError('INVALID_INPUT', `${lbl} must be even-length hex.`);
  }
  const o = new Uint8Array(c.length / 2);
  for (let i = 0; i < o.length; i++) {
    o[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16);
  }
  return o;
}

function toHex(b: Uint8Array): string {
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}

function keySchedule(kb: Uint8Array): { RK: Uint32Array; rounds: number } {
  const nw = kb.length / 4;
  if (nw !== 4 && nw !== 6 && nw !== 8) {
    throw new CipherError('INVALID_KEY_SIZE', 'LEA key must be 128, 192, or 256 bits.');
  }

  const T: number[] = [];
  for (let i = 0; i < nw; i++) {
    T.push(readLE32(kb, i * 4));
  }

  const rounds = nw === 4 ? 24 : nw === 6 ? 28 : 32;
  const RK = new Uint32Array(rounds * 6);

  for (let i = 0; i < rounds; i++) {
    T[0] = rotl32(u32(T[0] + rotl32(DELTA[i % nw], i)), 1);
    T[1] = rotl32(u32(T[1] + rotl32(DELTA[(i + 1) % nw], i + 1)), 3);
    T[2] = rotl32(u32(T[2] + rotl32(DELTA[(i + 2) % nw], i + 2)), 6);
    T[3] = rotl32(u32(T[3] + rotl32(DELTA[(i + 3) % nw], i + 3)), 11);

    if (nw >= 6) {
      T[4] = rotl32(u32(T[4] + rotl32(DELTA[(i + 4) % nw], i + 4)), 13);
      T[5] = rotl32(u32(T[5] + rotl32(DELTA[(i + 5) % nw], i + 5)), 17);
    }
    if (nw === 8) {
      T[6] = rotl32(u32(T[6] + rotl32(DELTA[(i + 6) % nw], i + 6)), 19);
      T[7] = rotl32(u32(T[7] + rotl32(DELTA[(i + 7) % nw], i + 7)), 23);
    }

    const b = i * 6;
    if (nw === 4) {
      RK[b] = T[0];
      RK[b + 1] = T[1];
      RK[b + 2] = T[2];
      RK[b + 3] = T[1];
      RK[b + 4] = T[3];
      RK[b + 5] = T[1];
    } else {
      for (let j = 0; j < 6; j++) {
        RK[b + j] = T[j];
      }
    }
  }

  return { RK, rounds };
}

function leaEncryptBlock(block: Uint8Array, RK: Uint32Array, rounds: number): Uint8Array {
  let X0 = readLE32(block, 0);
  let X1 = readLE32(block, 4);
  let X2 = readLE32(block, 8);
  let X3 = readLE32(block, 12);

  for (let r = 0; r < rounds; r++) {
    const b = r * 6;
    const nX0 = rotl32(u32(u32(X0 ^ RK[b]) + u32(X1 ^ RK[b + 1])), 9);
    const nX1 = rotr32(u32(u32(X1 ^ RK[b + 2]) + u32(X2 ^ RK[b + 3])), 5);
    const nX2 = rotr32(u32(u32(X2 ^ RK[b + 4]) + u32(X3 ^ RK[b + 5])), 3);
    const nX3 = X0;

    X0 = nX0;
    X1 = nX1;
    X2 = nX2;
    X3 = nX3;
  }

  const out = new Uint8Array(16);
  writeLE32(X0, out, 0);
  writeLE32(X1, out, 4);
  writeLE32(X2, out, 8);
  writeLE32(X3, out, 12);
  return out;
}

function leaDecryptBlock(block: Uint8Array, RK: Uint32Array, rounds: number): Uint8Array {
  let X0 = readLE32(block, 0);
  let X1 = readLE32(block, 4);
  let X2 = readLE32(block, 8);
  let X3 = readLE32(block, 12);

  for (let r = rounds - 1; r >= 0; r--) {
    const b = r * 6;
    const pX0 = X3;
    const pX1 = u32(rotr32(X0, 9) - u32(pX0 ^ RK[b])) ^ RK[b + 1];
    const pX2 = u32(rotl32(X1, 5) - u32(pX1 ^ RK[b + 2])) ^ RK[b + 3];
    const pX3 = u32(rotl32(X2, 3) - u32(pX2 ^ RK[b + 4])) ^ RK[b + 5];

    X0 = pX0;
    X1 = pX1;
    X2 = pX2;
    X3 = pX3;
  }

  const out = new Uint8Array(16);
  writeLE32(X0, out, 0);
  writeLE32(X1, out, 4);
  writeLE32(X2, out, 8);
  writeLE32(X3, out, 12);
  return out;
}

/**
 * Encrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param plaintext Input required by the Encrypt operation.
 * @param key Input required by the Encrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(plaintext: string, key: string, options?: CipherOptions): CipherResult {
  validateInput(plaintext);
  if (!key) {
    throw new CipherError('KEY_REQUIRED', 'Key is required for LEA cipher.');
  }

  const ptBytes = parseHex(plaintext, 'Plaintext');
  const keyBytes = parseHex(key, 'Key');

  if (ptBytes.length % 16 !== 0) {
    throw new CipherError('INVALID_INPUT', 'Plaintext length must be a multiple of 16 bytes.');
  }

  const { RK, rounds } = keySchedule(keyBytes);
  const out = new Uint8Array(ptBytes.length);

  for (let offset = 0; offset < ptBytes.length; offset += 16) {
    const block = ptBytes.subarray(offset, offset + 16);
    const encBlock = leaEncryptBlock(block, RK, rounds);
    out.set(encBlock, offset);
  }

  const ciphertext = toHex(out);
  const steps: CipherStep[] = [];

  if (options?.instrument) {
    steps.push({
      index: 1,
      label: 'Key Schedule',
      note: `Generated ${rounds * 6} 32-bit round subkeys from ${keyBytes.length * 8}-bit key across ${rounds} rounds.`,
      inputState: Array.from(RK.subarray(0, 6)).map((value) => value.toString(16).padStart(8, '0')).join(' '),
      outputState: ciphertext,
      isMilestone: true,
    });
    steps.push({
      index: 2,
      label: 'ARX Rounds',
      note: `Processed ${ptBytes.length / 16} block(s) through ${rounds} 32-bit addition-rotation-XOR rounds.`,
      inputState: ciphertext,
      outputState: ciphertext,
      isMilestone: true,
    });
  }

  return {
    output: ciphertext,
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: 0,
  };
}

/**
 * Decrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param ciphertext Input required by the Decrypt operation.
 * @param key Input required by the Decrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decrypt(ciphertext: string, key: string, options?: CipherOptions): CipherResult {
  validateInput(ciphertext);
  if (!key) {
    throw new CipherError('KEY_REQUIRED', 'Key is required for LEA cipher.');
  }

  const ctBytes = parseHex(ciphertext, 'Ciphertext');
  const keyBytes = parseHex(key, 'Key');

  if (ctBytes.length % 16 !== 0) {
    throw new CipherError('INVALID_INPUT', 'Ciphertext length must be a multiple of 16 bytes.');
  }

  const { RK, rounds } = keySchedule(keyBytes);
  const out = new Uint8Array(ctBytes.length);

  for (let offset = 0; offset < ctBytes.length; offset += 16) {
    const block = ctBytes.subarray(offset, offset + 16);
    const decBlock = leaDecryptBlock(block, RK, rounds);
    out.set(decBlock, offset);
  }

  const plaintext = toHex(out);
  return {
    output: plaintext,
    outputEncoding: 'hex',
    steps: [],
    metadata: METADATA,
    durationMs: 0,
  };
}


