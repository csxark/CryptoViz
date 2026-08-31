import { asBytes, type BinaryInput } from '@/lib/utils/encoding';

// Ascii85 (Adobe/PostScript variant) binary-to-text encoding.
//
// ponytail: minimal Ascii85 — no `<~ ~>` delimiters and no `z` all-zero-group
// shortcut. Add those if byte-exact PDF/PostScript interop is ever needed.

const ASCII85_BASE = 33; // '!' — first char of the 85-char alphabet
const ASCII85_MAX = 117; // 'u' — last char ('!' + 84)
const POW85 = [52200625, 614125, 7225, 85, 1]; // 85^4 .. 85^0

/**
 * Encode bytes as an Ascii85 string.
 *
 * Bytes are processed in 4-byte groups read as a big-endian uint32 and emitted
 * as 5 characters. A final partial group of n bytes (1-3) is zero-padded to 4
 * bytes and emitted as n+1 characters. Empty input yields an empty string.
 */
export function toBase85(input: BinaryInput): string {
  const bytes = asBytes(input);
  let out = '';

  for (let i = 0; i < bytes.length; i += 4) {
    const groupLen = Math.min(4, bytes.length - i);

    let value = 0;
    for (let j = 0; j < 4; j += 1) {
      // Missing bytes in the final partial group are treated as zero.
      value = value * 256 + (j < groupLen ? bytes[i + j] : 0);
    }

    // A partial group of `groupLen` bytes emits `groupLen + 1` chars.
    for (let k = 0; k < groupLen + 1; k += 1) {
      const digit = Math.floor(value / POW85[k]) % 85;
      out += String.fromCharCode(ASCII85_BASE + digit);
    }
  }

  return out;
}

/**
 * Decode an Ascii85 string back to bytes.
 *
 * Whitespace is ignored. Any character outside '!'..'u' throws. Characters are
 * processed in 5-char groups (big-endian uint32 -> 4 bytes); a final partial
 * group of m chars (2-4) is padded with 'u' and yields m-1 bytes. A single
 * trailing character is invalid.
 */
export function fromBase85(value: string): Uint8Array {
  const clean = value.replace(/\s+/g, '');
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i += 5) {
    const groupLen = Math.min(5, clean.length - i);
    if (groupLen === 1) {
      throw new Error('Truncated Base85 input.');
    }

    let value32 = 0;
    for (let j = 0; j < 5; j += 1) {
      // Pad a final partial group with the max digit ('u').
      const code = j < groupLen ? clean.charCodeAt(i + j) : ASCII85_MAX;
      if (j < groupLen && (code < ASCII85_BASE || code > ASCII85_MAX)) {
        throw new Error('Invalid Base85 character.');
      }
      value32 = value32 * 85 + (code - ASCII85_BASE);
    }

    // A partial group of `groupLen` chars decodes to `groupLen - 1` bytes.
    const emit = groupLen === 5 ? 4 : groupLen - 1;
    for (let k = 0; k < emit; k += 1) {
      bytes.push((value32 >>> (8 * (3 - k))) & 0xff);
    }
  }

  return Uint8Array.from(bytes);
}
