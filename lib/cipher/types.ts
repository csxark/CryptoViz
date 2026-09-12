/**
 * Core cipher types — authoritative reference for all cipher implementations.
 * Every file in lib/cipher/ must use these types.
 *
 * @see CIPHER_ENGINE.md "Shared types" section
 */

import type { DataProvenanceMetadata } from "../provenance";

/**
 * Encoding cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export type Encoding = "utf8" | "hex" | "base64" | "binary";

/**
 * Cipher Direction cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export type CipherDirection = "encrypt" | "decrypt";

/**
 * Semantic cryptographic operation classification.
 * Primitives must not be forced into an encrypt/decrypt abstraction when they
 * perform hashing, signing, key agreement, KEM, KDF, or secret sharing.
 */
export type CryptographicOperation =
  | "encrypt"
  | "decrypt"
  | "hash"
  | "mac"
  | "mac-verify"
  | "sign"
  | "verify"
  | "keygen"
  | "key-agreement"
  | "kem-encapsulate"
  | "kem-decapsulate"
  | "kdf"
  | "split"
  | "combine"
  | "encode"
  | "decode"
  | "educational-demo";

/**
 * Cipher Step cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface CipherStep {
  /** Step index, zero-based */
  index: number;

  /** Primary label, e.g. "Round 3 — SubBytes" */
  label: string;

  /** Secondary label, e.g. "Applying S-Box to each byte" */
  sublabel?: string;

  /** Snapshot before this step (hex) */
  inputState: string;

  /** Snapshot after this step (hex) */
  outputState: string;

  /** Byte/char indices changed in this step */
  highlight?: number[];

  /** Matrix data for AES state, Playfair grid, etc. */
  matrix?: string[][];

  /** Key-value table for key schedule display */
  table?: { key: string; value: string }[];

  /** Human-readable explanation of what happened */
  note?: string;

  /** True for major steps (show in summary mode) */
  isMilestone?: boolean;

  sboxInspection?: {
    family: string;
    inputValue: string;
    desIndex?: number;
    serpentIndex?: number;
  };
}

/**
 * Cipher Result cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface CipherResult {
  output: string;
  outputEncoding: Encoding;
  steps: CipherStep[];
  metadata: CipherMetadata;
  durationMs: number;
  provenance?: DataProvenanceMetadata;
}

/**
 * Cipher Name cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export type CipherName = string;

/**
 * Cipher Metadata cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface CipherMetadata {
  name: string;
  keySize?: number;
  blockSize?: number;
  rounds?: number;
  modeOfOperation?: string;
  securityStatus:
    | "recommended"
    | "secure"
    | "legacy"
    | "deprecated"
    | "broken"
    | "experimental"
    | "mock";

  breakingComplexity?: string;
  yearDesigned?: number;
  standardBody?: string;
  securityWarning?: string;
  provenance?: DataProvenanceMetadata;
  primaryOperation?: CryptographicOperation;
  supportedOperations?: CryptographicOperation[];
}

/**
 * Cipher Options cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface CipherOptions {
  mode?: string;
  padding?: boolean | string;
  encoding?: Encoding;
  iv?: string;
  hash?: string;
  keyLength?: number;
  info?: string;

  /** When true, capture state after every sub-step (for visualizer) */
  instrument?: boolean;

  signal?: AbortSignal;

  hexInput?: boolean;
  rounds?: number;
  N?: number;
  r?: number;
  p?: number;
  dkLen?: number;
  salt?: string;
  iterations?: number;

  [key: string]: unknown;
}

/**
 * Test Vector cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export interface TestVector {
  input: string;
  key: string;
  expected: string;

  /** Expected output for decrypt (if different from encrypt) */
  expectedDecrypt?: string;

  description?: string;

  /** Skip the encrypt direction in the KAT runner */
  skipEncrypt?: boolean;

  /** Skip the decrypt direction in the KAT runner */
  skipDecrypt?: boolean;

  /** Extra options forwarded to encrypt/decrypt */
  options?: Record<string, unknown>;
}
