/**
 * RFC 4226 — HOTP: An HMAC-Based One-Time Password Algorithm.
 *
 * HOTP is the construction underneath every authenticator app. The derivation
 * is short but the interesting step is **dynamic truncation** (§5.3): rather
 * than taking a fixed slice of the HMAC, the low nibble of the *last* byte
 * chooses where to read from. That makes the extracted bits depend on the whole
 * digest, and the `& 0x7f` mask on the first byte exists purely so the result
 * is unambiguously positive on platforms with signed 32-bit integers.
 *
 * Pure module: no DOM APIs, typed CipherError on bad input.
 * @see docs/totp-hotp.md
 */

import { hmac } from '@noble/hashes/hmac.js'
import { sha256, sha512 } from '@noble/hashes/sha2.js'
import { sha1 } from '@noble/hashes/legacy.js'
import { CipherError } from '../utils/errors'
import { base32Decode } from './base32'

export type OtpAlgorithm = 'SHA1' | 'SHA256' | 'SHA512'
export type SecretEncoding = 'base32' | 'hex' | 'ascii'

/** RFC 4226 §5.3 allows 6–8 digits; longer is accepted here for exploration. */
export const MIN_DIGITS = 6
export const MAX_DIGITS = 10

export interface OtpOptions {
  /** Number of digits in the final code. Default 6. */
  digits?: number
  /** HMAC hash function. Default SHA1, which is what RFC 4226 specifies. */
  algorithm?: OtpAlgorithm
  /** How to interpret the `secret` string. Default 'base32'. */
  secretEncoding?: SecretEncoding
}

export interface OtpStep {
  index: number
  label: string
  sublabel?: string
  /** The state after this step, rendered as hex or decimal as appropriate. */
  value: string
  note: string
  /** Byte indices worth highlighting in the previous state. */
  highlight?: number[]
}

export interface HotpResult {
  /** The zero-padded one-time password. */
  code: string
  counter: number
  /** The counter as the 8-byte big-endian block that gets HMAC'd. */
  counterHex: string
  /** Full HMAC output. */
  hmacHex: string
  /** Byte offset chosen by dynamic truncation. */
  offset: number
  /** The 31-bit value extracted at that offset. */
  dynamicBinaryCode: number
  digits: number
  algorithm: OtpAlgorithm
  steps: OtpStep[]
}

export interface HotpVerifyResult {
  valid: boolean
  /** Counter value that produced a match, or null. */
  matchedCounter: number | null
  /** How far ahead of the expected counter the match was found. */
  delta: number | null
  /** Every counter that was tried, in order. */
  searched: number[]
}

const HASHES = { SHA1: sha1, SHA256: sha256, SHA512: sha512 } as const

/** HMAC block sizes, only used to explain key handling in the trace. */
const BLOCK_SIZES: Record<OtpAlgorithm, number> = { SHA1: 64, SHA256: 64, SHA512: 128 }

function toHex(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0')
  }
  return out
}

/** Decode the secret string into raw key bytes according to `secretEncoding`. */
export function decodeSecret(secret: string, encoding: SecretEncoding = 'base32'): Uint8Array {
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new CipherError('INVALID_KEY', 'A shared secret is required.')
  }

  switch (encoding) {
    case 'base32':
      return base32Decode(secret)

    case 'hex': {
      const cleaned = secret.replace(/\s/g, '')
      if (cleaned.length % 2 !== 0) {
        throw new CipherError('INVALID_KEY', 'Hex secret must have an even number of characters.')
      }
      if (!/^[0-9a-fA-F]*$/.test(cleaned)) {
        throw new CipherError('INVALID_KEY', 'Hex secret contains non-hexadecimal characters.')
      }
      const bytes = new Uint8Array(cleaned.length / 2)
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16)
      }
      return bytes
    }

    case 'ascii':
      return new TextEncoder().encode(secret)

    default:
      throw new CipherError('INVALID_KEY', `Unknown secret encoding '${encoding}'.`)
  }
}

