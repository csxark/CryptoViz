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
  note?: string
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
  hash?: string
  keyLength?: number
  info?: string
  /** When true, capture state after every sub-step (for visualizer) */
  instrument?: boolean
  signal?: AbortSignal
  hexInput?: boolean
  rounds?: number
  N?: number
  r?: number
  p?: number
  dkLen?: number
  salt?: string
  iterations?: number
  [key: string]: unknown
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
  | 'autokey'
  | 'porta'
  | 'adfgvx'
  | 'bifid'
  | 'foursquare'
  | 'nihilist'
  | 'xor'
  | 'otp'
  | 'des'
  | '3des'
  | 'aes-xts'
  | 'aes'
  | 'aes-gcm'
  | 'serpent'
  | 'chacha20-poly1305'
  | 'speck'
  | 'aes-ccm'
  | 'threefish'
  | 'xchacha20'
  | 'twofish'
  | 'gost'
  | 'rc2'
  | 'enigma'
  | 'ascon'
  | 'xsalsa20'
  | 'trivium'
  | 'sm4'
  | 'present'
  | 'simon32'
  | 'tea'
  | 'noekeon'
  | 'lea'
  | 'gift'
  | 'xxtea'
  | 'blowfish'
  | 'streebog'
  | 'seed'
  | 'kuznyechik'
  | 'simon'
  | 'rabbit'
  | 'hc128'
  | 'anubis'
  | 'mars'
  | 'clefia'
  | 'misty1'
  | 'square'
  | 'feal'
  | 'aria'
  | 'kasumi'
  | 'rc4'
  | 'salsa20'
  | 'skipjack'
  | 'chacha20'
  | 'rc5'
  | 'xtea'
  | 'rc6'
  | 'camellia'
  | 'idea'
  | 'rsa'
  | 'columnar-transposition'
  | 'dsa'
  | 'dh'
  | 'x448'
  | 'ecc'
  | 'schnorr'
  | 'elgamal-signature'
  | 'elgamal'
  | 'ml-dsa'
  | 'ecies'
  | 'ml-kem'
  | 'frodokem'
  | 'ed448'
  | 'shamir-secret-sharing'
  | 'sidh'
  | 'ntru'
  | 'mceliece'
  | 'ed25519'
  | 'rabin'
  | 'x25519'
  | 'paillier'
  | 'merkle-hellman'
  | 'ecdsa'
  | 'sha256'
  | 'sha512'
  | 'md5'
  | 'bcrypt'
  | 'polybius'
  | 'sha3'
  | 'ripemd160'
  | 'blake2b'
  | 'blake3'
  | 'sha224'
  | 'sha384'
  | 'shake128'
  | 'shake256'
  | 'pbkdf2'
  | 'md4'
  | 'argon2'
  | 'skein'
  | 'lsh256'
  | 'tiger'
  | 'grostl'
  | 'jh'
  | 'poly1305'
  | 'hmac'
  | 'cmac'
  | 'sha1'
  | 'hkdf'
  | 'blake2s'
  | 'bloom-filter'
  | 'sm3'

export interface TestVector {
  input: string
  key: string
  expected: string
  /** Expected output for decrypt (if different from encrypt) */
  expectedDecrypt?: string
  description?: string
  /** Skip the encrypt direction in the KAT runner */
  skipEncrypt?: boolean
  /** Skip the decrypt direction in the KAT runner */
  skipDecrypt?: boolean
  /** Extra options forwarded to encrypt/decrypt (e.g. effectiveBits, length) */
  options?: Record<string, unknown>
}
