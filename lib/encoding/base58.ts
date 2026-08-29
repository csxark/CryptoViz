/**
 * Base58 Encoding Toolkit — Encode/decode with step-by-step visualization.
 *
 * Implements the Base58 encoding scheme (RFC referenced in Bitcoin/ZIP),
 * which excludes ambiguous characters (0, O, I, l) and + / to produce
 * human-friendly, URL-safe identifiers. Commonly used for Bitcoin addresses,
 * IPFS CIDs, and cryptographic key fingerprints.
 *
 * Variants supported:
 *  - Bitcoin (default alphabet)
 *  - Ripple (替换了首尾字符)
 *  - Flickr (大小写反转)
 */

// ─── Alphabet Constants ──────────────────────────────────────────────────────

/** Standard Bitcoin Base58 alphabet — no 0/O/I/l, no +/ */
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Ripple variant: replaces first char '1' with 'r' and last 'z' with 's' */
const BASE58_RIPPLE_ALPHABET =
  "rpshnaf39wBUDNEGHJKLM4PQRST7WXYZbcdeCg65jkm8oFqi1rtuvxyz";

/** Flickr variant: case-flipped compared to Bitcoin */
const BASE58_FLICKR_ALPHABET =
  "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

export type Base58Variant = "bitcoin" | "ripple" | "flickr";

const VARIANT_MAP: Record<Base58Variant, string> = {
  bitcoin: BASE58_ALPHABET,
  ripple: BASE58_RIPPLE_ALPHABET,
  flickr: BASE58_FLICKR_ALPHABET,
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Base58Step {
  step: number;
  description: string;
  input: string;
  output: string;
}

export interface Base58Result {
  input: string;
  variant: Base58Variant;
  direction: "encode" | "decode";
  output: string;
  steps: Base58Step[];
  inputBytes: number;
  outputBytes: number;
  sizeRatio: number;
  success: boolean;
  error?: string;
}

export interface Base58VariantInfo {
  id: Base58Variant;
  name: string;
  description: string;
  alphabet: string;
  excludedChars: string;
  useCase: string;
}

// ─── Variant Metadata ────────────────────────────────────────────────────────

export const BASE58_VARIANTS: Base58VariantInfo[] = [
  {
    id: "bitcoin",
    name: "Bitcoin Base58",
    description:
      "Standard Base58 alphabet (Bitcoin, IPFS, SLIP-0021). Excludes 0/O/I/l, +, /.",
    alphabet: BASE58_ALPHABET,
    excludedChars: "0, O, I, l, +, /",
    useCase:
      "Bitcoin addresses, IPFS content hashes, hardware wallet seeds, SLIP-0021 keys",
  },
  {
    id: "ripple",
    name: "Ripple Base58",
    description:
      "Modified Base58 for Ripple/XRP with alternate first and last characters.",
    alphabet: BASE58_RIPPLE_ALPHABET,
    excludedChars: "0, O, I, l, +, /",
    useCase: "Ripple (XRP) addresses and transaction identifiers",
  },
  {
    id: "flickr",
    name: "Flickr Base58",
    description:
      "Case-flipped Base58 alphabet for Flickr short-URL identifiers.",
    alphabet: BASE58_FLICKR_ALPHABET,
    excludedChars: "0, O, I, l, +, /",
    useCase: "Flickr photo short-URLs, compact ID encoding",
  },
];

// ─── Encoding (bytes → Base58 string) ────────────────────────────────────────

/**
 * Encode a Uint8Array of bytes into a Base58 string.
 * Returns the encoded string and a step-by-step trace.
 */
export function encodeBase58(
  bytes: Uint8Array,
  variant: Base58Variant = "bitcoin",
): { encoded: string; steps: Base58Step[] } {
  const alphabet = VARIANT_MAP[variant];
  const steps: Base58Step[] = [];

  if (bytes.length === 0) {
    steps.push({
      step: 1,
      description: "Input is empty — no encoding needed",
      input: "(empty)",
      output: "(empty)",
    });
    return { encoded: "", steps };
  }

  // Step 1: Count leading zero bytes (they map to '1' in Base58)
  let leadingZeros = 0;
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    leadingZeros++;
  }
  if (leadingZeros > 0) {
    steps.push({
      step: 1,
      description: `Count ${leadingZeros} leading zero byte(s) — each maps to '1'`,
      input: Array.from(bytes.slice(0, leadingZeros + 3))
        .map((b) => `0x${b.toString(16).padStart(2, "0")}`)
        .join(" "),
      output: "1".repeat(leadingZeros),
    });
  }

  // Step 2: Convert bytes to a big integer (base-256 → base-10)
  let num = BigInt(0);
  for (let i = leadingZeros; i < bytes.length; i++) {
    num = num * 256n + BigInt(bytes[i]);
  }

  steps.push({
    step: steps.length + 1,
    description: "Treat byte array as a big-endian unsigned integer (base-256)",
    input: Array.from(bytes.slice(leadingZeros))
      .map((b) => `0x${b.toString(16).padStart(2, "0")}`)
      .join(" "),
    output: num.toString(),
  });

  // Step 3: Repeated division by 58, collecting remainder characters
  const encodedChars: string[] = [];
  while (num > 0n) {
    const remainder = Number(num % 58n);
    num = num / 58n;
    encodedChars.unshift(alphabet[remainder]);
  }

  steps.push({
    step: steps.length + 1,
    description:
      "Repeatedly divide by 58, mapping each remainder to the Base58 alphabet",
    input: "big integer → mod 58 repeatedly",
    output: encodedChars.join(""),
  });

  // Step 4: Prepend leading '1' characters for zero bytes
  const result = "1".repeat(leadingZeros) + encodedChars.join("");

  if (leadingZeros > 0) {
    steps.push({
      step: steps.length + 1,
      description: `Prepend ${leadingZeros} '1' character(s) for leading zero bytes`,
      input: encodedChars.join(""),
      output: result,
    });
  }

  return { encoded: result, steps };
}

