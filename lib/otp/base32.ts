/**
 * RFC 4648 §6 Base32 codec.
 *
 * Authenticator secrets are Base32, not hex or Base64 — that is what the
 * "enter this code manually" string in Google Authenticator or Authy actually
 * is. The alphabet deliberately omits 0, 1, 8, and 9 so it cannot be confused
 * with O, I, B, and g when a human transcribes it by hand.
 *
 * Pure module: no DOM APIs, typed CipherError on malformed input.
 * @see docs/totp-hotp.md
 */

import { CipherError } from '../utils/errors'

/** RFC 4648 §6 alphabet: A–Z then 2–7. No 0, 1, 8, or 9. */
export const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

const BASE32_LOOKUP: Record<string, number> = (() => {
  const map: Record<string, number> = {}
  for (let i = 0; i < BASE32_ALPHABET.length; i++) {
    map[BASE32_ALPHABET[i]] = i
  }
  return map
})()

/** Valid Base32 output lengths within a final 8-character group. */
const VALID_TAIL_LENGTHS = new Set([0, 2, 4, 5, 7])

/**
 * Encode bytes as Base32. Groups of 5 bytes (40 bits) become 8 characters
 * (8 × 5 bits); a short final group is padded with `=` unless `pad` is false.
 */
export function base32Encode(bytes: Uint8Array, pad = true): string {
  let out = ''
  let buffer = 0
  let bitsInBuffer = 0

  for (let i = 0; i < bytes.length; i++) {
    buffer = (buffer << 8) | bytes[i]
    bitsInBuffer += 8

    while (bitsInBuffer >= 5) {
      bitsInBuffer -= 5
      out += BASE32_ALPHABET[(buffer >>> bitsInBuffer) & 0x1f]
    }
  }

  // Flush the trailing partial group, left-aligned into 5 bits.
  if (bitsInBuffer > 0) {
    out += BASE32_ALPHABET[(buffer << (5 - bitsInBuffer)) & 0x1f]
  }

  if (pad) {
    while (out.length % 8 !== 0) out += '='
  }

  return out
}

/**
 * Decode a Base32 string. Whitespace and lowercase are tolerated because users
 * paste secrets in whatever shape their provider printed them; anything outside
 * the alphabet is a hard error rather than a silent skip, since silently
 * dropping characters would produce a wrong secret and an unexplained wrong code.
 */
export function base32Decode(input: string): Uint8Array {
  if (typeof input !== 'string') {
    throw new CipherError('INVALID_INPUT', 'Base32 input must be a string.')
  }

  // Strip whitespace and hyphens (common in printed secrets), then padding.
  const cleaned = input.replace(/[\s-]/g, '').toUpperCase()
  const unpadded = cleaned.replace(/=+$/, '')

  if (unpadded.length === 0) {
    throw new CipherError('INPUT_REQUIRED', 'Base32 input is empty.')
  }

  if (cleaned.includes('=') && !/=*$/.test(cleaned.slice(cleaned.indexOf('=')))) {
    throw new CipherError('INVALID_INPUT', 'Base32 padding may only appear at the end.')
  }

  for (const ch of unpadded) {
    if (!(ch in BASE32_LOOKUP)) {
      throw new CipherError(
        'INVALID_INPUT',
        `'${ch}' is not a valid Base32 character. The RFC 4648 alphabet is A–Z and 2–7 ` +
          `(0, 1, 8 and 9 are excluded to avoid transcription errors).`
      )
    }
  }

  if (!VALID_TAIL_LENGTHS.has(unpadded.length % 8)) {
    throw new CipherError(
      'INVALID_INPUT',
      `Base32 length ${unpadded.length} is not decodable — a final group must hold ` +
        `2, 4, 5, 7 or 8 characters. This usually means the secret was truncated.`
    )
  }

  const out = new Uint8Array(Math.floor((unpadded.length * 5) / 8))
  let buffer = 0
  let bitsInBuffer = 0
  let index = 0

  for (const ch of unpadded) {
    buffer = (buffer << 5) | BASE32_LOOKUP[ch]
    bitsInBuffer += 5

    if (bitsInBuffer >= 8) {
      bitsInBuffer -= 8
      out[index++] = (buffer >>> bitsInBuffer) & 0xff
    }
  }

  return out
}

/** Format a Base32 secret in space-separated groups of 4, the way apps display it. */
export function formatBase32(secret: string, groupSize = 4): string {
  const cleaned = secret.replace(/[\s-]/g, '').toUpperCase()
  const groups: string[] = []
  for (let i = 0; i < cleaned.length; i += groupSize) {
    groups.push(cleaned.slice(i, i + groupSize))
  }
  return groups.join(' ')
}

/**
 * Generate a fresh random Base32 secret using the platform CSPRNG.
 * RFC 4226 §4 requires at least 128 bits and recommends 160.
 */
export function generateBase32Secret(byteLength = 20): string {
  if (byteLength < 16) {
    throw new CipherError(
      'INVALID_KEY_LENGTH',
      `Secret must be at least 16 bytes (128 bits) per RFC 4226 §4 — got ${byteLength}.`
    )
  }
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new CipherError(
      'WEBCRYPTO_UNAVAILABLE',
      'crypto.getRandomValues is unavailable, so no secret can be generated safely.'
    )
  }

  const bytes = new Uint8Array(byteLength)
  globalThis.crypto.getRandomValues(bytes)
  return base32Encode(bytes, false)
}
