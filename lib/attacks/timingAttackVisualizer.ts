export interface TimingAttackInput {
  secret: string;
  guess: string;
  samples: number;
}

export interface TimingAttempt {
  index: number;
  guess: string;
  matchedPrefixLength: number;
  vulnerableCost: number;
  constantTimeCost: number;
  vulnerableMatched: boolean;
  constantTimeMatched: boolean;
  note: string;
}

export interface TimingAttackResult {
  secret: string;
  guess: string;
  attempts: TimingAttempt[];
  vulnerableAverage: number;
  constantTimeAverage: number;
  leakedPrefix: string;
  risk: "low" | "medium" | "high";
  explanation: string;
}

export const DEFAULT_TIMING_ATTACK_INPUT: TimingAttackInput = {
  secret: "crypto",
  guess: "crysta",
  samples: 12,
};

export const TIMING_ATTACK_DEMO_GUESSES = [
  "aaaaaa",
  "caaaaa",
  "craaaa",
  "cryaaa",
  "crypaa",
  "crypta",
  "crypto",
];

function normalise(value: string) {
  return value.trim();
}

export function validateTimingAttackInput(
  input: TimingAttackInput,
): TimingAttackInput {
  const secret = normalise(input.secret);
  const guess = normalise(input.guess);

  if (!secret) {
    throw new Error("Secret value is required for the timing attack demo.");
  }

  if (!guess) {
    throw new Error("Guess value is required for the timing attack demo.");
  }

  if (secret.length > 32 || guess.length > 32) {
    throw new Error(
      "Secret and guess must be 32 characters or fewer for this demo.",
    );
  }

  if (
    !Number.isInteger(input.samples) ||
    input.samples < 1 ||
    input.samples > 50
  ) {
    throw new Error("Samples must be an integer between 1 and 50.");
  }

  return {
    secret,
    guess,
    samples: input.samples,
  };
}

export function matchedPrefixLength(secret: string, guess: string): number {
  const limit = Math.min(secret.length, guess.length);
  let count = 0;

  for (let index = 0; index < limit; index += 1) {
    if (secret[index] !== guess[index]) {
      break;
    }

    count += 1;
  }

  return count;
}

export function vulnerableCompareCost(secret: string, guess: string): number {
  const prefix = matchedPrefixLength(secret, guess);
  const base = 20;
  const perCharacter = 9;
  const mismatchPenalty = secret === guess ? 12 : 2;

  return base + prefix * perCharacter + mismatchPenalty;
}

export function constantTimeCompareCost(secret: string, guess: string): number {
  const maxLength = Math.max(secret.length, guess.length);
  const base = 24;
  const perCharacter = 9;

  return base + maxLength * perCharacter;
}

export function vulnerableCompare(secret: string, guess: string): boolean {
  if (secret.length !== guess.length) {
    return false;
  }

  for (let index = 0; index < secret.length; index += 1) {
    if (secret[index] !== guess[index]) {
      return false;
    }
  }

  return true;
}

export function constantTimeCompare(secret: string, guess: string): boolean {
  const maxLength = Math.max(secret.length, guess.length);
  let diff = secret.length ^ guess.length;

  for (let index = 0; index < maxLength; index += 1) {
    const secretCode = index < secret.length ? secret.charCodeAt(index) : 0;
    const guessCode = index < guess.length ? guess.charCodeAt(index) : 0;
    diff |= secretCode ^ guessCode;
  }

  return diff === 0;
}

function deterministicJitter(index: number, guess: string): number {
  const charCode = guess.charCodeAt(index % guess.length) || 0;
  return ((index * 17 + charCode * 7) % 5) - 2;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildLeakedPrefix(secret: string, guess: string) {
  return secret.slice(0, matchedPrefixLength(secret, guess));
}

function estimateRisk(
  prefixLength: number,
  secretLength: number,
): TimingAttackResult["risk"] {
  if (prefixLength === 0) return "low";

  const ratio = prefixLength / secretLength;
  if (ratio >= 0.75) return "high";
  if (ratio >= 0.35) return "medium";
  return "low";
}

export function runTimingAttackVisualization(
  rawInput: TimingAttackInput,
): TimingAttackResult {
  const input = validateTimingAttackInput(rawInput);
  const attempts: TimingAttempt[] = [];

  for (let index = 0; index < input.samples; index += 1) {
    const vulnerableBase = vulnerableCompareCost(input.secret, input.guess);
    const constantBase = constantTimeCompareCost(input.secret, input.guess);
    const jitter = deterministicJitter(index, input.guess);

    const prefix = matchedPrefixLength(input.secret, input.guess);

    attempts.push({
      index,
      guess: input.guess,
      matchedPrefixLength: prefix,
      vulnerableCost: vulnerableBase + jitter,
      constantTimeCost: constantBase + (jitter % 2),
      vulnerableMatched: vulnerableCompare(input.secret, input.guess),
      constantTimeMatched: constantTimeCompare(input.secret, input.guess),
      note:
        prefix > 0
          ? "The vulnerable comparison takes longer because more leading characters match before the first mismatch."
          : "The vulnerable comparison exits quickly because the first character already differs.",
    });
  }

  const vulnerableAverage = average(
    attempts.map((attempt) => attempt.vulnerableCost),
  );
  const constantTimeAverage = average(
    attempts.map((attempt) => attempt.constantTimeCost),
  );
  const leakedPrefix = buildLeakedPrefix(input.secret, input.guess);
  const risk = estimateRisk(leakedPrefix.length, input.secret.length);

  return {
    secret: input.secret,
    guess: input.guess,
    attempts,
    vulnerableAverage,
    constantTimeAverage,
    leakedPrefix,
    risk,
    explanation:
      "Timing attacks work when comparison code exits early and response time reveals how many characters were correct. Constant-time comparison keeps work roughly independent of the matching prefix.",
  };
}

export function buildTimingAttackManualChecklist(): string[] {
  return [
    "Open the Timing Attack Visualization page.",
    "Confirm the default secret and guess render comparison timing results.",
    "Try guesses with increasing matching prefixes and confirm vulnerable timing increases.",
    "Confirm constant-time timing remains comparatively stable.",
    "Try an exact match and confirm both comparison methods report a match.",
    "Enter an empty secret or guess and confirm a friendly validation error appears.",
    "Change sample count and confirm the attempt table updates.",
    "Resize to mobile width and confirm the cards and table remain usable.",
  ];
}
