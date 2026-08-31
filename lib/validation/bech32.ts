/**
 * Bech32 / Bech32m string decoding and checksum verification (BIP-173 / BIP-350).
 *
 * This is the polymod-checksum core behind Bitcoin SegWit and Lightning
 * addresses, exposed as a validation primitive: decode a bech32 string into its
 * human-readable part and 5-bit data words, or find out exactly why it's
 * invalid. Self-contained integer math — no hashing dependency.
 *
 * ponytail: decodes/verifies the bech32 envelope only — no witness-program
 * 5→8 bit regrouping or SegWit version rules. Add a validateSegwitAddress on
 * top of decodeBech32 when an address-inspector view is wanted.
 */

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

const BECH32_CONST = 1;
const BECH32M_CONST = 0x2bc830a3;

export type Bech32Spec = 'bech32' | 'bech32m';

export interface Bech32Decoded {
  hrp: string;
  words: number[];
  spec: Bech32Spec;
}

/** BIP-173 checksum polymod over an array of 5-bit values. Pure. */
export function bech32Polymod(values: number[]): number {
  let chk = 1;
  for (const value of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) chk ^= GENERATOR[i];
    }
  }
  return chk >>> 0;
}

// Expand the human-readable part into the 5-bit sequence the checksum covers:
// high bits of each char, a zero separator, then low bits of each char.
function hrpExpand(hrp: string): number[] {
  const high: number[] = [];
  const low: number[] = [];
  for (let i = 0; i < hrp.length; i++) {
    const c = hrp.charCodeAt(i);
    high.push(c >> 5);
    low.push(c & 31);
  }
  return [...high, 0, ...low];
}

/**
 * Decode and verify a bech32/bech32m string.
 *
 * Returns `{ hrp, words, spec }` — words are the 5-bit data values with the
 * 6-character checksum stripped — or `null` on any failure: mixed case, no '1'
 * separator, HRP length not 1..83, total length > 90, data part < 6 chars, a
 * character outside the charset, an out-of-range HRP character, or a checksum
 * that matches neither the bech32 nor bech32m constant.
 */
export function decodeBech32(input: string): Bech32Decoded | null {
  if (input.length < 8 || input.length > 90) return null;

  // Reject mixed case; then normalize to lowercase for decoding.
  if (input !== input.toLowerCase() && input !== input.toUpperCase()) {
    return null;
  }
  const lower = input.toLowerCase();

  const pos = lower.lastIndexOf('1');
  // HRP must be 1..83 chars and the data part at least 6 (the checksum).
  if (pos < 1 || pos + 7 > lower.length || pos > 83) return null;

  const hrp = lower.slice(0, pos);
  for (let i = 0; i < hrp.length; i++) {
    const c = hrp.charCodeAt(i);
    if (c < 33 || c > 126) return null;
  }

  const dataPart = lower.slice(pos + 1);
  const values: number[] = [];
  for (const ch of dataPart) {
    const v = CHARSET.indexOf(ch);
    if (v === -1) return null;
    values.push(v);
  }

  const checksum = bech32Polymod([...hrpExpand(hrp), ...values]);
  const spec: Bech32Spec | null =
    checksum === BECH32_CONST
      ? 'bech32'
      : checksum === BECH32M_CONST
        ? 'bech32m'
        : null;
  if (spec === null) return null;

  return { hrp, words: values.slice(0, -6), spec };
}
