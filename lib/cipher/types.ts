/**
 * Core cipher types — authoritative reference for all cipher implementations.
 * Every file in lib/cipher/ must use these types.
 * @see CIPHER_ENGINE.md "Shared types" section
 */

export type Encoding = 'utf8' | 'hex' | 'base64' | 'binary'
export type CipherDirection = 'encrypt' | 'decrypt'

export interface CipherStep {
  /** Step index, zero-based */
  index: number
  /** Primary label, e.g. "Round 3 — SubBytes" */
  label: string
  /** Secondary label, e.g. "Applying S-Box to each byte" */
  sublabel?: string
  /** Snapshot before this step (hex) */
  inputState: string
  /** Snapshot after this step (hex) */
  outputState: string
  /** Byte/char indices changed in this step */
  highlight?: number[]
  /** Matrix data for AES state, Playfair grid, etc. */
  matrix?: string[][]
  /** Key-value table for key schedule display */
  table?: { key: string; value: string }[]
  /** Human-readable explanation of what happened */
  note: string
  /** True for major steps (show in summary mode) */
  isMilestone?: boolean
}

export interface CipherResult {
  output: string
  outputEncoding: Encoding
  steps: CipherStep[]
  metadata: CipherMetadata
  durationMs: number
}

export interface CipherMetadata {
  name: string
  keySize?: number
  blockSize?: number
  rounds?: number
  modeOfOperation?: string
  securityStatus: 'secure' | 'legacy' | 'deprecated' | 'broken'
  breakingComplexity?: string
  yearDesigned?: number
  standardBody?: string
}

export interface CipherOptions {
  mode?: string
  padding?: string
  encoding?: Encoding
  iv?: string
  /** When true, capture state after every sub-step (for visualizer) */
  instrument?: boolean
}

export type CipherName =
  | 'caesar'
  | 'rot13'
  | 'vigenere'
  | 'atbash'
  | 'playfair'
  | 'railfence'
  | 'beaufort'
  | 'hill'
  | 'xor'
  | 'otp'
  | 'des'
  | '3des'
  | 'aes'
  | 'rsa'
  | 'dh'
  | 'ecc'
  | 'sha256'
  | 'sha512'
  | 'md5'
  | 'bcrypt'
  | 'hmac'

export interface TestVector {
  input: string
  key: string
  expected: string
  description?: string
}
