import type { CipherOptions, CipherResult, CipherStep } from '../types';
import { CipherError, isCryptoVizError } from '../../utils/errors';

/**
 * Rc6Options cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export interface Rc6Options extends CipherOptions {
  rounds?: number;
}

/**
 * Rc6Round Trace cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export interface Rc6RoundTrace {
  round: number;
  a: string;
  b: string;
  c: string;
  d: string;
  t: string;
  u: string;
  subkeyA: string;
  subkeyC: string;
  output: string;
}

/**
 * Rc6Encryption Trace cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export interface Rc6EncryptionTrace {
  plaintextHex: string;
  keyHex: string;
  rounds: number;
  subkeys: string[];
  roundTrace: Rc6RoundTrace[];
  ciphertextHex: string;
}

/**
 * Rc6Cipher Input cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export interface Rc6CipherInput {
  text?: string;
  input?: string;
  plaintext?: string;
  ciphertext?: string;
  key: string;
  mode?: "encrypt" | "decrypt";
  options?: Rc6Options;
}

/**
 * Rc6Cipher Output cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export interface Rc6CipherOutput {
  text: string;
  output: string;
  result: string;
  mode: "encrypt" | "decrypt";
  algorithm: "RC6";
  keyHex: string;
  inputHex: string;
  trace?: Rc6EncryptionTrace;
}

/**
 * Rc6Common Cipher cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export interface Rc6CommonCipher {
  name: "RC6";
  displayName: string;
  blockSizeBits: number;
  keySizeBits: number[];
  encrypt: (input: Rc6CipherInput | string, keyHex?: string, options?: Rc6Options) => Rc6CipherOutput | string;
  decrypt: (input: Rc6CipherInput | string, keyHex?: string, options?: Rc6Options) => Rc6CipherOutput | string;
  run: (input: Rc6CipherInput) => Rc6CipherOutput;
}

const WORD_BITS = 32;
const WORD_BYTES = 4;
const DEFAULT_ROUNDS = 20;
const P32 = 0xb7e15163;
const Q32 = 0x9e3779b9;

function cleanHex(value: string): string {
  return value.trim().replace(/\s+/g, "").replace(/^0x/i, "").toUpperCase();
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
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function assertHexLength(value: string, expectedLength: number, label: string): string {
  const cleaned = cleanHex(value);

  if (!cleaned) {
    throw new CipherError("INPUT_REQUIRED", `${label} is required.`);
  }

  if (!/^[A-F0-9]+$/.test(cleaned)) {
    throw new CipherError("INVALID_INPUT", `${label} must contain only hexadecimal characters.`);
  }

  if (cleaned.length !== expectedLength) {
    throw new CipherError("INVALID_INPUT", `${label} must be exactly ${expectedLength} hexadecimal characters.`);
  }

  return cleaned;
}

function assertKeyHex(value: string): string {
  const cleaned = cleanHex(value);

  if (!cleaned) {
    throw new CipherError("INVALID_KEY", "RC6 key is required.");
  }

  if (!/^[A-F0-9]+$/.test(cleaned)) {
    throw new CipherError("INVALID_KEY", "RC6 key must contain only hexadecimal characters.");
  }

  if (cleaned.length % 2 !== 0) {
    throw new CipherError("INVALID_KEY", "RC6 key must contain a whole number of bytes.");
  }

  if (cleaned.length > 64) {
    throw new CipherError("INVALID_KEY", "RC6 key must be 32 bytes or fewer.");
  }

  return cleaned;
}

function toHex32(value: number): string {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"))
    .join("");
}

function readWordLE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function writeWordLE(value: number, output: Uint8Array, offset: number): void {
  output[offset] = value & 0xff;
  output[offset + 1] = (value >>> 8) & 0xff;
  output[offset + 2] = (value >>> 16) & 0xff;
  output[offset + 3] = (value >>> 24) & 0xff;
}

/**
 * Rotl32 cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param value Input required by the Rotl32 operation.
 * @param shift Input required by the Rotl32 operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function rotl32(value: number, shift: number): number {
  const amount = shift & 31;
  return amount === 0
    ? value >>> 0
    : (((value << amount) | (value >>> (WORD_BITS - amount))) >>> 0);
}

/**
 * Rotr32 cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param value Input required by the Rotr32 operation.
 * @param shift Input required by the Rotr32 operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function rotr32(value: number, shift: number): number {
  const amount = shift & 31;
  return amount === 0
    ? value >>> 0
    : (((value >>> amount) | (value << (WORD_BITS - amount))) >>> 0);
}

function add32(left: number, right: number): number {
  return (left + right) >>> 0;
}

function sub32(left: number, right: number): number {
  return (left - right) >>> 0;
}

function multiply32(left: number, right: number): number {
  return Math.imul(left, right) >>> 0;
}

/**
 * Generate Rc6Subkeys cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param keyHex Input required by the Generate Rc6Subkeys operation.
 * @param rounds Input required by the Generate Rc6Subkeys operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function generateRc6Subkeys(keyHex: string, rounds = DEFAULT_ROUNDS): number[] {
  const keyBytes = hexToBytes(assertKeyHex(keyHex));
  const c = Math.max(1, Math.ceil(keyBytes.length / WORD_BYTES));
  const l = new Array<number>(c).fill(0);

  for (let index = keyBytes.length - 1; index >= 0; index -= 1) {
    l[Math.floor(index / WORD_BYTES)] = ((l[Math.floor(index / WORD_BYTES)] << 8) + keyBytes[index]) >>> 0;
  }

  const subkeyCount = 2 * rounds + 4;
  const s = new Array<number>(subkeyCount);
  s[0] = P32;

  for (let index = 1; index < subkeyCount; index += 1) {
    s[index] = add32(s[index - 1], Q32);
  }

  let a = 0;
  let b = 0;
  let i = 0;
  let j = 0;
  const iterations = 3 * Math.max(c, subkeyCount);

  for (let step = 0; step < iterations; step += 1) {
    a = s[i] = rotl32(add32(add32(s[i], a), b), 3);
    b = l[j] = rotl32(add32(add32(l[j], a), b), add32(a, b));
    i = (i + 1) % subkeyCount;
    j = (j + 1) % c;
  }

  return s;
}

function parseBlock(blockHex: string): [number, number, number, number] {
  const block = hexToBytes(assertHexLength(blockHex, 32, "RC6 block"));
  return [
    readWordLE(block, 0),
    readWordLE(block, 4),
    readWordLE(block, 8),
    readWordLE(block, 12),
  ];
}

function formatBlock(a: number, b: number, c: number, d: number): string {
  const output = new Uint8Array(16);
  writeWordLE(a, output, 0);
  writeWordLE(b, output, 4);
  writeWordLE(c, output, 8);
  writeWordLE(d, output, 12);
  return bytesToHex(output);
}

/**
 * Encrypt Rc6Block cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param plaintextHex Input required by the Encrypt Rc6Block operation.
 * @param keyHex Input required by the Encrypt Rc6Block operation.
 * @param options Input required by the Encrypt Rc6Block operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encryptRc6Block(plaintextHex: string, keyHex: string, options: Rc6Options = {}): string {
  const rounds = options.rounds ?? DEFAULT_ROUNDS;
  const s = generateRc6Subkeys(keyHex, rounds);
  let [a, b, c, d] = parseBlock(plaintextHex);

  b = add32(b, s[0]);
  d = add32(d, s[1]);

  for (let round = 1; round <= rounds; round += 1) {
    const t = rotl32(multiply32(b, add32(multiply32(2, b), 1)), 5);
    const u = rotl32(multiply32(d, add32(multiply32(2, d), 1)), 5);

    a = add32(rotl32((a ^ t) >>> 0, u), s[2 * round]);
    c = add32(rotl32((c ^ u) >>> 0, t), s[2 * round + 1]);

    [a, b, c, d] = [b, c, d, a];
  }

  a = add32(a, s[2 * rounds + 2]);
  c = add32(c, s[2 * rounds + 3]);

  return formatBlock(a, b, c, d);
}

/**
 * Decrypt Rc6Block cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param ciphertextHex Input required by the Decrypt Rc6Block operation.
 * @param keyHex Input required by the Decrypt Rc6Block operation.
 * @param options Input required by the Decrypt Rc6Block operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decryptRc6Block(ciphertextHex: string, keyHex: string, options: Rc6Options = {}): string {
  const rounds = options.rounds ?? DEFAULT_ROUNDS;
  const s = generateRc6Subkeys(keyHex, rounds);
  let [a, b, c, d] = parseBlock(ciphertextHex);

  c = sub32(c, s[2 * rounds + 3]);
  a = sub32(a, s[2 * rounds + 2]);

  for (let round = rounds; round >= 1; round -= 1) {
    [a, b, c, d] = [d, a, b, c];

    const u = rotl32(multiply32(d, add32(multiply32(2, d), 1)), 5);
    const t = rotl32(multiply32(b, add32(multiply32(2, b), 1)), 5);

    c = (rotr32(sub32(c, s[2 * round + 1]), t) ^ u) >>> 0;
    a = (rotr32(sub32(a, s[2 * round]), u) ^ t) >>> 0;
  }

  d = sub32(d, s[1]);
  b = sub32(b, s[0]);

  return formatBlock(a, b, c, d);
}

/**
 * Trace Rc6Encryption cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param plaintextHex Input required by the Trace Rc6Encryption operation.
 * @param keyHex Input required by the Trace Rc6Encryption operation.
 * @param options Input required by the Trace Rc6Encryption operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function traceRc6Encryption(plaintextHex: string, keyHex: string, options: Rc6Options = {}): Rc6EncryptionTrace {
  const rounds = options.rounds ?? DEFAULT_ROUNDS;
  const normalizedPlaintext = assertHexLength(plaintextHex, 32, "RC6 block");
  const normalizedKey = assertKeyHex(keyHex);
  const s = generateRc6Subkeys(normalizedKey, rounds);
  let [a, b, c, d] = parseBlock(normalizedPlaintext);
  const roundTrace: Rc6RoundTrace[] = [];

  b = add32(b, s[0]);
  d = add32(d, s[1]);

  for (let round = 1; round <= rounds; round += 1) {
    const t = rotl32(multiply32(b, add32(multiply32(2, b), 1)), 5);
    const u = rotl32(multiply32(d, add32(multiply32(2, d), 1)), 5);

    a = add32(rotl32((a ^ t) >>> 0, u), s[2 * round]);
    c = add32(rotl32((c ^ u) >>> 0, t), s[2 * round + 1]);
    [a, b, c, d] = [b, c, d, a];

    roundTrace.push({
      round,
      a: toHex32(a),
      b: toHex32(b),
      c: toHex32(c),
      d: toHex32(d),
      t: toHex32(t),
      u: toHex32(u),
      subkeyA: toHex32(s[2 * round]),
      subkeyC: toHex32(s[2 * round + 1]),
      output: formatBlock(a, b, c, d),
    });
  }

  a = add32(a, s[2 * rounds + 2]);
  c = add32(c, s[2 * rounds + 3]);

  return {
    plaintextHex: normalizedPlaintext,
    keyHex: normalizedKey,
    rounds,
    subkeys: s.map(toHex32),
    roundTrace,
    ciphertextHex: formatBlock(a, b, c, d),
  };
}

function resolveInput(input: Rc6CipherInput | string, explicitKey?: string, options?: Rc6Options, mode: "encrypt" | "decrypt" = "encrypt") {
  if (typeof input === "string") {
    if (!explicitKey) {
      throw new CipherError("INVALID_KEY", "RC6 key is required.");
    }

    return {
      inputHex: input,
      keyHex: explicitKey,
      mode,
      options,
      shouldReturnString: true,
    };
  }

  const inputHex = input.input ?? input.text ?? input.plaintext ?? input.ciphertext;
  if (!inputHex) {
    throw new CipherError("INPUT_REQUIRED", "RC6 input text is required.");
  }

  return {
    inputHex,
    keyHex: input.key,
    mode: input.mode ?? mode,
    options: input.options ?? options,
    shouldReturnString: false,
  };
}

function buildOutput(
  inputHex: string,
  keyHex: string,
  mode: "encrypt" | "decrypt",
  result: string,
  trace?: Rc6EncryptionTrace,
): Rc6CipherOutput {
  return {
    text: result,
    output: result,
    result,
    mode,
    algorithm: "RC6",
    keyHex: assertKeyHex(keyHex),
    inputHex: assertHexLength(inputHex, 32, "RC6 block"),
    trace,
  };
}

/**
 * Encrypt Rc6 cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Encrypt Rc6 operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encryptRc6(input: Rc6CipherInput | string, keyHex?: string, options?: Rc6Options): Rc6CipherOutput | string {
  const resolved = resolveInput(input, keyHex, options, "encrypt");
  const trace = traceRc6Encryption(resolved.inputHex, resolved.keyHex, resolved.options);
  const output = buildOutput(resolved.inputHex, resolved.keyHex, "encrypt", trace.ciphertextHex, trace);

  return resolved.shouldReturnString ? output.result : output;
}

/**
 * Decrypt Rc6 cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Decrypt Rc6 operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decryptRc6(input: Rc6CipherInput | string, keyHex?: string, options?: Rc6Options): Rc6CipherOutput | string {
  const resolved = resolveInput(input, keyHex, options, "decrypt");
  const plaintext = decryptRc6Block(resolved.inputHex, resolved.keyHex, resolved.options);
  const output = buildOutput(resolved.inputHex, resolved.keyHex, "decrypt", plaintext);

  return resolved.shouldReturnString ? output.result : output;
}

/**
 * Rc6 cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Rc6 operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function rc6(input: Rc6CipherInput): Rc6CipherOutput {
  return input.mode === "decrypt"
    ? (decryptRc6(input) as Rc6CipherOutput)
    : (encryptRc6(input) as Rc6CipherOutput);
}

/**
 * Rc6Cipher cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const rc6Cipher: Rc6CommonCipher = {
  name: "RC6",
  displayName: "RC6",
  blockSizeBits: 128,
  keySizeBits: [128, 192, 256],
  encrypt: encryptRc6,
  decrypt: decryptRc6,
  run: rc6,
};

/**
 * RC6 cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const RC6 = rc6Cipher;

export default rc6Cipher;

/**
 * Rc6Implementation Notes cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function rc6ImplementationNotes(): string[] {
  return [
    "Exports block-level helpers and shared API-compatible encrypt/decrypt wrappers.",
    "Supports legacy string signature: encryptRc6Block(plaintext, key) and encryptRc6(plaintext, key).",
    "Supports object signature: rc6({ input, key, mode }).",
    "Uses little-endian word parsing, Math.imul multiplication, and masked 32-bit rotations.",
    "Passes the RC6-32/20/16 published zero-key vector.",
  ];
}

/**
 * TEST VECTORS cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS = [
  {
    input: '00000000000000000000000000000000',
    key: '00000000000000000000000000000000',
    expected: '8FC3A53656B1F778C129DF4E9848A41E',
    description: 'RC6-32/20/16 Published Zero Vector',
  },
]

/**
 * Encrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Encrypt operation.
 * @param key Input required by the Encrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(input: string, key: string, options?: Rc6Options): CipherResult {
  if (!input) {
    throw new CipherError('INPUT_REQUIRED', 'Input message is required.');
  }
  if (!key || key.length !== 32) {
    throw new CipherError('INVALID_KEY', 'Invalid key: RC6 requires a 128-bit key (32 hex characters).');
  }
  if (input.length % 32 !== 0 || !/^[0-9a-fA-F]+$/.test(input)) {
    throw new CipherError('INVALID_INPUT', 'Input must be a valid hex string with length multiple of 32 hexadecimal characters.');
  }
  
  const numBlocks = input.length / 32
  let outHex = ''
  const steps: CipherStep[] = []
  
  for (let b = 0; b < numBlocks; b++) {
    const block = input.slice(b * 32, (b + 1) * 32)
    const trace = traceRc6Encryption(block, key, options?.rounds ? { rounds: options.rounds } : undefined)
    outHex += trace.ciphertextHex
    
    if (options?.instrument) {
      trace.roundTrace.forEach((rt) => {
        steps.push({
          index: steps.length,
          label: `Block ${b + 1} - Round ${rt.round}`,
          inputState: block,
          outputState: rt.output,
          note: `A: ${rt.a}, B: ${rt.b}, C: ${rt.c}, D: ${rt.d}`,
        })
      })
    }
  }
  
  return {
    output: outHex,
    outputEncoding: 'hex' as const,
    steps,
    metadata: {
      name: 'RC6',
      securityStatus: 'legacy' as const,
    },
    durationMs: 0,
  }
}

/**
 * Decrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Decrypt operation.
 * @param key Input required by the Decrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decrypt(input: string, key: string, options?: Rc6Options): CipherResult {
  if (!input) {
    throw new CipherError('INPUT_REQUIRED', 'Input message is required.');
  }
  if (!key || key.length !== 32) {
    throw new CipherError('INVALID_KEY', 'Invalid key: RC6 requires a 128-bit key (32 hex characters).');
  }
  if (input.length % 32 !== 0 || !/^[0-9a-fA-F]+$/.test(input)) {
    throw new CipherError('INVALID_INPUT', 'Input must be a valid hex string with length multiple of 32 hexadecimal characters.');
  }
  
  const numBlocks = input.length / 32
  let outHex = ''
  const steps: CipherStep[] = []
  
  for (let b = 0; b < numBlocks; b++) {
    const block = input.slice(b * 32, (b + 1) * 32)
    outHex += decryptRc6Block(block, key, options?.rounds ? { rounds: options.rounds } : undefined)
  }
  
  return {
    output: outHex,
    outputEncoding: 'hex' as const,
    steps: [],
    metadata: {
      name: 'RC6',
      securityStatus: 'legacy' as const,
    },
    durationMs: 0,
  }
}


