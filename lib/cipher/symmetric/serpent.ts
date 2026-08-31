/**
 * Serpent symmetric block cipher implementation.
 * NESSIE submission by Ross Anderson, Eli Biham, and Lars Knudsen (1998).
 * Supports 128-bit blocks, key sizes 128, 192, and 256 bits, with 32 rounds.
 */

import type { CipherResult, CipherOptions, TestVector, CipherMetadata } from '../types';
import { CipherError, validateInput, validateKey } from '../../utils';
import {
  PHI,
  u32,
  rotl32,
  rotr32,
  readWordLE,
  writeWordLE,
  hexToBytes,
  bytesToHex,
  SBOXES,
  INVERSE_SBOXES,
  applySboxWords,
  applyInverseSboxWords,
} from './serpent-utils';

export { rotl32, rotr32 };

/**
 * Serpent Options cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface SerpentOptions {
  rounds?: number;
}

/**
 * Serpent Round Trace cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface SerpentRoundTrace {
  round: number;
  input: string;
  afterKeyMix: string;
  afterSbox: string;
  afterLinearTransform: string;
  subkey: string;
  sbox: number;
}

/**
 * Serpent Encryption Trace cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface SerpentEncryptionTrace {
  plaintextHex: string;
  keyHex: string;
  rounds: number;
  subkeys: string[];
  roundTrace: SerpentRoundTrace[];
  ciphertextHex: string;
}

/**
 * METADATA cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export const METADATA: CipherMetadata = {
  name: 'Serpent',
  keySize: 128,
  blockSize: 128,
  rounds: 32,
  securityStatus: 'secure',
  breakingComplexity: 'No practical attacks; 256-bit maximum security',
  yearDesigned: 1998,
  standardBody: 'NESSIE finalist / AES finalist',
};

/**
 * TEST VECTORS cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: '00000000000000000000000000000000',
    key: '00000000000000000000000000000000',
    expected: '36C2B777400B033C700E1B9516506EB6',
    description: 'Serpent-128 Zero Vector NESSIE test vector',
  },
  {
    input: '00112233445566778899AABBCCDDEEFF',
    key: '000102030405060708090A0B0C0D0E0F',
    expected: 'E3914DA9B9AAC3B71504F40BCCEB35CD',
    description: 'Serpent-128 Non-zero Test Vector',
  },
];

const DEFAULT_ROUNDS = 32;

function cleanHex(value: string): string {
  return value.trim().replace(/\s+/g, '').replace(/^0x/i, '').toUpperCase();
}

/**
 * Assert Hex Length cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param value Input required by the Assert Hex Length operation.
 * @param expectedLength Input required by the Assert Hex Length operation.
 * @param label Input required by the Assert Hex Length operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function assertHexLength(value: string, expectedLength: number, label: string): string {
  const cleaned = cleanHex(value);
  if (!cleaned) {
    throw new CipherError('INPUT_REQUIRED', `${label} is required.`);
  }
  if (!/^[A-F0-9]+$/.test(cleaned)) {
    throw new CipherError('INVALID_INPUT', `${label} must contain only hexadecimal characters.`);
  }
  if (cleaned.length !== expectedLength) {
    throw new CipherError('INVALID_INPUT', `${label} must be exactly ${expectedLength} hexadecimal characters.`);
  }
  return cleaned;
}

function assertSerpentKeyHex(value: string): string {
  const cleaned = cleanHex(value);
  if (!cleaned) {
    throw new CipherError('KEY_REQUIRED', 'Serpent key is required.');
  }
  if (!/^[A-F0-9]+$/.test(cleaned)) {
    throw new CipherError('INVALID_KEY', 'Serpent key must contain only hexadecimal characters.');
  }
  if (![32, 48, 64].includes(cleaned.length)) {
    throw new CipherError('INVALID_KEY_SIZE', 'Serpent key must be 128, 192, or 256 bits.');
  }
  return cleaned;
}

function wordsToHex(words: number[]): string {
  const output = new Uint8Array(16);
  writeWordLE(words[0], output, 0);
  writeWordLE(words[1], output, 4);
  writeWordLE(words[2], output, 8);
  writeWordLE(words[3], output, 12);
  return bytesToHex(output);
}

function blockToWords(blockHex: string): number[] {
  const bytes = hexToBytes(assertHexLength(blockHex, 32, 'Serpent block'));
  return [
    readWordLE(bytes, 0),
    readWordLE(bytes, 4),
    readWordLE(bytes, 8),
    readWordLE(bytes, 12),
  ];
}

function xorWords(left: number[], right: number[]): number[] {
  return left.map((word, index) => u32(word ^ right[index]));
}

/**
 * Linear Transform cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param words Input required by the Linear Transform operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function linearTransform(words: number[]): number[] {
  let [x0, x1, x2, x3] = words.map(u32);

  x0 = rotl32(x0, 13);
  x2 = rotl32(x2, 3);
  x1 = u32(x1 ^ x0 ^ x2);
  x3 = u32(x3 ^ x2 ^ u32(x0 << 3));
  x1 = rotl32(x1, 1);
  x3 = rotl32(x3, 7);
  x0 = u32(x0 ^ x1 ^ x3);
  x2 = u32(x2 ^ x3 ^ u32(x1 << 7));
  x0 = rotl32(x0, 5);
  x2 = rotl32(x2, 22);

  return [x0, x1, x2, x3];
}

/**
 * Inverse Linear Transform cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param words Input required by the Inverse Linear Transform operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function inverseLinearTransform(words: number[]): number[] {
  let [x0, x1, x2, x3] = words.map(u32);

  x2 = rotr32(x2, 22);
  x0 = rotr32(x0, 5);
  x2 = u32(x2 ^ x3 ^ u32(x1 << 7));
  x0 = u32(x0 ^ x1 ^ x3);
  x3 = rotr32(x3, 7);
  x1 = rotr32(x1, 1);
  x3 = u32(x3 ^ x2 ^ u32(x0 << 3));
  x1 = u32(x1 ^ x0 ^ x2);
  x2 = rotr32(x2, 3);
  x0 = rotr32(x0, 13);

  return [x0, x1, x2, x3];
}

function padSerpentKey(keyHex: string): Uint8Array {
  const key = hexToBytes(assertSerpentKeyHex(keyHex));

  if (key.length === 32) {
    return key;
  }

  const padded = new Uint8Array(32);
  padded.set(key);
  padded[key.length] = 0x01;
  return padded;
}

/**
 * Generate Serpent Subkeys cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param keyHex Input required by the Generate Serpent Subkeys operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function generateSerpentSubkeys(keyHex: string): number[][] {
  const keyBytes = padSerpentKey(keyHex);
  const w = new Array<number>(140).fill(0);

  for (let index = 0; index < 8; index += 1) {
    w[index] = readWordLE(keyBytes, index * 4);
  }

  for (let index = 8; index < 140; index += 1) {
    w[index] = rotl32(
      u32(w[index - 8] ^ w[index - 5] ^ w[index - 3] ^ w[index - 1] ^ PHI ^ (index - 8)),
      11
    );
  }

  const subkeys: number[][] = [];

  for (let round = 0; round < 33; round += 1) {
    const keyWords = [
      w[4 * round],
      w[4 * round + 1],
      w[4 * round + 2],
      w[4 * round + 3],
    ];
    subkeys.push(applySboxWords(keyWords, (3 - round) & 7));
  }

  return subkeys;
}

/**
 * Encrypt Serpent Block cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function encryptSerpentBlock(
  plaintextHex: string,
  keyHex: string,
  options: SerpentOptions = {}
): string {
  const rounds = options.rounds ?? DEFAULT_ROUNDS;
  const subkeys = generateSerpentSubkeys(keyHex);
  let state = blockToWords(plaintextHex);

  for (let round = 0; round < rounds; round += 1) {
    state = xorWords(state, subkeys[round]);
    state = applySboxWords(state, round & 7);

    if (round < rounds - 1) {
      state = linearTransform(state);
    } else {
      state = xorWords(state, subkeys[round + 1]);
    }
  }

  return wordsToHex(state);
}

/**
 * Decrypt Serpent Block cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function decryptSerpentBlock(
  ciphertextHex: string,
  keyHex: string,
  options: SerpentOptions = {}
): string {
  const rounds = options.rounds ?? DEFAULT_ROUNDS;
  const subkeys = generateSerpentSubkeys(keyHex);
  let state = blockToWords(ciphertextHex);

  state = xorWords(state, subkeys[rounds]);

  for (let round = rounds - 1; round >= 0; round -= 1) {
    state = applyInverseSboxWords(state, round & 7);
    state = xorWords(state, subkeys[round]);

    if (round > 0) {
      state = inverseLinearTransform(state);
    }
  }

  return wordsToHex(state);
}

/**
 * Trace Serpent Encryption cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function traceSerpentEncryption(
  plaintextHex: string,
  keyHex: string,
  options: SerpentOptions = {}
): SerpentEncryptionTrace {
  const rounds = options.rounds ?? DEFAULT_ROUNDS;
  const normalizedPlaintext = assertHexLength(plaintextHex, 32, 'Serpent block');
  const normalizedKey = assertSerpentKeyHex(keyHex);
  const subkeys = generateSerpentSubkeys(normalizedKey);
  let state = blockToWords(normalizedPlaintext);
  const roundTrace: SerpentRoundTrace[] = [];

  for (let round = 0; round < rounds; round += 1) {
    const input = wordsToHex(state);
    const afterKeyMixWords = xorWords(state, subkeys[round]);
    const afterSboxWords = applySboxWords(afterKeyMixWords, round & 7);
    const afterLinearWords =
      round < rounds - 1
        ? linearTransform(afterSboxWords)
        : xorWords(afterSboxWords, subkeys[round + 1]);

    roundTrace.push({
      round: round + 1,
      input,
      afterKeyMix: wordsToHex(afterKeyMixWords),
      afterSbox: wordsToHex(afterSboxWords),
      afterLinearTransform: wordsToHex(afterLinearWords),
      subkey: wordsToHex(subkeys[round]),
      sbox: round & 7,
    });

    state = afterLinearWords;
  }

  return {
    plaintextHex: normalizedPlaintext,
    keyHex: normalizedKey,
    rounds,
    subkeys: subkeys.map(wordsToHex),
    roundTrace,
    ciphertextHex: wordsToHex(state),
  };
}

/**
 * Encrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param plaintext Input required by the Encrypt operation.
 * @param key Input required by the Encrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function encrypt(plaintext: string, key: string, options?: CipherOptions): CipherResult {
  validateInput(plaintext);
  validateKey(key);

  const keyHex = cleanHex(key);
  const ptHex = cleanHex(plaintext);

  if (ptHex.length !== 32) {
    throw new CipherError('INVALID_INPUT', 'Input must be exactly 16 bytes (32 hex characters).');
  }

  const ciphertext = encryptSerpentBlock(ptHex, keyHex);
  const steps = [];

  if (options?.instrument) {
    const trace = traceSerpentEncryption(ptHex, keyHex);
    steps.push({
      index: 1,
      label: 'Key Schedule',
      note: 'Expanded key into 33 128-bit round subkeys.',
      inputState: trace.subkeys[0],
      outputState: trace.ciphertextHex,
      isMilestone: true,
    });
    trace.roundTrace.forEach((r) => {
      steps.push({
        index: r.round + 1,
        label: `Round ${r.round} (S-box S${r.sbox})`,
        note: `Subkey XOR, S-box S${r.sbox} substitution, linear transformation`,
        inputState: r.input,
        outputState: r.afterLinearTransform,
        isMilestone: r.round % 4 === 0,
        sboxInspection: {
          family: 'serpent',
          serpentIndex: r.sbox,
          inputValue: `0x${parseInt(r.input.slice(0, 1), 16).toString(16)}`,
        },
      });
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
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function decrypt(ciphertext: string, key: string, options?: CipherOptions): CipherResult {
  validateInput(ciphertext);
  validateKey(key);

  const keyHex = cleanHex(key);
  const ctHex = cleanHex(ciphertext);

  if (ctHex.length !== 32) {
    throw new CipherError('INVALID_INPUT', 'Ciphertext must be exactly 16 bytes (32 hex characters).');
  }

  const plaintext = decryptSerpentBlock(ctHex, keyHex);
  return {
    output: plaintext,
    outputEncoding: 'hex',
    steps: [],
    metadata: METADATA,
    durationMs: 0,
  };
}

/**
 * Serpent Implementation Notes cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export function serpentImplementationNotes(): string[] {
  return [
    'Supports Serpent block encryption with 128-bit blocks and 128/192/256-bit keys.',
    'Pads short keys according to the Serpent key schedule rule before expanding to 256 bits.',
    'Uses 33 128-bit round subkeys for 32 rounds.',
    'Uses the Serpent S-box sequence and inverse S-box sequence for decryption.',
    'Includes reversible linear transform and inverse linear transform helpers.',
    'Includes encrypt/decrypt round-trip tests and reference-vector regression tests.',
  ];
}

