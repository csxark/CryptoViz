export type SideChannelMode = "timing" | "cache" | "power"

export interface SideChannelInput {
  secret: string
  guess: string
  mode: SideChannelMode
  samples: number
}

export interface SideChannelSample {
  index: number
  mode: SideChannelMode
  signal: number
  normalizedSignal: number
  leakedHint: string
  note: string
}

export interface SideChannelResult {
  input: SideChannelInput
  samples: SideChannelSample[]
  averageSignal: number
  leakedPrefix: string
  inferredRisk: "low" | "medium" | "high"
  modeExplanation: string
  mitigationNotes: string[]
}

export const DEFAULT_SIDE_CHANNEL_INPUT: SideChannelInput = {
  secret: "cryptoviz",
  guess: "cryptozzz",
  mode: "timing",
  samples: 16,
}

export const SIDE_CHANNEL_MODE_LABELS: Record<SideChannelMode, string> = {
  timing: "Timing leakage",
  cache: "Cache-access leakage",
  power: "Power-style leakage",
}

export const SIDE_CHANNEL_DEMO_GUESSES = [
  "aaaaaaaa",
  "caaaaaaa",
  "craaaaaa",
  "cryaaaaa",
  "crypaaaa",
  "cryptaaa",
  "cryptoaa",
  "cryptovz",
  "cryptoviz",
]

function trimValue(value: string) {
  return value.trim()
}

export function validateSideChannelInput(input: SideChannelInput): SideChannelInput {
  const secret = trimValue(input.secret)
  const guess = trimValue(input.guess)

  if (!secret) {
    throw new Error("Secret is required for the side-channel demo.")
  }

  if (!guess) {
    throw new Error("Guess is required for the side-channel demo.")
  }

  if (secret.length > 32 || guess.length > 32) {
    throw new Error("Secret and guess must be 32 characters or fewer for this demo.")
  }

  if (!["timing", "cache", "power"].includes(input.mode)) {
    throw new Error("Unsupported side-channel mode.")
  }

  if (!Number.isInteger(input.samples) || input.samples < 1 || input.samples > 50) {
    throw new Error("Samples must be an integer between 1 and 50.")
  }

  return {
    secret,
    guess,
    mode: input.mode,
    samples: input.samples,
  }
}

export function matchedPrefixLength(secret: string, guess: string): number {
  const limit = Math.min(secret.length, guess.length)
  let count = 0

  for (let index = 0; index < limit; index += 1) {
    if (secret[index] !== guess[index]) break
    count += 1
  }

  return count
}

function hammingWeight(value: number): number {
  let count = 0
  let current = value & 0xff

  while (current > 0) {
    count += current & 1
    current >>>= 1
  }

  return count
}

function deterministicNoise(index: number, secret: string, guess: string) {
  const a = secret.charCodeAt(index % secret.length) || 0
  const b = guess.charCodeAt(index % guess.length) || 0
  return ((index * 13 + a * 5 + b * 3) % 7) - 3
}

function timingSignal(secret: string, guess: string, index: number) {
  const prefix = matchedPrefixLength(secret, guess)
  return 20 + prefix * 9 + deterministicNoise(index, secret, guess)
}

function cacheSignal(secret: string, guess: string, index: number) {
  const prefix = matchedPrefixLength(secret, guess)
  const touchedSets = new Set<number>()

  for (let i = 0; i <= prefix; i += 1) {
    const code = secret.charCodeAt(i % secret.length) || 0
    touchedSets.add((code + i * 17) % 16)
  }

  return 30 + touchedSets.size * 7 + deterministicNoise(index, secret, guess)
}

function powerSignal(secret: string, guess: string, index: number) {
  const prefix = matchedPrefixLength(secret, guess)
  const char = secret.charCodeAt(Math.min(prefix, secret.length - 1)) || 0
  return 24 + hammingWeight(char) * 5 + prefix * 2 + deterministicNoise(index, secret, guess)
}

function signalForMode(mode: SideChannelMode, secret: string, guess: string, index: number) {
  if (mode === "cache") return cacheSignal(secret, guess, index)
  if (mode === "power") return powerSignal(secret, guess, index)
  return timingSignal(secret, guess, index)
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function riskFromPrefix(prefix: number, secretLength: number): SideChannelResult["inferredRisk"] {
  if (prefix === 0) return "low"
  const ratio = prefix / secretLength
  if (ratio >= 0.7) return "high"
  if (ratio >= 0.35) return "medium"
  return "low"
}

function explanationForMode(mode: SideChannelMode) {
  if (mode === "cache") {
    return "Cache side channels infer information from which memory locations or cache sets were touched during secret-dependent work."
  }

  if (mode === "power") {
    return "Power side channels infer information from data-dependent switching activity, often approximated by bit transitions or Hamming weight."
  }

  return "Timing side channels infer information when secret-dependent work takes measurably different time."
}

function mitigationNotesForMode(mode: SideChannelMode): string[] {
  const common = [
    "Avoid secret-dependent branches and early returns.",
    "Use audited cryptographic libraries for sensitive operations.",
    "Rate-limit and monitor authentication or oracle-like endpoints.",
  ]

  if (mode === "cache") {
    return [
      "Avoid secret-dependent table lookups where possible.",
      "Prefer constant-time algorithms and memory access patterns.",
      ...common,
    ]
  }

  if (mode === "power") {
    return [
      "Use hardened implementations for devices exposed to physical measurement.",
      "Apply masking, blinding, and noise only when designed by specialists.",
      ...common,
    ]
  }

  return [
    "Use constant-time comparison for tokens, MACs, and signatures.",
    "Keep execution work independent of matching prefix length.",
    ...common,
  ]
}

export function runSideChannelPlayground(rawInput: SideChannelInput): SideChannelResult {
  const input = validateSideChannelInput(rawInput)
  const prefix = matchedPrefixLength(input.secret, input.guess)
  const samples: SideChannelSample[] = []

  for (let index = 0; index < input.samples; index += 1) {
    const signal = signalForMode(input.mode, input.secret, input.guess, index)

    samples.push({
      index,
      mode: input.mode,
      signal,
      normalizedSignal: Math.max(0, Math.min(100, Math.round((signal / 90) * 100))),
      leakedHint:
        prefix > 0
          ? `First ${prefix} character${prefix === 1 ? "" : "s"} may be inferred`
          : "No matching prefix is visible in this sample",
      note: explanationForMode(input.mode),
    })
  }

  return {
    input,
    samples,
    averageSignal: average(samples.map((sample) => sample.signal)),
    leakedPrefix: input.secret.slice(0, prefix),
    inferredRisk: riskFromPrefix(prefix, input.secret.length),
    modeExplanation: explanationForMode(input.mode),
    mitigationNotes: mitigationNotesForMode(input.mode),
  }
}

export function buildSideChannelManualChecklist(): string[] {
  return [
    "Open the Side-Channel Attack Playground page.",
    "Confirm the default timing demo renders sample signals.",
    "Switch between timing, cache, and power modes and confirm explanations update.",
    "Try guesses with longer matching prefixes and confirm inferred leakage increases.",
    "Try an exact match and confirm the leaked prefix matches the full secret.",
    "Enter an empty secret or guess and confirm a friendly validation error appears.",
    "Change sample count and confirm the sample chart/table updates.",
    "Resize to mobile width and confirm cards and tables remain usable.",
  ]
}