function validateOptions(options: OtpOptions): Required<OtpOptions> {
  const digits = options.digits ?? 6
  const algorithm = options.algorithm ?? 'SHA1'
  const secretEncoding = options.secretEncoding ?? 'base32'

  if (!Number.isInteger(digits) || digits < MIN_DIGITS || digits > MAX_DIGITS) {
    throw new CipherError(
      'INVALID_INPUT',
      `Digit count must be an integer between ${MIN_DIGITS} and ${MAX_DIGITS} — got ${digits}.`
    )
  }
  if (!(algorithm in HASHES)) {
    throw new CipherError('ALGORITHM_UNSUPPORTED', `Unsupported OTP algorithm '${algorithm}'.`)
  }

  return { digits, algorithm, secretEncoding }
}

function validateCounter(counter: number): void {
  if (!Number.isInteger(counter) || counter < 0) {
    throw new CipherError(
      'INVALID_INPUT',
      `Counter must be a non-negative integer — got ${counter}.`
    )
  }
  if (!Number.isSafeInteger(counter)) {
    throw new CipherError(
      'INVALID_INPUT',
      'Counter exceeds the safe integer range and cannot be encoded exactly.'
    )
  }
}

/**
 * Encode a counter as the 8-byte big-endian block RFC 4226 §5.2 requires.
 * Written via BigInt so counters above 2^32 are exact.
 */
export function counterToBytes(counter: number): Uint8Array {
  validateCounter(counter)

  const bytes = new Uint8Array(8)
  let value = BigInt(counter)
  for (let i = 7; i >= 0; i--) {
    bytes[i] = Number(value & 0xffn)
    value >>= 8n
  }
  return bytes
}

/**
 * RFC 4226 §5.3 dynamic truncation. The low 4 bits of the final HMAC byte pick
 * a starting offset; four bytes are read from there and the top bit is masked
 * off so the value is a positive 31-bit integer on every platform.
 */
export function dynamicTruncate(mac: Uint8Array): { offset: number; value: number } {
  if (mac.length < 20) {
    throw new CipherError(
      'INVALID_INPUT',
      `Dynamic truncation needs at least 20 HMAC bytes — got ${mac.length}.`
    )
  }

  const offset = mac[mac.length - 1] & 0x0f
  const value =
    (((mac[offset] & 0x7f) << 24) |
      ((mac[offset + 1] & 0xff) << 16) |
      ((mac[offset + 2] & 0xff) << 8) |
      (mac[offset + 3] & 0xff)) >>>
    0

  return { offset, value }
}

/** Fast path — returns just the code, with no trace allocation. */
export function generateHotpFast(
  secret: string,
  counter: number,
  options: OtpOptions = {}
): string {
  const { digits, algorithm, secretEncoding } = validateOptions(options)
  validateCounter(counter)

  const key = decodeSecret(secret, secretEncoding)
  const mac = hmac(HASHES[algorithm], key, counterToBytes(counter))
  const { value } = dynamicTruncate(mac)

  return String(value % 10 ** digits).padStart(digits, '0')
}

