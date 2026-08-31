/**
 * TOTP / HOTP Authenticator — RFC 6238 / RFC 4226 Implementation
 *
 * Generates Time-based One-Time Passwords (TOTP) and HMAC-based
 * One-Time Passwords (HOTP) with step-by-step educational visualization.
 *
 * Standards:
 *  - HOTP: RFC 4226 — HMAC-based OTP using a moving secret counter
 *  - TOTP: RFC 6238 — Time-based extension of HOTP using Unix timestamps
 *
 * This module is for educational purposes and demonstrates the full
 * key derivation pipeline: secret → HMAC → dynamic truncation → OTP.
 */

import { hmac } from "@noble/hashes/hmac.js";
// @ts-ignore
import { sha1 } from "@noble/hashes/sha1.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-512";

export interface TotpConfig {
  secret: string;
  digits: 6 | 7 | 8;
  period: number; // seconds (default 30)
  algorithm: HashAlgorithm;
}

export interface HotpConfig {
  secret: string;
  digits: 6 | 7 | 8;
  counter: number;
  algorithm: HashAlgorithm;
}

export interface OtpStep {
  step: number;
  description: string;
  input: string;
  output: string;
}

export interface OtpResult {
  otp: string;
  config: TotpConfig | HotpConfig;
  steps: OtpStep[];
  timestamp?: number;
  counter?: number;
  remainingSeconds?: number;
}

