/**
 * Base Encoding Toolkit — Multi-format encoder/decoder with
 * step-by-step visualization.
 *
 * Supports:
 *  - Base64 encode/decode
 *  - Base32 encode/decode
 *  - Hexadecimal encode/decode
 *  - Binary encode/decode
 *  - URL encoding (percent-encoding)
 *  - ASCII code points
 *  - ROT13 (Caesar-13)
 *  - Decimal (byte values)
 *
 * Each conversion produces a breakdown of the transformation
 * for educational visualization.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type EncodingFormat =
  | "base64"
  | "base32"
  | "hex"
  | "binary"
  | "url"
  | "ascii"
  | "rot13"
  | "decimal"

export interface EncodingStep {
  /** Step number (1-indexed) */
  step: number
  /** Description of what this step does */
  description: string
  /** Input value for this step */
  input: string
  /** Output value for this step */
  output: string
}

export interface EncodingResult {
  /** Original input text */
  input: string
  /** The encoding format used */
  format: EncodingFormat
  /** Encoded/decoded output */
  output: string
  /** Step-by-step breakdown */
  steps: EncodingStep[]
  /** Input size in bytes */
  inputBytes: number
  /** Output size in bytes */
  outputBytes: number
  /** Size ratio (output/input) */
  sizeRatio: number
  /** Whether the conversion was successful */
  success: boolean
  /** Error message if failed */
  error?: string
}

export interface FormatInfo {
  id: EncodingFormat
  name: string
  description: string
  category: "binary" | "text" | "numeric"
  alphabet?: string
  expandFactor: string
  useCase: string
}

// ─── Format Registry ─────────────────────────────────────────────────────────

export const FORMAT_REGISTRY: FormatInfo[] = [
  {
    id: "base64",
    name: "Base64",
    description: "RFC 4648 encoding using A-Z, a-z, 0-9, +, / with = padding",
    category: "binary",
    alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    expandFactor: "4/3",
    useCase: "Embedding binary data in text (emails, URLs, JSON, JWTs)",
  },
  {
    id: "base32",
    name: "Base32",
    description: "RFC 4648 encoding using A-Z and 2-7 with = padding",
    category: "binary",
    alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=",
    expandFactor: "8/5",
    useCase: "Case-insensitive encoding (TOTP secrets, DNS)",
  },
  {
    id: "hex",
    name: "Hexadecimal",
    description: "Base-16 encoding using 0-9 and a-f",
    category: "numeric",
    alphabet: "0123456789abcdef",
    expandFactor: "2",
    useCase: "Hash outputs, cryptographic keys, memory addresses",
  },
  {
    id: "binary",
    name: "Binary",
    description: "Base-2 encoding using 0 and 1",
    category: "numeric",
    alphabet: "01",
    expandFactor: "8",
    useCase: "Low-level data representation, bitwise operations",
  },
  {
    id: "url",
    name: "URL Encoding",
    description: "Percent-encoding for safe URL transmission (RFC 3986)",
    category: "text",
    expandFactor: "1-3",
    useCase: "Query parameters, form data, special characters in URLs",
  },
  {
    id: "ascii",
    name: "ASCII Codes",
    description: "Decimal code points for each character (0-127)",
    category: "numeric",
    expandFactor: "variable",
    useCase: "Character encoding education, debugging",
  },
  {
    id: "rot13",
    name: "ROT13",
    description: "Caesar cipher with shift of 13 — self-inverse",
    category: "text",
    expandFactor: "1",
    useCase: "Simple text obfuscation, spoiler hiding",
  },
  {
    id: "decimal",
    name: "Decimal Bytes",
    description: "Space-separated decimal byte values (0-255)",
    category: "numeric",
    expandFactor: "variable",
    useCase: "Network protocols, byte-level debugging",
  },
]

// ─── Base64 ──────────────────────────────────────────────────────────────────

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

