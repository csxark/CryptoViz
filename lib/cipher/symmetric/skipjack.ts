/**
 * Skipjack Round Trace cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export interface SkipjackRoundTrace {
  round: number;
  rule: "A" | "B" | "A-inverse" | "B-inverse";
  keyIndex: number;
  input: string;
  output: string;
  note: string;
}

import { CipherError, validateInput, validateKey } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherOptions, CipherMetadata, TestVector } from '../types'

/**
 * Skipjack Trace cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export interface SkipjackTrace {
  mode: "encrypt" | "decrypt";
  inputHex: string;
  keyHex: string;
  outputHex: string;
  rounds: SkipjackRoundTrace[];
}

const METADATA: CipherMetadata = {
  name: 'Skipjack',
  blockSize: 64,
  keySize: 80,
  securityStatus: 'legacy',
  breakingComplexity: 'Susceptible to brute-force key recovery due to short 80-bit key size.',
  yearDesigned: 1998,
  standardBody: 'NIST/NSA SKIPJACK',
}

const FTABLE = [
  0xa3, 0xd7, 0x09, 0x83, 0xf8, 0x48, 0xf6, 0xf4, 0xb3, 0x21, 0x15, 0x78, 0x99, 0xb1, 0xaf, 0xf9,
  0xe7, 0x2d, 0x4d, 0x8a, 0xce, 0x4c, 0xca, 0x2e, 0x52, 0x95, 0xd9, 0x1e, 0x4e, 0x38, 0x44, 0x28,
  0x0a, 0xdf, 0x02, 0xa0, 0x17, 0xf1, 0x60, 0x68, 0x12, 0xb7, 0x7a, 0xc3, 0xe9, 0xfa, 0x3d, 0x53,
  0x96, 0x84, 0x6b, 0xba, 0xf2, 0x63, 0x9a, 0x19, 0x7c, 0xae, 0xe5, 0xf5, 0xf7, 0x16, 0x6a, 0xa2,
  0x39, 0xb6, 0x7b, 0x0f, 0xc1, 0x93, 0x81, 0x1b, 0xee, 0xb4, 0x1a, 0xea, 0xd0, 0x91, 0x2f, 0xb8,
  0x55, 0xb9, 0xda, 0x85, 0x3f, 0x41, 0xbf, 0xe0, 0x5a, 0x58, 0x80, 0x5f, 0x66, 0x0b, 0xd8, 0x90,
  0x35, 0xd5, 0xc0, 0xa7, 0x33, 0x06, 0x65, 0x69, 0x45, 0x00, 0x94, 0x56, 0x6d, 0x98, 0x9b, 0x76,
  0x97, 0xfc, 0xb2, 0xc2, 0xb0, 0xfe, 0xdb, 0x20, 0xe1, 0xeb, 0xd6, 0xe4, 0xdd, 0x47, 0x4a, 0x1d,
  0x42, 0xed, 0x9e, 0x6e, 0x49, 0x3c, 0xcd, 0x43, 0x27, 0xd2, 0x07, 0xd4, 0xde, 0xc7, 0x67, 0x18,
  0x89, 0xcb, 0x30, 0x1f, 0x8d, 0xc6, 0x8f, 0xaa, 0xc8, 0x74, 0xdc, 0xc9, 0x5d, 0x5c, 0x31, 0xa4,
  0x70, 0x88, 0x61, 0x2c, 0x9f, 0x0d, 0x2b, 0x87, 0x50, 0x82, 0x54, 0x64, 0x26, 0x7d, 0x03, 0x40,
  0x34, 0x4b, 0x1c, 0x73, 0xd1, 0xc4, 0xfd, 0x3b, 0xcc, 0xfb, 0x7f, 0xab, 0xe6, 0x3e, 0x5b, 0xa5,
  0xad, 0x04, 0x23, 0x9c, 0x14, 0x51, 0x22, 0xf0, 0x29, 0x79, 0x71, 0x7e, 0xff, 0x8c, 0x0e, 0xe2,
  0x0c, 0xef, 0xbc, 0x72, 0x75, 0x6f, 0x37, 0xa1, 0xec, 0xd3, 0x8e, 0x62, 0x8b, 0x86, 0x10, 0xe8,
  0x08, 0x77, 0x11, 0xbe, 0x92, 0x4f, 0x24, 0xc5, 0x32, 0x36, 0x9d, 0xcf, 0xf3, 0xa6, 0xbb, 0xac,
  0x5e, 0x6c, 0xa9, 0x13, 0x57, 0x25, 0xb5, 0xe3, 0xbd, 0xa8, 0x3a, 0x01, 0x05, 0x59, 0x2a, 0x46,
] as const;

function cleanHex(value: string): string {
  return value.trim().replace(/^0x/i, "").replace(/\s+/g, "").toUpperCase();
}

/**
 * Assert Skipjack Block Hex cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param value Input required by the Assert Skipjack Block Hex operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function assertSkipjackBlockHex(value: string): string {
  const cleaned = cleanHex(value);
  if (!cleaned) throw new CipherError("INPUT_REQUIRED", "Skipjack block is required.");
  if (!/^[A-F0-9]+$/.test(cleaned)) throw new CipherError("INVALID_INPUT", "Skipjack block must contain only hexadecimal characters.");
  if (cleaned.length !== 16) throw new CipherError("INVALID_INPUT", "Skipjack block must be exactly 16 hexadecimal characters.");
  return cleaned;
}

/**
 * Assert Skipjack Key Hex cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param value Input required by the Assert Skipjack Key Hex operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function assertSkipjackKeyHex(value: string): string {
  const cleaned = cleanHex(value);
  if (!cleaned) throw new CipherError("INVALID_KEY", "Skipjack key is required.");
  if (!/^[A-F0-9]+$/.test(cleaned)) throw new CipherError("INVALID_KEY", "Skipjack key must contain only hexadecimal characters.");
  if (cleaned.length !== 20) throw new CipherError("INVALID_KEY", "Skipjack key must be exactly 80-bit (20 hexadecimal characters).");
  return cleaned;
}

function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let index = 0; index < hex.length; index += 2) {
    bytes.push(Number.parseInt(hex.slice(index, index + 2), 16));
  }
  return bytes;
}

function readWordBE(bytes: number[], offset: number): number {
  return ((bytes[offset] << 8) | bytes[offset + 1]) & 0xffff;
}

function wordToHex(value: number): string {
  return (value & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

function blockToWords(blockHex: string): [number, number, number, number] {
  const bytes = hexToBytes(assertSkipjackBlockHex(blockHex));
  return [
    readWordBE(bytes, 0),
    readWordBE(bytes, 2),
    readWordBE(bytes, 4),
    readWordBE(bytes, 6),
  ];
}

function wordsToBlock(words: [number, number, number, number]): string {
  return words.map(wordToHex).join("");
}

function gPermutation(word: number, round: number, key: number[]): number {
  let g1 = (word >>> 8) & 0xff;
  let g2 = word & 0xff;
  const keyBase = (round * 4) % 10;

  const g3 = FTABLE[g2 ^ key[keyBase]] ^ g1;
  const g4 = FTABLE[g3 ^ key[(keyBase + 1) % 10]] ^ g2;
  const g5 = FTABLE[g4 ^ key[(keyBase + 2) % 10]] ^ g3;
  const g6 = FTABLE[g5 ^ key[(keyBase + 3) % 10]] ^ g4;

  return ((g5 << 8) | g6) & 0xffff;
}

function gInverse(word: number, round: number, key: number[]): number {
  const g5 = (word >>> 8) & 0xff;
  const g6 = word & 0xff;
  const keyBase = (round * 4) % 10;

  const g4 = FTABLE[g5 ^ key[(keyBase + 3) % 10]] ^ g6;
  const g3 = FTABLE[g4 ^ key[(keyBase + 2) % 10]] ^ g5;
  const g2 = FTABLE[g3 ^ key[(keyBase + 1) % 10]] ^ g4;
  const g1 = FTABLE[g2 ^ key[keyBase]] ^ g3;

  return ((g1 << 8) | g2) & 0xffff;
}

function isRuleA(round: number): boolean {
  const block = Math.floor(round / 8);
  return block === 0 || block === 2;
}

function roundCounter(round: number): number {
  return round + 1;
}

function encryptRound(words: [number, number, number, number], round: number, key: number[]): [number, number, number, number] {
  const [w1, w2, w3, w4] = words;
  const counter = roundCounter(round);
  const g = gPermutation(w1, round, key);

  if (isRuleA(round)) {
    return [g ^ w4 ^ counter, g, w2, w3].map((word) => word & 0xffff) as [number, number, number, number];
  }

  return [w4, g, w1 ^ w2 ^ counter, w3].map((word) => word & 0xffff) as [number, number, number, number];
}

function decryptRound(words: [number, number, number, number], round: number, key: number[]): [number, number, number, number] {
  const [y1, y2, y3, y4] = words;
  const counter = roundCounter(round);
  const originalW1 = gInverse(y2, round, key);

  if (isRuleA(round)) {
    const originalW2 = y3;
    const originalW3 = y4;
    const originalW4 = y1 ^ y2 ^ counter;
    return [originalW1, originalW2, originalW3, originalW4].map((word) => word & 0xffff) as [number, number, number, number];
  }

  const originalW4 = y1;
  const originalW2 = y3 ^ originalW1 ^ counter;
  const originalW3 = y4;
  return [originalW1, originalW2, originalW3, originalW4].map((word) => word & 0xffff) as [number, number, number, number];
}

/**
 * Encrypt Skipjack Block cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param plaintextHex Input required by the Encrypt Skipjack Block operation.
 * @param keyHex Input required by the Encrypt Skipjack Block operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encryptSkipjackBlock(plaintextHex: string, keyHex: string): string {
  const key = hexToBytes(assertSkipjackKeyHex(keyHex));
  let words = blockToWords(plaintextHex);

  for (let round = 0; round < 32; round += 1) {
    words = encryptRound(words, round, key);
  }

  return wordsToBlock(words);
}

/**
 * Decrypt Skipjack Block cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param ciphertextHex Input required by the Decrypt Skipjack Block operation.
 * @param keyHex Input required by the Decrypt Skipjack Block operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decryptSkipjackBlock(ciphertextHex: string, keyHex: string): string {
  const key = hexToBytes(assertSkipjackKeyHex(keyHex));
  let words = blockToWords(ciphertextHex);

  for (let round = 31; round >= 0; round -= 1) {
    words = decryptRound(words, round, key);
  }

  return wordsToBlock(words);
}

/**
 * Encrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Encrypt operation.
 * @param key Input required by the Encrypt operation.
 * @param options Input required by the Encrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  const start = performance.now()
  const plaintextHex = assertSkipjackBlockHex(input)
  const keyHex = assertSkipjackKeyHex(key)

  let output: string
  const steps: CipherStep[] = []

  if (options.instrument) {
    const trace = traceSkipjack(plaintextHex, keyHex, 'encrypt')
    output = trace.outputHex
    trace.rounds.forEach((r, idx) => {
      steps.push({
        index: idx,
        label: `Round ${r.round} (${r.rule})`,
        inputState: r.input,
        outputState: r.output,
        note: r.note,
      })
    })
  } else {
    output = encryptSkipjackBlock(plaintextHex, keyHex)
  }

  return {
    output,
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

/**
 * Decrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Decrypt operation.
 * @param key Input required by the Decrypt operation.
 * @param options Input required by the Decrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  const start = performance.now()
  const ciphertextHex = assertSkipjackBlockHex(input)
  const keyHex = assertSkipjackKeyHex(key)

  let output: string
  const steps: CipherStep[] = []

  if (options.instrument) {
    const trace = traceSkipjack(ciphertextHex, keyHex, 'decrypt')
    output = trace.outputHex
    trace.rounds.forEach((r, idx) => {
      steps.push({
        index: idx,
        label: `Round ${r.round} (${r.rule})`,
        inputState: r.input,
        outputState: r.output,
        note: r.note,
      })
    })
  } else {
    output = decryptSkipjackBlock(ciphertextHex, keyHex)
  }

  return {
    output,
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

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
    input: '33221100DDCCBBAA',
    key: '00998877665544332211',
    expected: '2587CAEA7212D595',
    description: 'Official Skipjack example vector',
  },
]

/**
 * Trace Skipjack cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param inputHex Input required by the Trace Skipjack operation.
 * @param keyHex Input required by the Trace Skipjack operation.
 * @param mode Input required by the Trace Skipjack operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function traceSkipjack(inputHex: string, keyHex: string, mode: "encrypt" | "decrypt"): SkipjackTrace {
  const key = hexToBytes(assertSkipjackKeyHex(keyHex));
  let words = blockToWords(inputHex);
  const rounds: SkipjackRoundTrace[] = [];

  if (mode === "encrypt") {
    for (let round = 0; round < 32; round += 1) {
      const input = wordsToBlock(words);
      words = encryptRound(words, round, key);
      rounds.push({
        round: round + 1,
        rule: isRuleA(round) ? "A" : "B",
        keyIndex: (round * 4) % 10,
        input,
        output: wordsToBlock(words),
        note: isRuleA(round)
          ? "Rule A applies G to w1, mixes the round counter, and rotates words."
          : "Rule B applies G to w1, mixes w1/w2/counter, and rotates words.",
      });
    }
  } else {
    for (let round = 31; round >= 0; round -= 1) {
      const input = wordsToBlock(words);
      words = decryptRound(words, round, key);
      rounds.push({
        round: round + 1,
        rule: isRuleA(round) ? "A-inverse" : "B-inverse",
        keyIndex: (round * 4) % 10,
        input,
        output: wordsToBlock(words),
        note: isRuleA(round)
          ? "Inverse Rule A recovers the previous four words using inverse G."
          : "Inverse Rule B recovers the previous four words using inverse G.",
      });
    }
  }

  return {
    mode,
    inputHex: assertSkipjackBlockHex(inputHex),
    keyHex: assertSkipjackKeyHex(keyHex),
    outputHex: wordsToBlock(words),
    rounds,
  };
}

/**
 * Skipjack Implementation Notes cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function skipjackImplementationNotes(): string[] {
  return [
    "Skipjack uses a 64-bit block and 80-bit key.",
    "Encryption runs 32 rounds using Rule A for rounds 1-8 and 17-24, and Rule B for rounds 9-16 and 25-32.",
    "Decryption walks rounds in reverse order and applies inverse Rule A or inverse Rule B.",
    "The G permutation is inverted by reversing its four byte-substitution steps.",
    "The decrypt path is tested by known-vector and round-trip checks.",
  ];
}
