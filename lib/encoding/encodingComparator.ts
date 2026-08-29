/**
 * Encoding Comparator — Side-by-side encoding analysis and comparison.
 *
 * Provides utilities to:
 *  1. Encode arbitrary data with multiple formats simultaneously
 *  2. Compare expansion ratios, entropy, and readability
 *  3. Benchmark encoding/decoding throughput
 *  4. Detect the most suitable encoding for a given use-case
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ComparatorEncoding =
  | "base58"
  | "base85"
  | "base64"
  | "hex"
  | "binary"
  | "ascii";

export interface EncodingEntry {
  format: ComparatorEncoding;
  encoded: string;
  inputBytes: number;
  outputBytes: number;
  expansionRatio: number;
  encodingTimeUs: number;
  decodingTimeUs: number;
  printableAscii: boolean;
  caseSensitive: boolean;
  humanReadable: boolean;
}

export interface ComparisonResult {
  originalText: string;
  originalBytes: number;
  encodings: EncodingEntry[];
  recommended: ComparatorEncoding;
  recommendationReason: string;
}

export interface EncodingBenchmarkResult {
  format: ComparatorEncoding;
  inputSizeBytes: number;
  encodeIterations: number;
  decodeIterations: number;
  avgEncodeTimeUs: number;
  avgDecodeTimeUs: number;
  throughputEncodeMBps: number;
  throughputDecodeMBps: number;
}

export interface EntropyAnalysis {
  format: ComparatorEncoding;
  shannonEntropy: number;
  charSetSize: number;
  uniqueChars: number;
  compressionPotential: "high" | "medium" | "low" | "none";
}

// ─── Core Comparison Engine ──────────────────────────────────────────────────

/**
 * Encode text with all supported formats and return a side-by-side comparison.
 */
export function compareEncodings(text: string): ComparisonResult {
  const inputBytes = new TextEncoder().encode(text);

  const formats: ComparatorEncoding[] = [
    "hex",
    "base64",
    "base58",
    "base85",
    "binary",
    "ascii",
  ];

  const entries: EncodingEntry[] = formats.map((format) => {
    const startEncode = performance.now();
    const encoded = encodeWithFormat(text, format);
    const endEncode = performance.now();

    const startDecode = performance.now();
    decodeWithFormat(encoded, format);
    const endDecode = performance.now();

    const outputBytes = new TextEncoder().encode(encoded).length;

    return {
      format,
      encoded,
      inputBytes: inputBytes.length,
      outputBytes,
      expansionRatio: outputBytes / (inputBytes.length || 1),
      encodingTimeUs: (endEncode - startEncode) * 1000,
      decodingTimeUs: (endDecode - startDecode) * 1000,
      printableAscii: isPrintableAscii(encoded),
      caseSensitive: isCaseSensitive(encoded),
      humanReadable: isHumanReadable(encoded),
    };
  });

  // Determine recommendation
  const { format: recommended, reason: recommendationReason } =
    recommendEncoding(text);

  return {
    originalText: text,
    originalBytes: inputBytes.length,
    encodings: entries,
    recommended,
    recommendationReason,
  };
}

/**
 * Perform entropy analysis on each encoding output.
 */
export function analyzeEntropy(text: string): EntropyAnalysis[] {
  const formats: ComparatorEncoding[] = [
    "hex",
    "base64",
    "base58",
    "base85",
    "binary",
    "ascii",
  ];

  return formats.map((format) => {
    const encoded = encodeWithFormat(text, format);
    return {
      format,
      shannonEntropy: calculateShannonEntropy(encoded),
      charSetSize: new Set(encoded).size,
      uniqueChars: new Set(encoded).size,
      compressionPotential: assessCompressionPotential(encoded),
    };
  });
}

/**
 * Benchmark encoding/decoding throughput for each format.
 */
export function benchmarkEncodings(
  text: string,
  iterations: number = 100,
): EncodingBenchmarkResult[] {
  const inputBytes = new TextEncoder().encode(text);
  const formats: ComparatorEncoding[] = [
    "hex",
    "base64",
    "base58",
    "base85",
    "binary",
    "ascii",
  ];

  return formats.map((format) => {
    const encoded = encodeWithFormat(text, format);
    const inputSizeMB = inputBytes.length / (1024 * 1024);

    // Benchmark encoding
    let totalEncodeTime = 0;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      encodeWithFormat(text, format);
      totalEncodeTime += performance.now() - start;
    }

    // Benchmark decoding
    let totalDecodeTime = 0;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      decodeWithFormat(encoded, format);
      totalDecodeTime += performance.now() - start;
    }

    const avgEncodeMs = totalEncodeTime / iterations;
    const avgDecodeMs = totalDecodeTime / iterations;

    return {
      format,
      inputSizeBytes: inputBytes.length,
      encodeIterations: iterations,
      decodeIterations: iterations,
      avgEncodeTimeUs: avgEncodeMs * 1000,
      avgDecodeTimeUs: avgDecodeMs * 1000,
      throughputEncodeMBps:
        inputSizeMB / (avgEncodeMs / 1000) || 0,
      throughputDecodeMBps:
        inputSizeMB / (avgDecodeMs / 1000) || 0,
    };
  });
}