function encodeBase64(input: string): EncodingResult {
  const bytes = new TextEncoder().encode(input)
  const steps: EncodingStep[] = []

  // Step 1: Convert to binary
  const binaryGroups = Array.from(bytes)
    .map((b) => b.toString(2).padStart(8, "0"))
  steps.push({
    step: 1,
    description: "Convert each character to 8-bit binary",
    input: Array.from(bytes).map((b) => String.fromCharCode(b)).join(" "),
    output: binaryGroups.join(" "),
  })

  // Step 2: Regroup into 6-bit chunks
  const allBits = binaryGroups.join("")
  const padded = allBits + "0".repeat((6 - (allBits.length % 6)) % 6)
  const sixBitGroups: string[] = []
  for (let i = 0; i < padded.length; i += 6) {
    sixBitGroups.push(padded.slice(i, i + 6))
  }
  steps.push({
    step: 2,
    description: "Regroup into 6-bit chunks (Base64 uses 6-bit encoding)",
    input: allBits,
    output: sixBitGroups.join(" "),
  })

  // Step 3: Map to Base64 characters
  const b64Chars = sixBitGroups.map((g) => {
    const idx = parseInt(g, 2)
    return B64_CHARS[idx]
  })
  steps.push({
    step: 3,
    description: "Map each 6-bit value to a Base64 character (0=A, 1=B, ... 63=/)",
    input: sixBitGroups.join(" "),
    output: b64Chars.join(""),
  })

  // Step 4: Add padding
  const padding = (4 - (b64Chars.length % 4)) % 4
  const paddedOutput = b64Chars.join("") + "=".repeat(padding)
  if (padding > 0) {
    steps.push({
      step: 4,
      description: `Add ${padding} '=' padding character(s) to make output a multiple of 4`,
      input: b64Chars.join(""),
      output: paddedOutput,
    })
  }

  return {
    input,
    format: "base64",
    output: paddedOutput,
    steps,
    inputBytes: bytes.length,
    outputBytes: paddedOutput.length,
    sizeRatio: paddedOutput.length / (bytes.length || 1),
    success: true,
  }
}

function decodeBase64(input: string): EncodingResult {
  const steps: EncodingStep[] = []
  const clean = input.trim()

  // Step 1: Remove padding
  const padding = (clean.match(/=+$/) || [""])[0].length
  const withoutPad = clean.slice(0, clean.length - padding || undefined)
  if (padding > 0) {
    steps.push({
      step: 1,
      description: `Remove ${padding} '=' padding character(s)`,
      input: clean,
      output: withoutPad,
    })
  }

  // Step 2: Map characters to 6-bit values
  const values = withoutPad.split("").map((ch) => {
    const idx = B64_CHARS.indexOf(ch)
    return idx >= 0 ? idx : 0
  })
  const binary = values.map((v) => v.toString(2).padStart(6, "0"))
  steps.push({
    step: padding > 0 ? 2 : 1,
    description: "Convert each Base64 character back to 6-bit binary",
    input: withoutPad,
    output: binary.join(" "),
  })

  // Step 3: Regroup into 8-bit bytes
  const allBits = binary.join("")
  const bytes: number[] = []
  for (let i = 0; i + 8 <= allBits.length; i += 8) {
    bytes.push(parseInt(allBits.slice(i, i + 8), 2))
  }
  steps.push({
    step: padding > 0 ? 3 : 2,
    description: "Regroup 6-bit values into 8-bit bytes",
    input: binary.join(" "),
    output: bytes.map((b) => `0x${b.toString(16).padStart(2, "0")}`).join(" "),
  })

  // Step 4: Convert to text
  const decoded = new TextDecoder().decode(new Uint8Array(bytes))
  steps.push({
    step: padding > 0 ? 4 : 3,
    description: "Convert byte values to text using UTF-8",
    input: bytes.map((b) => `0x${b.toString(16).padStart(2, "0")}`).join(" "),
    output: decoded,
  })

  return {
    input,
    format: "base64",
    output: decoded,
    steps,
    inputBytes: clean.length,
    outputBytes: decoded.length,
    sizeRatio: decoded.length / (clean.length || 1),
    success: true,
  }
}

// ─── Base32 ──────────────────────────────────────────────────────────────────

const B32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

function encodeBase32(input: string): EncodingResult {
  const bytes = new TextEncoder().encode(input)
  const steps: EncodingStep[] = []

  // Convert to binary
  const allBits = Array.from(bytes)
    .map((b) => b.toString(2).padStart(8, "0"))
    .join("")

  // Pad to multiple of 5
  const padded = allBits + "0".repeat((5 - (allBits.length % 5)) % 5)
  const fiveBitGroups: string[] = []
  for (let i = 0; i < padded.length; i += 5) {
    fiveBitGroups.push(padded.slice(i, i + 5))
  }

  steps.push({
    step: 1,
    description: "Convert input to binary and regroup into 5-bit chunks",
    input: Array.from(bytes).map((b) => String.fromCharCode(b)).join(""),
    output: fiveBitGroups.join(" "),
  })

  const b32Chars = fiveBitGroups.map((g) => B32_CHARS[parseInt(g, 2)])
  steps.push({
    step: 2,
    description: "Map each 5-bit value to a Base32 character (A-Z, 2-7)",
    input: fiveBitGroups.join(" "),
    output: b32Chars.join(""),
  })

  const padding = (8 - (b32Chars.length % 8)) % 8
  const output = b32Chars.join("") + "=".repeat(padding)

  return {
    input,
    format: "base32",
    output,
    steps,
    inputBytes: bytes.length,
    outputBytes: output.length,
    sizeRatio: output.length / (bytes.length || 1),
    success: true,
  }
}