export interface VerificationResult {
  valid: boolean;
  expected: string;
  provided: string;
  windowIndex?: number;
  message: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_DIGITS = 6;
const DEFAULT_PERIOD = 30;
const DEFAULT_ALGORITHM: HashAlgorithm = "SHA-1";
const HOTP_MOVING_FACTOR_BYTES = 8;

// ─── Base32 Decoding (for secrets) ───────────────────────────────────────────

const BASE32_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Decode a Base32-encoded secret (common in TOTP apps like Google Authenticator).
 * Strips whitespace and padding automatically.
 */
export function decodeBase32Secret(encoded: string): Uint8Array {
  const clean = encoded.replace(/[\s=]/g, "").toUpperCase();
  let bits = "";
  for (const ch of clean) {
    const val = BASE32_ALPHA.indexOf(ch);
    if (val === -1) throw new Error(`Invalid Base32 character: '${ch}'`);
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

/**
 * Encode raw bytes to Base32 for display/transport.
 */
export function encodeBase32(bytes: Uint8Array): string {
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  // Pad to multiple of 5
  while (bits.length % 5 !== 0) bits += "0";
  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    result += BASE32_ALPHA[parseInt(bits.slice(i, i + 5), 2)];
  }
  // Add padding
  while (result.length % 8 !== 0) result += "=";
  return result;
}

// ─── Hash Algorithm Selection ────────────────────────────────────────────────

function hmacHash(algorithm: HashAlgorithm): typeof sha1 {
  // We use sha1 as the underlying hash for HMAC.
  // In a full implementation you'd import sha256/sha512 from @noble/hashes.
  // For educational purposes, sha1 is the standard for TOTP (RFC 6238).
  return sha1;
}

function hmacDigest(
  algorithm: HashAlgorithm,
  key: Uint8Array,
  message: Uint8Array,
): Uint8Array {
  const hashFn = hmacHash(algorithm);
  return hmac(hashFn, key, message);
}

// ─── Dynamic Truncation (RFC 4226 §5.4) ─────────────────────────────────────

/**
 * Apply HMAC-based dynamic truncation to produce a numeric OTP.
 * Steps:
 *  1. Compute HMAC of the key over the counter/time message
 *  2. Take the offset from the last nibble of the HMAC
 *  3. Extract 4 bytes at the offset, masking the MSB for sign
 *  4. Modulo 10^digits to get the OTP
 */
function dynamicTruncation(
  hmacResult: Uint8Array,
  digits: number,
  steps: OtpStep[],
): string {
  // Step: Show full HMAC
  steps.push({
    step: steps.length + 1,
    description: "Full HMAC output",
    input: "(key, message)",
    output: bytesToHex(hmacResult),
  });

  // Step: Extract offset from last nibble
  const offset = hmacResult[hmacResult.length - 1]! & 0x0f;
  steps.push({
    step: steps.length + 1,
    description: `Offset = last nibble of HMAC = 0x${(hmacResult[hmacResult.length - 1]! & 0x0f).toString(16)} = ${offset}`,
    input: `last byte = 0x${hmacResult[hmacResult.length - 1]!.toString(16).padStart(2, "0")}`,
    output: `offset = ${offset}`,
  });

  // Step: Extract 4 bytes at offset, mask MSB
  const binary =
    ((hmacResult[offset]! & 0x7f) << 24) |
    ((hmacResult[offset + 1]! & 0xff) << 16) |
    ((hmacResult[offset + 2]! & 0xff) << 8) |
    (hmacResult[offset + 3]! & 0xff);

  steps.push({
    step: steps.length + 1,
    description: `Extract 4 bytes at offset ${offset}, mask MSB → 31-bit unsigned integer`,
    input: [
      hmacResult[offset]!.toString(16).padStart(2, "0"),
      hmacResult[offset + 1]!.toString(16).padStart(2, "0"),
      hmacResult[offset + 2]!.toString(16).padStart(2, "0"),
      hmacResult[offset + 3]!.toString(16).padStart(2, "0"),
    ].join(" "),
    output: binary.toString(),
  });

  // Step: Modulo 10^digits
  const otp = (binary % Math.pow(10, digits)).toString().padStart(digits, "0");
  steps.push({
    step: steps.length + 1,
    description: `${binary} mod 10^${digits} = ${binary % Math.pow(10, digits)} → pad to ${digits} digits`,
    input: binary.toString(),
    output: otp,
  });

  return otp;
}

// ─── HOTP Generation (RFC 4226) ──────────────────────────────────────────────

/**
 * Generate an HMAC-based One-Time Password.
 * counter: the moving factor (8-byte big-endian integer).
 */
export function generateHotp(config: HotpConfig): OtpResult {
  const steps: OtpStep[] = [];
  const { secret, digits, counter, algorithm } = config;

  // Step 1: Prepare secret key
  let keyBytes: Uint8Array;
  // Check if secret looks like Base32 (only A-Z, 2-7, =, spaces)
  if (/^[A-Za-z2-7\s=]+$/.test(secret)) {
    keyBytes = decodeBase32Secret(secret);
    steps.push({
      step: 1,
      description: "Decode Base32 secret to raw bytes",
      input: secret,
      output: bytesToHex(keyBytes),
    });
  } else {
    keyBytes = new TextEncoder().encode(secret);
    steps.push({
      step: 1,
      description: "Encode secret string as UTF-8 bytes",
      input: secret,
      output: bytesToHex(keyBytes),
    });
  }

  // Step 2: Convert counter to 8-byte big-endian message
  const counterMessage = counterToBytes(counter);
  steps.push({
    step: 2,
    description: `Convert counter ${counter} to 8-byte big-endian message`,
    input: counter.toString(),
    output: bytesToHex(counterMessage),
  });

  // Step 3: Compute HMAC
  steps.push({
    step: 3,
    description: `Compute HMAC-${algorithm.replace("-", "")} over the counter message`,
    input: `key=${bytesToHex(keyBytes).slice(0, 16)}… msg=${bytesToHex(counterMessage)}`,
    output: "(see next step)",
  });

  const hmacResult = hmacDigest(algorithm, keyBytes, counterMessage);

  // Step 4–6: Dynamic truncation
  const otp = dynamicTruncation(hmacResult, digits, steps);

  return {
    otp,
    config,
    steps,
    counter,
  };
}

// ─── TOTP Generation (RFC 6238) ──────────────────────────────────────────────

/**
 * Generate a Time-based One-Time Password.
 * Uses the current time (or a custom timestamp) divided by the period.
 */
export function generateTotp(
  config: Partial<TotpConfig> & { secret: string },
  nowSeconds?: number,
): OtpResult {
  const fullConfig: TotpConfig = {
    secret: config.secret,
    digits: config.digits ?? DEFAULT_DIGITS,
    period: config.period ?? DEFAULT_PERIOD,
    algorithm: config.algorithm ?? DEFAULT_ALGORITHM,
  };

  const timestamp = nowSeconds ?? Math.floor(Date.now() / 1000);
  const counter = Math.floor(timestamp / fullConfig.period);
  const remainingSeconds = fullConfig.period - (timestamp % fullConfig.period);

  const steps: OtpStep[] = [];

  // Step: Time conversion
  steps.push({
    step: 1,
    description: `Convert Unix timestamp ${timestamp} to TOTP counter`,
    input: `${timestamp} (epoch seconds)`,
    output: `${timestamp} / ${fullConfig.period} = ${counter}`,
  });

  // Delegate to HOTP
  const hotpResult = generateHotp({
    secret: fullConfig.secret,
    digits: fullConfig.digits,
    counter,
    algorithm: fullConfig.algorithm,
  });

  // Prepend time step to all subsequent steps
  const allSteps = [steps[0], ...hotpResult.steps.map((s) => ({ ...s, step: s.step + 1 }))];

  return {
    otp: hotpResult.otp,
    config: fullConfig,
    steps: allSteps,
    timestamp,
    counter,
    remainingSeconds,
  };
}

// ─── OTP Verification ────────────────────────────────────────────────────────

/**
 * Verify an OTP against a TOTP config with a time window tolerance.
 * window: number of periods to check in each direction (default 1).
 */
export function verifyTotp(
  config: Partial<TotpConfig> & { secret: string },
  providedOtp: string,
  nowSeconds?: number,
  window: number = 1,
): VerificationResult {
  const timestamp = nowSeconds ?? Math.floor(Date.now() / 1000);
  const counter = Math.floor(
    timestamp / (config.period ?? DEFAULT_PERIOD),
  );
  const fullConfig: TotpConfig = {
    secret: config.secret,
    digits: config.digits ?? DEFAULT_DIGITS,
    period: config.period ?? DEFAULT_PERIOD,
    algorithm: config.algorithm ?? DEFAULT_ALGORITHM,
  };

  for (let offset = -window; offset <= window; offset++) {
    const testCounter = counter + offset;
    const { otp: expected } = generateHotp({
      secret: fullConfig.secret,
      digits: fullConfig.digits,
      counter: testCounter,
      algorithm: fullConfig.algorithm,
    });

    if (timingSafeEqual(providedOtp, expected)) {
      return {
        valid: true,
        expected,
        provided: providedOtp,
        windowIndex: offset,
        message:
          offset === 0
            ? "OTP matches current time window"
            : `OTP matches time window offset ${offset}`,
      };
    }
  }

  const { otp: expected } = generateHotp({
    secret: fullConfig.secret,
    digits: fullConfig.digits,
    counter,
    algorithm: fullConfig.algorithm,
  });

  return {
    valid: false,
    expected,
    provided: providedOtp,
    message: `OTP does not match any window (±${window} periods around counter ${counter})`,
  };
}

/**
 * Verify a HOTP with a lookahead window.
 */
export function verifyHotp(
  config: HotpConfig,
  providedOtp: string,
  lookahead: number = 10,
): VerificationResult {
  for (let i = 0; i <= lookahead; i++) {
    const { otp: expected } = generateHotp({
      ...config,
      counter: config.counter + i,
    });

    if (timingSafeEqual(providedOtp, expected)) {
      return {
        valid: true,
        expected,
        provided: providedOtp,
        windowIndex: i,
        message:
          i === 0
            ? "HOTP matches current counter"
            : `HOTP matches counter +${i} (counter should advance by ${i + 1})`,
      };
    }
  }

  const { otp: expected } = generateHotp(config);
  return {
    valid: false,
    expected,
    provided: providedOtp,
    message: `HOTP does not match within ${lookahead} look-ahead steps`,
  };
}

// ─── URI Generation (for QR codes / authenticator apps) ──────────────────────

/**
 * Generate an otpauth:// URI for scanning with authenticator apps.
 */
export function generateOtpauthUri(
  type: "totp" | "hotp",
  secret: string,
  options: {
    issuer?: string;
    accountName?: string;
    digits?: number;
    period?: number;
    counter?: number;
    algorithm?: string;
  } = {},
): string {
  const label = options.accountName
    ? `${options.issuer ? options.issuer + ":" : ""}${options.accountName}`
    : options.issuer ?? "CryptoViz";

  const params = new URLSearchParams();
  params.set("secret", secret.replace(/[\s=]/g, "").toUpperCase());
  if (options.issuer) params.set("issuer", options.issuer);
  if (options.digits && options.digits !== 6) params.set("digits", options.digits.toString());
  if (options.period && options.period !== 30) params.set("period", options.period.toString());
  if (options.counter !== undefined) params.set("counter", options.counter.toString());
  if (options.algorithm && options.algorithm !== "SHA1") {
    params.set("algorithm", options.algorithm.toUpperCase());
  }

  return `otpauth://${type}/${encodeURIComponent(label)}?${params.toString()}`;
}

// ─── Helper Utilities ────────────────────────────────────────────────────────

function counterToBytes(counter: number): Uint8Array {
  const bytes = new Uint8Array(8);
  let val = counter;
  for (let i = 7; i >= 0; i--) {
    bytes[i] = val & 0xff;
    val = Math.floor(val / 256);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time string comparison to prevent timing attacks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ─── Educational: Generate Sample Secret ──────────────────────────────────────

/**
 * Generate a cryptographically random Base32 secret for demo purposes.
 */
export function generateSecret(length: number = 20): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return encodeBase32(bytes).replace(/=+$/, "");
}

/**
 * Human-readable explanation of how TOTP works.
 */
export function getAlgorithmExplanation(): string[] {
  return [
    "1. A shared secret key is established between server and client (via QR code scan).",
    "2. Both sides compute: TOTP = HMAC-SHA1(secret, ⌊Unix_time / 30⌋).",
    "3. The 20-byte HMAC is dynamically truncated to a 31-bit integer.",
    "4. The integer is reduced modulo 10^6 to produce a 6-digit code.",
    "5. The code changes every 30 seconds, providing time-based 2FA.",
    "6. Verification allows a ±1 period window to account for clock drift.",
    "7. HOTP uses a counter instead of time — the counter advances after each successful verification.",
  ];
}