/**
 * Find the best encoding for a given use-case constraint.
 */
export function findBestEncoding(
  text: string,
  constraints: {
    requirePrintableAscii?: boolean;
    requireCaseInsensitive?: boolean;
    minimizeSize?: boolean;
    maximizeSpeed?: boolean;
    requireHumanReadable?: boolean;
  },
): { format: ComparatorEncoding; reason: string } {
  const results = compareEncodings(text);

  let candidates = [...results.encodings];

  if (constraints.requirePrintableAscii) {
    candidates = candidates.filter((e) => e.printableAscii);
  }
  if (constraints.requireCaseInsensitive) {
    candidates = candidates.filter((e) => !e.caseSensitive);
  }
  if (constraints.requireHumanReadable) {
    candidates = candidates.filter((e) => e.humanReadable);
  }
  if (candidates.length === 0) {
    return {
      format: "base64",
      reason: "No encoding satisfies all constraints; Base64 is the safest fallback.",
    };
  }
  if (constraints.minimizeSize) {
    candidates.sort((a, b) => a.outputBytes - b.outputBytes);
    return {
      format: candidates[0].format,
      reason: `Smallest output at ${candidates[0].outputBytes} bytes (${candidates[0].expansionRatio.toFixed(2)}x expansion).`,
    };
  }
  if (constraints.maximizeSpeed) {
    candidates.sort((a, b) => a.encodingTimeUs - b.encodingTimeUs);
    return {
      format: candidates[0].format,
      reason: `Fastest encoding at ${candidates[0].encodingTimeUs.toFixed(1)} µs.`,
    };
  }

  return {
    format: candidates[0].format,
    reason: "Best match for given constraints.",
  };
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function encodeWithFormat(text: string, format: ComparatorEncoding): string {
  const bytes = new TextEncoder().encode(text);
  switch (format) {
    case "hex":
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    case "base64": {
      let binary = "";
      for (const b of bytes) binary += String.fromCharCode(b);
      return btoa(binary);
    }
    case "binary":
      return Array.from(bytes)
        .map((b) => b.toString(2).padStart(8, "0"))
        .join(" ");
    case "ascii":
      return Array.from(bytes).map((b) => b.toString()).join(" ");
    case "base58":
      return encodeBase58Inline(bytes);
    case "base85":
      return encodeBase85Inline(bytes);
    default:
      return text;
  }
}

function decodeWithFormat(encoded: string, format: ComparatorEncoding): string {
  switch (format) {
    case "hex": {
      const bytes: number[] = [];
      const clean = encoded.replace(/\s+/g, "");
      for (let i = 0; i < clean.length; i += 2) {
        bytes.push(parseInt(clean.slice(i, i + 2), 16));
      }
      return new TextDecoder().decode(new Uint8Array(bytes));
    }
    case "base64": {
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    }
    case "binary": {
      const groups = encoded.split(" ");
      const bytes = new Uint8Array(groups.length);
      for (let i = 0; i < groups.length; i++) bytes[i] = parseInt(groups[i], 2);
      return new TextDecoder().decode(bytes);
    }
    case "ascii": {
      const codes = encoded.split(" ").map(Number).filter((n) => !isNaN(n));
      return new TextDecoder().decode(new Uint8Array(codes));
    }
    case "base58":
      return decodeBase58Inline(encoded);
    case "base85":
      return decodeBase85Inline(encoded);
    default:
      return encoded;
  }
}

// ─── Inline Base58 encode/decode (self-contained for comparator) ─────────────

const B58_ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function encodeBase58Inline(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  let leadingZeros = 0;
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) leadingZeros++;
  let num = BigInt(0);
  for (let i = leadingZeros; i < bytes.length; i++) {
    num = num * 256n + BigInt(bytes[i]);
  }
  const chars: string[] = [];
  while (num > 0n) {
    chars.unshift(B58_ALPHA[Number(num % 58n)]);
    num /= 58n;
  }
  return "1".repeat(leadingZeros) + chars.join("");
}

function decodeBase58Inline(input: string): string {
  const clean = input.trim();
  let leadingOnes = 0;
  for (let i = 0; i < clean.length && clean[i] === "1"; i++) leadingOnes++;
  let num = BigInt(0);
  for (let i = leadingOnes; i < clean.length; i++) {
    num = num * 58n + BigInt(B58_ALPHA.indexOf(clean[i]));
  }
  const body: number[] = [];
  if (num > 0n) {
    const hex = num.toString(16);
    const padded = hex.length % 2 === 0 ? hex : "0" + hex;
    for (let i = 0; i < padded.length; i += 2) body.push(parseInt(padded.slice(i, i + 2), 16));
  }
  const result = new Uint8Array(leadingOnes + body.length);
  for (let i = leadingOnes; i < result.length; i++) result[i] = body[i - leadingOnes];
  return new TextDecoder().decode(result);
}