function decodeBase32(input: string): EncodingResult {
  const steps: EncodingStep[] = []
  const clean = input.trim().toUpperCase()
  const padding = (clean.match(/=+$/) || [""])[0].length
  const withoutPad = clean.slice(0, clean.length - padding || undefined)

  const values = withoutPad.split("").map((ch) => {
    const idx = B32_CHARS.indexOf(ch)
    return idx >= 0 ? idx : 0
  })
  const binary = values.map((v) => v.toString(2).padStart(5, "0"))
  const allBits = binary.join("")
  const bytes: number[] = []
  for (let i = 0; i + 8 <= allBits.length; i += 8) {
    bytes.push(parseInt(allBits.slice(i, i + 8), 2))
  }
  const decoded = new TextDecoder().decode(new Uint8Array(bytes))

  return {
    input,
    format: "base32",
    output: decoded,
    steps,
    inputBytes: clean.length,
    outputBytes: decoded.length,
    sizeRatio: decoded.length / (clean.length || 1),
    success: true,
  }
}

// ─── Hex ─────────────────────────────────────────────────────────────────────

function encodeHex(input: string): EncodingResult {
  const bytes = new TextEncoder().encode(input)
  const steps: EncodingStep[] = []

  const hexChars = Array.from(bytes).map((b) =>
    b.toString(16).padStart(2, "0")
  )

  steps.push({
    step: 1,
    description: "Convert each character to its byte value",
    input: Array.from(bytes).map((b) => `${b} (${String.fromCharCode(b)})`).join(", "),
    output: Array.from(bytes).map((b) => b.toString()).join(", "),
  })

  steps.push({
    step: 2,
    description: "Convert each byte to 2-digit hexadecimal",
    input: Array.from(bytes).map((b) => b.toString()).join(", "),
    output: hexChars.join(" "),
  })

  const output = hexChars.join("")

  return {
    input,
    format: "hex",
    output,
    steps,
    inputBytes: bytes.length,
    outputBytes: output.length,
    sizeRatio: output.length / (bytes.length || 1),
    success: true,
  }
}

function decodeHex(input: string): EncodingResult {
  const steps: EncodingStep[] = []
  const clean = input.replace(/\s+/g, "").replace(/^0x/i, "")

  if (clean.length % 2 !== 0) {
    return {
      input,
      format: "hex",
      output: "",
      steps: [],
      inputBytes: 0,
      outputBytes: 0,
      sizeRatio: 0,
      success: false,
      error: "Hex string must have an even number of characters",
    }
  }

  const bytes: number[] = []
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.slice(i, i + 2), 16))
  }

  steps.push({
    step: 1,
    description: "Parse pairs of hex characters into byte values",
    input: clean,
    output: bytes.map((b) => `${b} (0x${b.toString(16).padStart(2, "0")})`).join(", "),
  })

  const decoded = new TextDecoder().decode(new Uint8Array(bytes))
  steps.push({
    step: 2,
    description: "Convert byte values to text using UTF-8",
    input: bytes.map((b) => `0x${b.toString(16).padStart(2, "0")}`).join(" "),
    output: decoded,
  })

  return {
    input,
    format: "hex",
    output: decoded,
    steps,
    inputBytes: clean.length / 2,
    outputBytes: decoded.length,
    sizeRatio: decoded.length / ((clean.length / 2) || 1),
    success: true,
  }
}

// ─── Binary ──────────────────────────────────────────────────────────────────

function encodeBinary(input: string): EncodingResult {
  const bytes = new TextEncoder().encode(input)
  const steps: EncodingStep[] = []

  const binaryBytes = Array.from(bytes).map((b) =>
    b.toString(2).padStart(8, "0")
  )

  steps.push({
    step: 1,
    description: "Convert each character to its byte value",
    input: Array.from(bytes).map((b) => `${String.fromCharCode(b)} (${b})`).join(", "),
    output: Array.from(bytes).map((b) => b.toString()).join(", "),
  })

  steps.push({
    step: 2,
    description: "Convert each byte to 8-bit binary representation",
    input: Array.from(bytes).map((b) => b.toString()).join(", "),
    output: binaryBytes.join(" "),
  })

  return {
    input,
    format: "binary",
    output: binaryBytes.join(" "),
    steps,
    inputBytes: bytes.length,
    outputBytes: binaryBytes.join("").length,
    sizeRatio: binaryBytes.join("").length / (bytes.length || 1),
    success: true,
  }
}