// ─── Decoding (Base58 string → bytes) ────────────────────────────────────────

/**
 * Decode a Base58 string back into a Uint8Array of bytes.
 * Returns the decoded bytes and a step-by-step trace.
 */
export function decodeBase58(
  input: string,
  variant: Base58Variant = "bitcoin",
): { bytes: Uint8Array; steps: Base58Step[] } {
  const alphabet = VARIANT_MAP[variant];
  const steps: Base58Step[] = [];

  if (input.length === 0) {
    steps.push({
      step: 1,
      description: "Input is empty — returning empty byte array",
      input: "(empty)",
      output: "(empty)",
    });
    return { bytes: new Uint8Array(0), steps };
  }

  // Step 1: Validate characters
  for (let i = 0; i < input.length; i++) {
    if (alphabet.indexOf(input[i]) === -1) {
      throw new Error(
        `Invalid Base58 character '${input[i]}' at position ${i}`,
      );
    }
  }

  // Step 2: Count leading '1' characters → leading zero bytes
  let leadingOnes = 0;
  for (let i = 0; i < input.length && input[i] === alphabet[0]; i++) {
    leadingOnes++;
  }
  if (leadingOnes > 0) {
    steps.push({
      step: 1,
      description: `Count ${leadingOnes} leading '1' character(s) — each decodes to a 0x00 byte`,
      input: input.slice(0, leadingOnes + 3),
      output: `0x00 × ${leadingOnes}`,
    });
  }

  // Step 3: Convert Base58 string to a big integer
  let num = BigInt(0);
  for (let i = leadingOnes; i < input.length; i++) {
    const idx = alphabet.indexOf(input[i]);
    num = num * 58n + BigInt(idx);
  }

  steps.push({
    step: steps.length + 1,
    description:
      "Convert Base58 characters to a big integer: multiply accumulator by 58 and add each character index",
    input: input.slice(leadingOnes),
    output: num.toString(),
  });

  // Step 4: Convert big integer to bytes (big-endian)
  const bodyBytes: number[] = [];
  if (num > 0n) {
    const hex = num.toString(16);
    const paddedHex = hex.length % 2 === 0 ? hex : "0" + hex;
    for (let i = 0; i < paddedHex.length; i += 2) {
      bodyBytes.push(parseInt(paddedHex.slice(i, i + 2), 16));
    }
  }

  steps.push({
    step: steps.length + 1,
    description: "Convert the big integer to big-endian byte representation",
    input: `big integer = ${num.toString()}`,
    output: bodyBytes
      .map((b) => `0x${b.toString(16).padStart(2, "0")}`)
      .join(" "),
  });

  // Step 5: Prepend zero bytes
  const result = new Uint8Array(leadingOnes + bodyBytes.length);
  for (let i = leadingOnes; i < result.length; i++) {
    result[i] = bodyBytes[i - leadingOnes];
  }

  steps.push({
    step: steps.length + 1,
    description: `Prepend ${leadingOnes} leading zero byte(s) to the result`,
    input: bodyBytes
      .map((b) => `0x${b.toString(16).padStart(2, "0")}`)
      .join(" "),
    output: Array.from(result)
      .map((b) => `0x${b.toString(16).padStart(2, "0")}`)
      .join(" "),
  });

  return { bytes: result, steps };
}

// ─── Convenience: text round-trip ────────────────────────────────────────────

/**
 * Encode a UTF-8 text string to Base58.
 */
export function encodeText(
  text: string,
  variant: Base58Variant = "bitcoin",
): Base58Result {
  const inputBytes = new TextEncoder().encode(text);
  const { encoded, steps } = encodeBase58(inputBytes, variant);
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
 * Decode a Base58 string back to UTF-8 text.
 */
export function decodeText(
  input: string,
  variant: Base58Variant = "bitcoin",
): Base58Result {
  try {
    const { bytes, steps } = decodeBase58(input.trim(), variant);
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
