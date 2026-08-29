/**
 * Base85 Encoding Toolkit — Ascii85 and Z85 encode/decode with visualization.
 *
 * Base85 encodes 4 bytes of binary data into 5 printable ASCII characters,
 * achieving ~33% expansion (better than Base64's ~33% as well, but the
 * character set is more compact).
 *
 * Variants:
 *  - Ascii85 (Adobe / btoa): uses characters 33–117 (! through u), with
 *    <~ ~> delimiters (Adobe variant) and '~' for all-zero groups.
 *  - Z85 (ZeroMQ): uses a 85-character alphabet suitable for embedding
 *    in source code and config files.
 *  - RFC 1924: IPv6 Base85 variant (RFC 1924 section 4.3.2).
 */

// ─── Alphabet Constants ──────────────────────────────────────────────────────

/** Ascii85 alphabet: ASCII 33 (!) through 117 (u) */
const ASCII85_CHARS =
  '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu';

/** Z85 alphabet from ZeroMQ RFC 32 (suitable for source code embedding) */
const Z85_CHARS =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#";

/** RFC 1924 IPv6 Base85 alphabet */
const RFC1924_CHARS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~";

export type Base85Variant = "ascii85" | "z85" | "rfc1924";

const VARIANT_CHARS: Record<Base85Variant, string> = {
  ascii85: ASCII85_CHARS,
  z85: Z85_CHARS,
  rfc1924: RFC1924_CHARS,
};

/** Ascii85 uses '<~' prefix and '~>' suffix for delimiters */
const ASCII85_OPEN_DELIM = "<~";
const ASCII85_CLOSE_DELIM = "~>";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Base85Step {
  step: number;
  description: string;
  input: string;
  output: string;
}

export interface Base85Result {
  input: string;
  variant: Base85Variant;
  direction: "encode" | "decode";
  output: string;
  steps: Base85Step[];
  inputBytes: number;
  outputBytes: number;
  sizeRatio: number;
  success: boolean;
  error?: string;
}

export interface Base85VariantInfo {
  id: Base85Variant;
  name: string;
  description: string;
  alphabetLength: number;
  padding: boolean;
  delimiters: string;
  useCase: string;
}

// ─── Variant Metadata ────────────────────────────────────────────────────────

export const BASE85_VARIANTS: Base85VariantInfo[] = [
  {
    id: "ascii85",
    name: "Ascii85 (Adobe)",
    description:
      "Adobe PostScript variant using chars 33–117, wrapped in <~ ~> delimiters. Zero blocks encoded as 'z'.",
    alphabetLength: 85,
    padding: true,
    delimiters: "<~ ~>",
    useCase:
      "PostScript/PDF binary data, btoa(1) Linux command, BWAFP format",
  },
  {
    id: "z85",
    name: "Z85 (ZeroMQ)",
    description:
      "ZeroMQ Base85 variant with a source-code-friendly 85-character alphabet. No delimiters.",
    alphabetLength: 85,
    padding: false,
    delimiters: "none",
    useCase:
      "ZeroMQ message encoding, embedded keys in source code, config files",
  },
  {
    id: "rfc1924",
    name: "RFC 1924 IPv6 Base85",
    description:
      "Compact IPv6 address encoding from RFC 1924. Maps 128-bit integers to 20 Base85 characters.",
    alphabetLength: 85,
    padding: false,
    delimiters: "none",
    useCase: "Compact IPv6 address representation (RFC 1924)",
  },
];

// ─── Encoding ────────────────────────────────────────────────────────────────

/**
 * Encode a Uint8Array into a Base85 string using the specified variant.
 */