function decodeBinary(input: string): EncodingResult {
  const steps: EncodingStep[] = []
  const clean = input.replace(/\s+/g, "")

  if (!/^[01]+$/.test(clean)) {
    return {
      input,
      format: "binary",
      output: "",
      steps: [],
      inputBytes: 0,
      outputBytes: 0,
      sizeRatio: 0,
      success: false,
      error: "Input must contain only 0s and 1s",
    }
  }

  if (clean.length % 8 !== 0) {
    return {
      input,
      format: "binary",
      output: "",
      steps: [],
      inputBytes: 0,
      outputBytes: 0,
      sizeRatio: 0,
      success: false,
      error: `Binary string length (${clean.length}) must be a multiple of 8`,
    }
  }

  const bytes: number[] = []
  for (let i = 0; i < clean.length; i += 8) {
    bytes.push(parseInt(clean.slice(i, i + 8), 2))
  }

  steps.push({
    step: 1,
    description: "Group binary digits into 8-bit bytes",
    input: clean,
    output: bytes.map((b) => `0x${b.toString(16).padStart(2, "0")} (${b})`).join(", "),
  })

  const decoded = new TextDecoder().decode(new Uint8Array(bytes))
  steps.push({
    step: 2,
    description: "Convert byte values to text using UTF-8",
    input: bytes.map((b) => `0x${b.toString(16).padStart(2, "0")}`).join(" "),
    output: decoded,
  })

  return {
    input,
    format: "binary",
    output: decoded,
    steps,
    inputBytes: clean.length / 8,
    outputBytes: decoded.length,
    sizeRatio: decoded.length / ((clean.length / 8) || 1),
    success: true,
  }
}

// ─── URL Encoding ────────────────────────────────────────────────────────────

function encodeURL(input: string): EncodingResult {
  const steps: EncodingStep[] = []
  const bytes = new TextEncoder().encode(input)

  steps.push({
    step: 1,
    description: "Convert input to UTF-8 bytes",
    input,
    output: Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(" "),
  })

  const encoded = encodeURIComponent(input)
  steps.push({
    step: 2,
    description: "Percent-encode non-unreserved characters (RFC 3986)",
    input: Array.from(bytes).map((b) => `0x${b.toString(16).padStart(2, "0")}`).join(" "),
    output: encoded,
  })

  return {
    input,
    format: "url",
    output: encoded,
    steps,
    inputBytes: bytes.length,
    outputBytes: encoded.length,
    sizeRatio: encoded.length / (bytes.length || 1),
    success: true,
  }
}

function decodeURL(input: string): EncodingResult {
  const steps: EncodingStep[] = []
  const decoded = decodeURIComponent(input.trim())

  steps.push({
    step: 1,
    description: "Decode percent-encoded sequences back to characters",
    input: input.trim(),
    output: decoded,
  })

  return {
    input,
    format: "url",
    output: decoded,
    steps,
    inputBytes: input.length,
    outputBytes: decoded.length,
    sizeRatio: decoded.length / (input.length || 1),
    success: true,
  }
}

// ─── ASCII ───────────────────────────────────────────────────────────────────

function encodeASCII(input: string): EncodingResult {
  const bytes = new TextEncoder().encode(input)
  const steps: EncodingStep[] = []

  const codes = Array.from(bytes).map((b) => ({
    char: String.fromCharCode(b),
    code: b,
  }))

  steps.push({
    step: 1,
    description: "Map each character to its ASCII/UTF-8 code point",
    input: Array.from(bytes).map((b) => String.fromCharCode(b)).join(""),
    output: codes.map((c) => `${c.char}=${c.code}`).join(", "),
  })

  const output = codes.map((c) => c.code.toString()).join(" ")

  return {
    input,
    format: "ascii",
    output,
    steps,
    inputBytes: bytes.length,
    outputBytes: output.length,
    sizeRatio: output.length / (bytes.length || 1),
    success: true,
  }
}

