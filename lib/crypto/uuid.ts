/**
 * UUID v4 Generator & Analyzer — RFC 9562 Implementation
 *
 * Generates cryptographically random UUIDs (v4) with full structural
 * breakdown, validates existing UUIDs, and provides educational
 * visualization of the UUID format, version bits, and entropy.
 *
 * Features:
 *  - RFC 9562 v4 UUID generation (cryptographically secure)
 *  - UUID validation (format, version, variant, checksum)
 *  - Structural analysis with step-by-step visualization
 *  - Entropy and uniqueness estimation
 *  - Batch generation with collision detection
 *  - Compact/normalized format conversion
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type UuidVersion = 4;
export type UuidVariant = "RFC9562" | "Microsoft" | "Reserved" | "Unknown";

export interface UuidAnalysis {
  /** The input UUID string */
  input: string;
  /** Whether the UUID is structurally valid */
  valid: boolean;
  /** Parsed components */
  components: UuidComponents;
  /** UUID version number */
  version: number | null;
  /** UUID variant */
  variant: UuidVariant;
  /** Version description */
  versionDescription: string;
  /** Step-by-step analysis visualization */
  steps: UuidStep[];
  /** Security and quality assessment */
  assessment: UuidAssessment;
}

export interface UuidComponents {
  timeLow: string;
  timeMid: string;
  timeHiAndVersion: string;
  clockSeqHiAndReserved: string;
  clockSeqLow: string;
  node: string;
}

export interface UuidStep {
  step: number;
  description: string;
  input: string;
  output: string;
}

export interface UuidAssessment {
  entropyBits: number;
  collisionProbability: string;
  isCryptographicallyRandom: boolean;
  securityNotes: string[];
  rating: "strong" | "adequate" | "weak" | "invalid";
}

export interface GeneratedUuid {
  /** The full UUID string (lowercase, hyphenated) */
  uuid: string;
  /** Parsed components */
  components: UuidComponents;
  /** The raw 16 random bytes used */
  randomBytes: Uint8Array;
  /** Hex representation of the random bytes */
  randomBytesHex: string;
  /** Generation steps for visualization */
  steps: UuidStep[];
}