// ─── Inline Base85 encode/decode (Ascii85) ──────────────────────────────────

const A85_CHARS = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu';

function encodeBase85Inline(bytes: Uint8Array): string {
  if (bytes.length === 0) return "<~>";
  const out: string[] = [];
  const fullGroups = Math.floor(bytes.length / 4);
  for (let g = 0; g < fullGroups; g++) {
    const o = g * 4;
    const val = ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0;
    const block: string[] = new Array(5);
    let v = val;
    for (let i = 4; i >= 0; i--) { block[i] = A85_CHARS[v % 85]; v = Math.floor(v / 85); }
    out.push(...block);
  }
  const rem = bytes.length % 4;
  if (rem > 0) {
    const pad = new Uint8Array(4);
    for (let i = 0; i < rem; i++) pad[i] = bytes[fullGroups * 4 + i];
    const val = ((pad[0] << 24) | (pad[1] << 16) | (pad[2] << 8) | pad[3]) >>> 0;
    const block: string[] = new Array(5);
    let v = val;
    for (let i = 4; i >= 0; i--) { block[i] = A85_CHARS[v % 85]; v = Math.floor(v / 85); }
    out.push(...block.slice(0, rem + 1));
  }
  return "<~" + out.join("") + "~>";
}

function decodeBase85Inline(encoded: string): string {
  let data = encoded.trim();
  if (data.startsWith("<~")) data = data.slice(2);
  if (data.endsWith("~>")) data = data.slice(0, -2);
  const result: number[] = [];
  const fullGroups = Math.floor(data.length / 5);
  for (let g = 0; g < fullGroups; g++) {
    const o = g * 5;
    let val = 0;
    for (let i = 0; i < 5; i++) val = val * 85 + A85_CHARS.indexOf(data[o + i]);
    result.push((val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff);
  }
  const rem = data.length % 5;
  if (rem > 0) {
    let val = 0;
    for (let i = 0; i < rem; i++) val = val * 85 + A85_CHARS.indexOf(data[fullGroups * 5 + i]);
    for (let i = rem; i < 5; i++) val = val * 85 + 84;
    const b = [(val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff];
    for (let i = 0; i < rem; i++) result.push(b[i]);
  }
  return new TextDecoder().decode(new Uint8Array(result));
}

// ─── Analysis Helpers ────────────────────────────────────────────────────────

function calculateShannonEntropy(text: string): number {
  if (text.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const ch of text) freq.set(ch, (freq.get(ch) || 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / text.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function assessCompressionPotential(
  encoded: string,
): "high" | "medium" | "low" | "none" {
  const entropy = calculateShannonEntropy(encoded);
  const alphabetSize = new Set(encoded).size;
  if (alphabetSize <= 2) return "high";
  if (entropy < 3) return "medium";
  if (entropy < 5) return "low";
  return "none";
}

function isPrintableAscii(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 32 || code > 126) return false;
  }
  return true;
}

function isCaseSensitive(text: string): boolean {
  return text !== text.toLowerCase() && text !== text.toUpperCase();
}

function isHumanReadable(text: string): boolean {
  // Human-readable = mostly letters, digits, common punctuation
  const readableRatio =
    text.replace(/[^a-zA-Z0-9\s.,!?;:'"()\-]/g, "").length / (text.length || 1);
  return readableRatio > 0.8;
}

function recommendEncoding(
  text: string,
): { format: ComparatorEncoding; reason: string } {
  const bytes = new TextEncoder().encode(text);

  // Short text (< 4 bytes): hex is most readable
  if (bytes.length < 4) {
    return {
      format: "hex",
      reason: "Short input — hex encoding is most readable and compact for small payloads.",
    };
  }

  // Needs URL safety: base58
  if (text.includes("=") || text.includes("+") || text.includes("/")) {
    return {
      format: "base58",
      reason: "Input contains characters that cause URL encoding issues — Base58 is URL-safe by design.",
    };
  }

  // Text with lots of zeros or binary: base85
  const nullCount = bytes.filter((b) => b === 0).length;
  if (nullCount / bytes.length > 0.3) {
    return {
      format: "base85",
      reason: "High null-byte content — Ascii85 compresses zero blocks efficiently using 'z' shorthand.",
    };
  }

  // Default: base64 — best general-purpose tradeoff
  return {
    format: "base64",
    reason:
      "General-purpose text — Base64 offers the best balance of universality, tooling support, and reliability.",
  };
}