export function encodeBase85(
  bytes: Uint8Array,
  variant: Base85Variant = "ascii85",
): { encoded: string; steps: Base85Step[] } {
  const chars = VARIANT_CHARS[variant];
  const steps: Base85Step[] = [];

  if (bytes.length === 0) {
    steps.push({
      step: 1,
      description: "Input is empty — no encoding needed",
      input: "(empty)",
      output: "(empty)",
    });
    return {
      encoded: variant === "ascii85" ? `${ASCII85_OPEN_DELIM}${ASCII85_CLOSE_DELIM}` : "",
      steps,
    };
  }

  // Ascii85 variant: check for all-zero 4-byte blocks → 'z'
  if (variant === "ascii85") {
    const zeroBlocks = countZeroBlocks(bytes);
    if (zeroBlocks > 0) {
      steps.push({
        step: 1,
        description: `Found ${zeroBlocks} all-zero 4-byte block(s) — each encodes as 'z' (compact shorthand)`,
        input: Array.from(bytes.slice(0, Math.min(8, bytes.length)))
          .map((b) => `0x${b.toString(16).padStart(2, "0")}`)
          .join(" "),
        output: "z".repeat(zeroBlocks),
      });
    }
  }

  // Process input in 4-byte chunks
  const encodedChars: string[] = [];
  const fullGroups = Math.floor(bytes.length / 4);

  for (let group = 0; group < fullGroups; group++) {
    const offset = group * 4;
    // Big-endian: bytes[0] is the most significant
    const value =
      (bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3];

    // Handle negative values from sign extension in JavaScript
    const unsignedValue = value >>> 0;

    // Convert to base-85
    const groupChars = bigIntToBase85(unsignedValue, chars);
    encodedChars.push(...groupChars);
  }

  // Handle remaining bytes (< 4) by padding with zeros
  const remainder = bytes.length % 4;
  if (remainder > 0) {
    const padded = new Uint8Array(4);
    for (let i = 0; i < remainder; i++) {
      padded[i] = bytes[fullGroups * 4 + i];
    }
    const value =
      (padded[0] << 24) |
      (padded[1] << 16) |
      (padded[2] << 8) |
      padded[3];
    const unsignedValue = value >>> 0;
    const groupChars = bigIntToBase85(unsignedValue, chars);
    // Only take 'remainder + 1' characters (each extra byte adds one char)
    encodedChars.push(...groupChars.slice(0, remainder + 1));
  }

  steps.push({
    step: steps.length + 1,
    description:
      "Split input into 4-byte blocks, convert each to a 32-bit integer, then encode in base-85",
    input: Array.from(bytes)
      .map((b) => b.toString(2).padStart(8, "0"))
      .join(" ")
      .slice(0, 120) + (bytes.length > 15 ? " …" : ""),
    output: encodedChars.join(""),
  });

  let result: string;
  if (variant === "ascii85") {
    result = `${ASCII85_OPEN_DELIM}${encodedChars.join("")}${ASCII85_CLOSE_DELIM}`;
    steps.push({
      step: steps.length + 1,
      description: "Wrap encoded data with Ascii85 delimiters: <~ prefix and ~> suffix",
      input: encodedChars.join(""),
      output: result,
    });
  } else {
    result = encodedChars.join("");
  }

  return { encoded: result, steps };
}

// ─── Decoding ────────────────────────────────────────────────────────────────

/**
 * Decode a Base85 string back into a Uint8Array.
 */
