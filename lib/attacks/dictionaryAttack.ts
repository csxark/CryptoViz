export type DictionaryHashAlgorithm = "fnv1a32" | "djb2" | "checksum16";

export interface DictionaryAttackOptions {
  targetHash: string;
  candidates: string[];
  algorithm: DictionaryHashAlgorithm;
  maxAttempts?: number;
}

export interface DictionaryAttempt {
  index: number;
  candidate: string;
  hash: string;
  matched: boolean;
}

export interface DictionaryAttackResult {
  found: boolean;
  matchedPassword: string | null;
  attempts: DictionaryAttempt[];
  totalCandidates: number;
  elapsedMs: number;
  algorithm: DictionaryHashAlgorithm;
  targetHash: string;
  estimatedRisk: "low" | "medium" | "high";
}

export const DEFAULT_DICTIONARY = [
  "password",
  "123456",
  "qwerty",
  "letmein",
  "admin",
  "welcome",
  "campus",
  "crypto",
  "student",
  "password123",
  "iloveyou",
  "dragon",
  "football",
  "monkey",
  "trustno1",
  "sunshine",
  "secret",
  "freedom",
  "hello123",
  "correcthorsebatterystaple",
];

export const HASH_ALGORITHM_LABELS: Record<DictionaryHashAlgorithm, string> = {
  fnv1a32: "FNV-1a 32-bit demo hash",
  djb2: "DJB2 demo hash",
  checksum16: "16-bit checksum demo",
};

const MAX_DICTIONARY_SIZE = 2000;

function toHex(value: number, width: number): string {
  return (value >>> 0).toString(16).padStart(width, "0");
}

export function normalizeHash(value: string): string {
  return value.trim().toLowerCase().replace(/^0x/, "");
}

export function parseDictionaryText(text: string): string[] {
  const seen = new Set<string>();

  return text
    .split(/\r?\n|,/)
    .map((candidate) => candidate.trim())
    .filter(Boolean)
    .filter((candidate) => {
      const key = candidate.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function hashCandidate(
  candidate: string,
  algorithm: DictionaryHashAlgorithm,
): string {
  if (algorithm === "fnv1a32") {
    let hash = 0x811c9dc5;

    for (const char of candidate) {
      hash ^= char.codePointAt(0) ?? 0;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }

    return toHex(hash, 8);
  }

  if (algorithm === "djb2") {
    let hash = 5381;

    for (const char of candidate) {
      hash = ((hash << 5) + hash + (char.codePointAt(0) ?? 0)) >>> 0;
    }

    return toHex(hash, 8);
  }

  let checksum = 0;
  for (const char of candidate) {
    checksum = (checksum + (char.codePointAt(0) ?? 0)) & 0xffff;
  }

  return toHex(checksum, 4);
}

export function estimateDictionaryRisk(
  found: boolean,
  attemptIndex: number,
  totalCandidates: number,
): DictionaryAttackResult["estimatedRisk"] {
  if (!found) return "low";

  const ratio =
    totalCandidates === 0 ? 1 : (attemptIndex + 1) / totalCandidates;

  if (ratio <= 0.25) return "high";
  if (ratio <= 0.75) return "medium";
  return "low";
}

export function runDictionaryAttack({
  targetHash,
  candidates,
  algorithm,
  maxAttempts = MAX_DICTIONARY_SIZE,
}: DictionaryAttackOptions): DictionaryAttackResult {
  const startedAt =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const normalizedTarget = normalizeHash(targetHash);

  if (!normalizedTarget) {
    throw new Error("Target hash is required.");
  }

  if (!/^[a-f0-9]+$/.test(normalizedTarget)) {
    throw new Error("Target hash must be hexadecimal.");
  }

  if (candidates.length > maxAttempts) {
    throw new Error(
      `Dictionary is too large. Maximum supported size is ${maxAttempts} candidates.`,
    );
  }

  const cleanedCandidates = candidates
    .map((candidate) => candidate.trim())
    .filter(Boolean);

  if (cleanedCandidates.length === 0) {
    throw new Error("Add at least one dictionary candidate.");
  }

  const attempts: DictionaryAttempt[] = [];
  let matchedPassword: string | null = null;
  let matchedIndex = -1;

  for (const candidate of cleanedCandidates) {
    const hash = hashCandidate(candidate, algorithm);
    const matched = hash === normalizedTarget;

    const attempt: DictionaryAttempt = {
      index: attempts.length,
      candidate,
      hash,
      matched,
    };

    attempts.push(attempt);

    if (matched) {
      matchedPassword = candidate;
      matchedIndex = attempt.index;
      break;
    }
  }

  const finishedAt =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  return {
    found: matchedPassword !== null,
    matchedPassword,
    attempts,
    totalCandidates: cleanedCandidates.length,
    elapsedMs: Math.max(0, finishedAt - startedAt),
    algorithm,
    targetHash: normalizedTarget,
    estimatedRisk: estimateDictionaryRisk(
      matchedPassword !== null,
      matchedIndex,
      cleanedCandidates.length,
    ),
  };
}

export function buildDemoTarget(
  password: string,
  algorithm: DictionaryHashAlgorithm,
): string {
  if (!password.trim()) {
    throw new Error("Demo password is required.");
  }

  return hashCandidate(password.trim(), algorithm);
}