export interface BatchGenerationResult {
  uuids: GeneratedUuid[];
  count: number;
  allUnique: boolean;
  generationTimeMs: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const UUID_REGEX_LOOSE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UUID_REGEX_STRICT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UUID_LENGTH = 36;
const UUID_RAW_LENGTH = 16;

const UUID_VERSION_DESCRIPTIONS: Record<number, string> = {
  1: "v1 — Time-based (MAC address + timestamp)",
  2: "v2 — DCE Security (MD5 hash of identity)",
  3: "v3 — Name-based (MD5 hash of namespace + name)",
  4: "v4 — Random (cryptographically random)",
  5: "v5 — Name-based (SHA-1 hash of namespace + name)",
  6: "v6 — Reordered Time-based (Gregorian epoch)",
  7: "v7 — Unix Epoch Time-based (millisecond precision)",
};

const UUID_VARIANT_DESCRIPTIONS: Record<UuidVariant, string> = {
  RFC9562: "RFC 9562 (IETF) — bits 10xx in byte 8",
  Microsoft: "Microsoft (reserved) — bits 110x in byte 8",
  Reserved: "Reserved for future use — bits 111x in byte 8",
  Unknown: "Unknown or invalid variant",
};

// ─── UUID Generation ─────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random UUID v4.
 * Uses crypto.getRandomValues() for true randomness.
 */
export function generateUuid(): GeneratedUuid {
  const steps: UuidStep[] = [];
  const start = performance.now();

  // Step 1: Generate 16 random bytes
  const randomBytes = new Uint8Array(UUID_RAW_LENGTH);
  crypto.getRandomValues(randomBytes);
  const randomBytesHex = bytesToHex(randomBytes);

  steps.push({
    step: 1,
    description: "Generate 16 cryptographically random bytes (128 bits)",
    input: `crypto.getRandomValues(${UUID_RAW_LENGTH})`,
    output: formatHexWithSpaces(randomBytesHex),
  });

  // Step 2: Set version bits (byte 6 high nibble = 0100 = v4)
  randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40;
  steps.push({
    step: 2,
    description: "Set version nibble in byte 6 to 0100 (v4)",
    input: `byte[6] = 0x${((randomBytes[6] >> 4) & 0x0f).toString(16)}x`,
    output: `0x${randomBytes[6].toString(16).padStart(2, "0")} → version = 4`,
  });

  // Step 3: Set variant bits (byte 8 high bits = 10xx)
  randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80;
  steps.push({
    step: 3,
    description: "Set variant bits in byte 8 to 10xx (RFC 9562)",
    input: `byte[8] = 0x${((randomBytes[8] >> 6) & 0x03).toString(2).padStart(2, "0")}xx`,
    output: `0x${randomBytes[8].toString(16).padStart(2, "0")} → variant = RFC 9562`,
  });

  // Step 4: Format as hyphenated string
  const uuid = formatUuid(randomBytes);
  steps.push({
    step: 4,
    description: "Format as 8-4-4-4-12 hyphenated hex string",
    input: randomBytesHex,
    output: uuid,
  });

  // Step 5: Parse components
  const components = parseComponents(randomBytes);
  steps.push({
    step: 5,
    description: "Parse structural components",
    input: uuid,
    output: `timeLow=${components.timeLow} timeMid=${components.timeMid} timeHi=${components.timeHiAndVersion} seq=${components.clockSeqHiAndReserved}${components.clockSeqLow} node=${components.node}`,
  });

  return {
    uuid,
    components,
    randomBytes,
    randomBytesHex,
    steps,
  };
}

/**
 * Generate a batch of UUIDs with collision detection.
 */
export function generateBatch(count: number): BatchGenerationResult {
  const start = performance.now();
  const uuids: GeneratedUuid[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < count; i++) {
    const generated = generateUuid();
    uuids.push(generated);
    seen.add(generated.uuid);
  }

  return {
    uuids,
    count,
    allUnique: seen.size === count,
    generationTimeMs: performance.now() - start,
  };
}

// ─── UUID Validation & Analysis ──────────────────────────────────────────────

/**
 * Validate and analyze a UUID string with step-by-step visualization.
 */
export function analyzeUuid(input: string): UuidAnalysis {
  const steps: UuidStep[] = [];
  const securityNotes: string[] = [];

  // Step 1: Format check
  const clean = input.trim().toLowerCase();
  steps.push({
    step: 1,
    description: "Normalize input: trim whitespace and convert to lowercase",
    input,
    output: clean,
  });

  // Step 2: Length check
  if (clean.length !== UUID_LENGTH) {
    steps.push({
      step: 2,
      description: `Length check: expected ${UUID_LENGTH} characters, got ${clean.length}`,
      input: clean,
      output: "FAIL — incorrect length",
    });
    return buildInvalidResult(input, steps, securityNotes);
  }

  steps.push({
    step: 2,
    description: `Length check: ${clean.length} characters ✓`,
    input: clean,
    output: "PASS",
  });

  // Step 3: Format pattern check
  if (!UUID_REGEX_STRICT.test(clean)) {
    steps.push({
      step: 3,
      description: "Format check: must match 8-4-4-4-12 hex pattern with hyphens",
      input: clean,
      output: "FAIL — invalid format",
    });
    return buildInvalidResult(input, steps, securityNotes);
  }

  steps.push({
    step: 3,
    description: "Format check: matches 8-4-4-4-12 hex pattern ✓",
    input: clean,
    output: "PASS",
  });

  // Step 4: Parse components
  const parts = clean.split("-");
  const components: UuidComponents = {
    timeLow: parts[0],
    timeMid: parts[1],
    timeHiAndVersion: parts[2],
    clockSeqHiAndReserved: parts[3].slice(0, 2),
    clockSeqLow: parts[3].slice(2),
    node: parts[4],
  };

  steps.push({
    step: 4,
    description: "Parse into structural components",
    input: clean,
    output: `timeLow=${components.timeLow} timeMid=${components.timeMid} timeHi=${components.timeHiAndVersion} clockSeq=${components.clockSeqHiAndReserved}${components.clockSeqLow} node=${components.node}`,
  });

  // Step 5: Version extraction
  const versionHex = components.timeHiAndVersion[0];
  const version = parseInt(versionHex, 16);
  const isValidVersion = version >= 1 && version <= 8;

  steps.push({
    step: 5,
    description: `Version extraction: high nibble of timeHi = 0x${versionHex} = ${version}`,
    input: `timeHiAndVersion = ${components.timeHiAndVersion}`,
    output: isValidVersion
      ? `Version ${version} — ${UUID_VERSION_DESCRIPTIONS[version] ?? "Unknown version"}`
      : `Invalid version: ${version}`,
  });

  if (version === 4) {
    securityNotes.push("Version 4 is the recommended general-purpose UUID variant.");
    securityNotes.push("Generated from 128 bits of cryptographically secure randomness.");
  }

  // Step 6: Variant check
  const variant = parseVariant(components.clockSeqHiAndReserved);
  steps.push({
    step: 6,
    description: `Variant check: clockSeqHi = 0x${components.clockSeqHiAndReserved} = binary ${parseInt(components.clockSeqHiAndReserved, 16).toString(2).padStart(4, "0")}`,
    input: `clockSeqHiAndReserved = ${components.clockSeqHiAndReserved}`,
    output: `Variant = ${variant} — ${UUID_VARIANT_DESCRIPTIONS[variant]}`,
  });

  // Step 7: Security assessment
  const assessment = buildAssessment(version, variant, clean);

  steps.push({
    step: 7,
    description: `Security assessment: ${assessment.rating.toUpperCase()} — ${assessment.entropyBits} bits of entropy`,
    input: `version=${version} variant=${variant}`,
    output: assessment.rating,
  });

  return {
    input,
    valid: true,
    components,
    version,
    variant,
    versionDescription: UUID_VERSION_DESCRIPTIONS[version] ?? "Unknown",
    steps,
    assessment,
  };
}

/**
 * Check if a string is a valid UUID (without full analysis).
 */
export function isValidUuid(input: string): boolean {
  return UUID_REGEX.test(input.trim());
}

/**
 * Check if a string looks like a v4 UUID.
 */
export function isV4Uuid(input: string): boolean {
  return UUID_REGEX.test(input.trim());
}

// ─── Format Conversion ───────────────────────────────────────────────────────

/**
 * Convert a UUID to various display formats.
 */
export function uuidFormats(uuid: string): {
  standard: string;
  upper: string;
  noHyphens: string;
  braces: string;
  urn: string;
  base64: string;
  short: string;
} {
  const clean = uuid.trim().toLowerCase();
  if (!UUID_REGEX_STRICT.test(clean)) {
    return {
      standard: uuid,
      upper: uuid.toUpperCase(),
      noHyphens: uuid.replace(/-/g, ""),
      braces: `{${uuid}}`,
      urn: `urn:uuid:${uuid}`,
      base64: "",
      short: uuid,
    };
  }

  const noHyphens = clean.replace(/-/g, "");
  const bytes = hexToBytes(noHyphens);
  const base64 = btoa(String.fromCharCode(...bytes));
  const short = clean.replace(/-/g, "").slice(0, 8);

  return {
    standard: clean,
    upper: clean.toUpperCase(),
    noHyphens,
    braces: `{${clean}}`,
    urn: `urn:uuid:${clean}`,
    base64,
    short,
  };
}

// ─── Collision Probability ───────────────────────────────────────────────────

/**
 * Estimate the collision probability for a given number of UUIDs
 * using the birthday problem formula.
 */
export function estimateCollisionProbability(
  count: number,
  entropyBits: number = 122,
): string {
  if (count <= 1) return "0%";
  // Birthday bound: P ≈ n² / (2 × 2^entropy)
  const probability = (count * count) / (2 * Math.pow(2, entropyBits));
  if (probability < 1e-15) return "< 1 in 10^15 (negligible)";
  if (probability < 1e-9) return `< 1 in ${(1 / probability).toExponential(1)}`;
  return `≈ ${(probability * 100).toExponential(2)}%`;
}

/**
 * Calculate the number of UUIDs you can generate before a 50% collision chance.
 */
export function birthdayBound(entropyBits: number = 122): number {
  // P ≈ n² / (2 × 2^H) = 0.5 → n = sqrt(2^H)
  return Math.floor(Math.sqrt(Math.pow(2, entropyBits)));
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function parseComponents(bytes: Uint8Array): UuidComponents {
  return {
    timeLow: bytesToHex(bytes.slice(0, 4)),
    timeMid: bytesToHex(bytes.slice(4, 6)),
    timeHiAndVersion: bytesToHex(bytes.slice(6, 8)),
    clockSeqHiAndReserved: bytesToHex(bytes.slice(8, 9)),
    clockSeqLow: bytesToHex(bytes.slice(9, 10)),
    node: bytesToHex(bytes.slice(10, 16)),
  };
}

function parseVariant(clockSeqHi: string): UuidVariant {
  const val = parseInt(clockSeqHi, 16);
  if ((val & 0x80) === 0) return "Unknown";
  if ((val & 0xc0) === 0x80) return "RFC9562";
  if ((val & 0xe0) === 0xc0) return "Microsoft";
  if ((val & 0xe0) === 0xe0) return "Reserved";
  return "Unknown";
}

function formatUuid(bytes: Uint8Array): string {
  const hex = bytesToHex(bytes);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function formatHexWithSpaces(hex: string): string {
  return hex.match(/.{2}/g)?.join(" ") ?? hex;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function buildAssessment(
  version: number,
  variant: UuidVariant,
  uuid: string,
): UuidAssessment {
  const securityNotes: string[] = [];

  // Check if UUID is all zeros or all same character
  const uniqueChars = new Set(uuid.replace(/-/g, "")).size;
  const isRepetitive = uniqueChars <= 3;

  // Version 4 = 122 bits of randomness (128 - 6 version/variant bits)
  const entropyBits = version === 4 ? 122 : 128 - 6;

  if (version === 4 && variant === "RFC9562" && !isRepetitive) {
    securityNotes.push("Cryptographically random, RFC-compliant v4 UUID.");
    securityNotes.push(`${entropyBits} bits of entropy from crypto.getRandomValues().`);
    securityNotes.push(`Birthday bound: ~${(birthdayBound(entropyBits) / 1e9).toFixed(0)} billion UUIDs for 50% collision chance.`);
    return {
      entropyBits,
      collisionProbability: estimateCollisionProbability(1e6),
      isCryptographicallyRandom: true,
      securityNotes,
      rating: "strong",
    };
  }

  if (version === 4) {
    securityNotes.push("Version 4 but variant is non-standard — possible implementation bug.");
    return {
      entropyBits,
      collisionProbability: "unknown",
      isCryptographicallyRandom: true,
      securityNotes,
      rating: "adequate",
    };
  }

  if (version >= 1 && version <= 8 && version !== 4) {
    securityNotes.push(`Version ${version} UUID — different entropy characteristics than v4.`);
    if (version === 1 || version === 6) {
      securityNotes.push("Time-based UUIDs contain predictable timestamp and MAC address components.");
    }
    return {
      entropyBits: 0,
      collisionProbability: "varies by version",
      isCryptographicallyRandom: false,
      securityNotes,
      rating: "adequate",
    };
  }

  securityNotes.push("Invalid or non-standard UUID version.");
  return {
    entropyBits: 0,
    collisionProbability: "unknown",
    isCryptographicallyRandom: false,
    securityNotes,
    rating: "invalid",
  };
}

function buildInvalidResult(
  input: string,
  steps: UuidStep[],
  securityNotes: string[],
): UuidAnalysis {
  return {
    input,
    valid: false,
    components: {
      timeLow: "",
      timeMid: "",
      timeHiAndVersion: "",
      clockSeqHiAndReserved: "",
      clockSeqLow: "",
      node: "",
    },
    version: null,
    variant: "Unknown",
    versionDescription: "Invalid UUID",
    steps,
    assessment: {
      entropyBits: 0,
      collisionProbability: "n/a",
      isCryptographicallyRandom: false,
      securityNotes: ["Not a valid UUID — cannot assess security properties."],
      rating: "invalid",
    },
  };
}

/**
 * Educational explanation of UUID structure.
 */
export function getUuidExplanation(): string[] {
  return [
    "1. A UUID (RFC 9562) is a 128-bit identifier formatted as 8-4-4-4-12 hex digits.",
    "2. The version (4 bits) in the 3rd group indicates the generation method.",
    "3. The variant (2 bits) in the 4th group identifies the UUID layout standard.",
    "4. Version 4 uses 122 bits of cryptographic randomness (128 - 6 reserved bits).",
    "5. UUID v4 collision probability: ~1 in 2^61 for 1 billion UUIDs (birthday bound).",
    "6. Use crypto.getRandomValues() for generation — never Math.random().",
    "7. UUIDs are not secrets — they are identifiers. Do not rely on them for security.",
  ];
}