export function decodeBase85(
  input: string,
  variant: Base85Variant = "ascii85",
): { bytes: Uint8Array; steps: Base85Step[] } {
  const chars = VARIANT_CHARS[variant];
  const steps: Base85Step[] = [];
  let data = input.trim();

  // Strip delimiters for Ascii85
  if (variant === "ascii85") {
    if (data.startsWith(ASCII85_OPEN_DELIM)) {
      data = data.slice(ASCII85_OPEN_DELIM.length);
      steps.push({
        step: 1,
        description: "Strip Ascii85 open delimiter '<~'",
        input: input.trim(),
        output: data,
      });
    }
    if (data.endsWith(ASCII85_CLOSE_DELIM)) {
      data = data.slice(0, data.length - ASCII85_CLOSE_DELIM.length);
      steps.push({
        step: steps.length + 1,
        description: "Strip Ascii85 close delimiter '~>'",
        input: data + ASCII85_CLOSE_DELIM,
        output: data,
      });
    }

    // Expand 'z' shorthand for zero blocks
    const zeroCount = (data.match(/z/g) || []).length;
    if (zeroCount > 0) {
      const expanded = data.replace(/z/g, "!!!!!!!!!");
      steps.push({
        step: steps.length + 1,
        description: `Expand ${zeroCount} 'z' character(s) to "!!!!!!!!!" (all-zero 4-byte block)`,
        input: data,
        output: expanded,
      });
      data = expanded;
    }
  }

  if (data.length === 0) {
    steps.push({
      step: 1,
      description: "Input is empty — returning empty byte array",
      input: "(empty)",
      output: "(empty)",
    });
    return { bytes: new Uint8Array(0), steps };
  }

  // Validate characters
  for (let i = 0; i < data.length; i++) {
    if (chars.indexOf(data[i]) === -1) {
      throw new Error(
        `Invalid Base85 character '${data[i]}' at position ${i}`,
      );
    }
  }

  // Process in 5-character groups
  const result: number[] = [];
  const fullGroups = Math.floor(data.length / 5);

  for (let group = 0; group < fullGroups; group++) {
    const offset = group * 5;
    let value = 0;
    for (let i = 0; i < 5; i++) {
      value = value * 85 + chars.indexOf(data[offset + i]);
    }

    // Extract 4 bytes from the 32-bit value
    result.push((value >>> 24) & 0xff);
    result.push((value >>> 16) & 0xff);
    result.push((value >>> 8) & 0xff);
    result.push(value & 0xff);
  }

  // Handle remaining characters
  const remainder = data.length % 5;
  if (remainder > 0) {
    let value = 0;
    for (let i = 0; i < remainder; i++) {
      value = value * 85 + chars.indexOf(data[fullGroups * 5 + i]);
    }
    // Pad with full 85^(5-remainder) to recover correct byte count
    for (let i = remainder; i < 5; i++) {
      value = value * 85 + 84; // 84 is the max index
    }
    const bytes = [
      (value >>> 24) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 8) & 0xff,
      value & 0xff,
    ];
    // Only take the bytes that correspond to actual data
    for (let i = 0; i < remainder; i++) {
      result.push(bytes[i]);
    }
  }

  steps.push({
    step: steps.length + 1,
    description:
      "Group characters into 5-char blocks, decode each to a 32-bit integer, extract 4 bytes",
    input: data.slice(0, 25) + (data.length > 25 ? " …" : ""),
    output: result
      .map((b) => `0x${b.toString(16).padStart(2, "0")}`)
      .join(" "),
  });

  return { bytes: new Uint8Array(result), steps };
}

// ─── Convenience: text round-trip ────────────────────────────────────────────

/**
 * Encode a UTF-8 text string to Base85.
 */
export function encodeText(
  text: string,
  variant: Base85Variant = "ascii85",
): Base85Result {
  const inputBytes = new TextEncoder().encode(text);
  const { encoded, steps } = encodeBase85(inputBytes, variant);
  return {
    input: text,
    variant,
    direction: "encode",
    output: encoded,
    steps,
    inputBytes: inputBytes.length,
    outputBytes: encoded.length,
    sizeRatio: encoded.length / (inputBytes.length || 1),
    success: true,
  };
}

/**
 * Decode a Base85 string back to UTF-8 text.
 */
export function decodeText(
  input: string,
  variant: Base85Variant = "ascii85",
): Base85Result {
  try {
    const { bytes, steps } = decodeBase85(input, variant);
    const decoded = new TextDecoder().decode(bytes);
    return {
      input,
      variant,
      direction: "decode",
      output: decoded,
      steps,
      inputBytes: input.length,
      outputBytes: decoded.length,
      sizeRatio: decoded.length / (input.length || 1),
      success: true,
    };
  } catch (err) {
    return {
      input,
      variant,
      direction: "decode",
      output: "",
      steps: [],
      inputBytes: 0,
      outputBytes: 0,
      sizeRatio: 0,
      success: false,
      error: err instanceof Error ? err.message : "Unknown decode error",
    };
  }
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Count how many leading 4-byte groups are entirely zero.
 */
function countZeroBlocks(bytes: Uint8Array): number {
  let count = 0;
  const fullGroups = Math.floor(bytes.length / 4);
  for (let g = 0; g < fullGroups; g++) {
    const offset = g * 4;
    if (
      bytes[offset] === 0 &&
      bytes[offset + 1] === 0 &&
      bytes[offset + 2] === 0 &&
      bytes[offset + 3] === 0
    ) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Convert a 32-bit unsigned integer to base-85 using the given alphabet.
 * Always produces exactly 5 characters.
 */
function bigIntToBase85(value: number, alphabet: string): string[] {
  const result: string[] = new Array(5);
  let v = value;
  for (let i = 4; i >= 0; i--) {
    result[i] = alphabet[v % 85];
    v = Math.floor(v / 85);
  }
  return result;
}