function decodeASCII(input: string): EncodingResult {
  const steps: EncodingStep[] = []
  const codes = input.trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n) && n >= 0 && n <= 255)

  steps.push({
    step: 1,
    description: "Parse space-separated decimal values",
    input: input.trim(),
    output: codes.map((c) => `0x${c.toString(16).padStart(2, "0")} = ${c}`).join(", "),
  })

  const decoded = new TextDecoder().decode(new Uint8Array(codes))
  steps.push({
    step: 2,
    description: "Convert byte values to text using UTF-8",
    input: codes.map((c) => `0x${c.toString(16).padStart(2, "0")}`).join(" "),
    output: decoded,
  })

  return {
    input,
    format: "ascii",
    output: decoded,
    steps,
    inputBytes: input.length,
    outputBytes: decoded.length,
    sizeRatio: decoded.length / (input.length || 1),
    success: true,
  }
}

// ─── ROT13 ───────────────────────────────────────────────────────────────────

function encodeROT13(input: string): EncodingResult {
  const steps: EncodingStep[] = []

  const transformed = input
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0)
      if (code >= 65 && code <= 90) {
        return String.fromCharCode(((code - 65 + 13) % 26) + 65)
      }
      if (code >= 97 && code <= 122) {
        return String.fromCharCode(((code - 97 + 13) % 26) + 97)
      }
      return ch
    })
    .join("")

  steps.push({
    step: 1,
    description: "Shift each letter by 13 positions in the alphabet (A→N, B→O, ...)",
    input,
    output: transformed,
  })

  steps.push({
    step: 2,
    description: "ROT13 is self-inverse: applying it twice returns the original text",
    input: transformed,
    output: input,
  })

  return {
    input,
    format: "rot13",
    output: transformed,
    steps,
    inputBytes: input.length,
    outputBytes: transformed.length,
    sizeRatio: 1,
    success: true,
  }
}

// ─── Decimal Bytes ───────────────────────────────────────────────────────────

function encodeDecimal(input: string): EncodingResult {
  const bytes = new TextEncoder().encode(input)
  const steps: EncodingStep[] = []

  steps.push({
    step: 1,
    description: "Convert each character to its byte value (0-255)",
    input: Array.from(bytes).map((b) => String.fromCharCode(b)).join(""),
    output: Array.from(bytes).map((b) => b.toString()).join(" "),
  })

  return {
    input,
    format: "decimal",
    output: Array.from(bytes).map((b) => b.toString()).join(" "),
    steps,
    inputBytes: bytes.length,
    outputBytes: Array.from(bytes).map((b) => b.toString().length).reduce((a, b) => a + b, 0),
    sizeRatio: 1,
    success: true,
  }
}

function decodeDecimal(input: string): EncodingResult {
  const steps: EncodingStep[] = []
  const codes = input.trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n) && n >= 0 && n <= 255)

  steps.push({
    step: 1,
    description: "Parse space-separated decimal byte values",
    input: input.trim(),
    output: codes.map((c) => `${c} → 0x${c.toString(16).padStart(2, "0")}`).join(", "),
  })

  const decoded = new TextDecoder().decode(new Uint8Array(codes))
  steps.push({
    step: 2,
    description: "Convert byte values to text using UTF-8",
    input: codes.join(" "),
    output: decoded,
  })

  return {
    input,
    format: "decimal",
    output: decoded,
    steps,
    inputBytes: input.length,
    outputBytes: decoded.length,
    sizeRatio: decoded.length / (input.length || 1),
    success: true,
  }
}

// ─── Main Encode/Decode Functions ────────────────────────────────────────────

const ENCODERS: Record<EncodingFormat, (input: string) => EncodingResult> = {
  base64: encodeBase64,
  base32: encodeBase32,
  hex: encodeHex,
  binary: encodeBinary,
  url: encodeURL,
  ascii: encodeASCII,
  rot13: encodeROT13,
  decimal: encodeDecimal,
}

const DECODERS: Record<EncodingFormat, (input: string) => EncodingResult> = {
  base64: decodeBase64,
  base32: (input) => { throw new Error("Not implemented") },
  hex: decodeHex,
  binary: decodeBinary,
  url: decodeURL,
  ascii: decodeASCII,
  rot13: encodeROT13, // ROT13 is self-inverse
  decimal: decodeDecimal,
}

/**
 * Encode text using the specified format.
 */
export function encode(input: string, format: EncodingFormat): EncodingResult {
  return ENCODERS[format](input)
}

/**
 * Decode text from the specified format.
 */
export function decode(input: string, format: EncodingFormat): EncodingResult {
  return DECODERS[format](input)
}

/**
 * Get all available format IDs.
 */
export function getFormatIds(): EncodingFormat[] {
  return FORMAT_REGISTRY.map((f) => f.id)
}

/**
 * Get format info by ID.
 */
export function getFormatInfo(format: EncodingFormat): FormatInfo | undefined {
  return FORMAT_REGISTRY.find((f) => f.id === format)
}