/** Instrumented path — returns the code plus every intermediate state. */
export function generateHotpInstrumented(
  secret: string,
  counter: number,
  options: OtpOptions = {}
): HotpResult {
  const { digits, algorithm, secretEncoding } = validateOptions(options)
  validateCounter(counter)

  const steps: OtpStep[] = []
  const push = (step: Omit<OtpStep, 'index'>) => steps.push({ index: steps.length, ...step })

  const key = decodeSecret(secret, secretEncoding)
  push({
    label: 'Decode the shared secret',
    sublabel: `${secretEncoding} → ${key.length} bytes`,
    value: toHex(key),
    note:
      secretEncoding === 'base32'
        ? `The Base32 string you paste into an authenticator app decodes to these ${key.length} ` +
          `raw key bytes. RFC 4226 §4 requires at least 16 bytes and recommends 20.`
        : `The secret decodes to ${key.length} raw key bytes.`,
  })

  const counterBytes = counterToBytes(counter)
  push({
    label: 'Encode the counter as 8 big-endian bytes',
    sublabel: `C = ${counter}`,
    value: toHex(counterBytes),
    note:
      'RFC 4226 §5.2 fixes the message at exactly 8 bytes, most significant byte first. ' +
      'The counter is the only thing that changes between codes.',
  })

  const mac = hmac(HASHES[algorithm], key, counterBytes)
  push({
    label: `HMAC-${algorithm}(secret, counter)`,
    sublabel: `${mac.length}-byte digest, ${BLOCK_SIZES[algorithm]}-byte block size`,
    value: toHex(mac),
    note:
      `The secret is the HMAC key and the counter is the message. Only someone holding the ` +
      `secret can compute this, which is what makes the resulting code an authenticator.`,
  })

  const { offset, value: dynamicBinaryCode } = dynamicTruncate(mac)
  push({
    label: 'Dynamic truncation — pick the offset',
    sublabel: `low nibble of byte ${mac.length - 1} (0x${mac[mac.length - 1]
      .toString(16)
      .padStart(2, '0')}) = ${offset}`,
    value: String(offset),
    note:
      'The last byte of the digest chooses where to read. Because that byte depends on the ' +
      'whole message, the extracted bits are not a fixed slice — this is the step RFC 4226 ' +
      'calls DT, and it is the part hand-rolled implementations most often get wrong.',
    highlight: [mac.length - 1],
  })

  const window = Array.from(mac.slice(offset, offset + 4))
  push({
    label: 'Read 4 bytes and mask the sign bit',
    sublabel: `bytes ${offset}–${offset + 3}`,
    value: `0x${dynamicBinaryCode.toString(16).padStart(8, '0')} (${dynamicBinaryCode})`,
    note:
      `Raw bytes ${window.map((b) => '0x' + b.toString(16).padStart(2, '0')).join(' ')} are ` +
      `combined big-endian, then the top bit is cleared with & 0x7f. That mask exists only so ` +
      `the value is unambiguously positive on platforms with signed 32-bit integers — without ` +
      `it, two implementations could disagree about the same digest.`,
    highlight: [offset, offset + 1, offset + 2, offset + 3],
  })

  const code = String(dynamicBinaryCode % 10 ** digits).padStart(digits, '0')
  push({
    label: `Reduce modulo 10^${digits}`,
    sublabel: `${dynamicBinaryCode} mod ${10 ** digits}`,
    value: code,
    note:
      `The 31-bit value is reduced to ${digits} decimal digits and zero-padded. The modulo ` +
      `introduces a very slight bias, which is accepted because the code is short-lived and ` +
      `rate-limited rather than a long-term key.`,
  })

  return {
    code,
    counter,
    counterHex: toHex(counterBytes),
    hmacHex: toHex(mac),
    offset,
    dynamicBinaryCode,
    digits,
    algorithm,
    steps,
  }
}

/** Dispatch between the fast and instrumented paths. */
export function generateHotp(
  secret: string,
  counter: number,
  options: OtpOptions & { instrument?: boolean } = {}
): HotpResult {
  if (options.instrument === false) {
    const { digits, algorithm } = validateOptions(options)
    return {
      code: generateHotpFast(secret, counter, options),
      counter,
      counterHex: '',
      hmacHex: '',
      offset: -1,
      dynamicBinaryCode: -1,
      digits,
      algorithm,
      steps: [],
    }
  }
  return generateHotpInstrumented(secret, counter, options)
}

/**
 * RFC 4226 §7.4 resynchronization. A hardware token's counter runs ahead of the
 * server's whenever a user presses the button without submitting the code, so
 * the server searches a look-ahead window rather than testing one value.
 */
export function verifyHotp(
  secret: string,
  code: string,
  expectedCounter: number,
  window = 10,
  options: OtpOptions = {}
): HotpVerifyResult {
  if (!Number.isInteger(window) || window < 0) {
    throw new CipherError('INVALID_INPUT', `Look-ahead window must be a non-negative integer.`)
  }

  const normalised = code.replace(/\s/g, '')
  const searched: number[] = []

  for (let i = 0; i <= window; i++) {
    const counter = expectedCounter + i
    searched.push(counter)
    if (generateHotpFast(secret, counter, options) === normalised) {
      return { valid: true, matchedCounter: counter, delta: i, searched }
    }
  }

  return { valid: false, matchedCounter: null, delta: null, searched }
}
