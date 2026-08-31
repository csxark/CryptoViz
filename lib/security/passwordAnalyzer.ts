/**
 * Password Strength Analyzer — Comprehensive password security evaluation.
 *
 * Analyzes passwords against:
 *  - Character pool size and Shannon entropy
 *  - Common pattern detection (dictionary words, sequences, repeats)
 *  - Keyboard layout proximity attacks
 *  - Estimated crack times under various attack models
 *  - Step-by-step educational breakdown
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type StrengthRating = "very_weak" | "weak" | "fair" | "strong" | "very_strong";

export type AttackModel = "offline_bcrypt" | "offline_md5" | "online_throttled" | "online_fast";

export interface PatternMatch {
  pattern: string;
  category: PatternCategory;
  severity: "info" | "warning" | "critical";
  description: string;
}

export type PatternCategory =
  | "repetition"
  | "sequence"
  | "dictionary"
  | "keyboard"
  | "personal"
  | "common_substitution";

export interface CrackTimeEstimate {
  attackModel: AttackModel;
  label: string;
  hashRate: string;
  timeSeconds: number;
  timeFormatted: string;
  timeHumanReadable: string;
}

export interface AnalysisStep {
  step: number;
  category: string;
  description: string;
  result: string;
  impact: "positive" | "negative" | "neutral";
}

export interface PasswordAnalysis {
  password: string;
  length: number;
  entropyBits: number;
  entropyPerChar: number;
  strengthRating: StrengthRating;
  strengthScore: number; // 0-100
  charPoolSize: number;
  charPoolsUsed: string[];
  patterns: PatternMatch[];
  crackTimes: CrackTimeEstimate[];
  steps: AnalysisStep[];
  recommendations: string[];
}

// ─── Character Pool Detection ────────────────────────────────────────────────

interface CharPool {
  name: string;
  regex: RegExp;
  size: number;
}

const CHAR_POOLS: CharPool[] = [
  { name: "lowercase", regex: /[a-z]/, size: 26 },
  { name: "uppercase", regex: /[A-Z]/, size: 26 },
  { name: "digits", regex: /[0-9]/, size: 10 },
  { name: "symbols_common", regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/, size: 32 },
  { name: "unicode", regex: /[^\x00-\x7F]/, size: 100 },
];

// ─── Common Patterns ─────────────────────────────────────────────────────────

const COMMON_PASSWORDS = new Set([
  "password", "123456", "12345678", "qwerty", "abc123", "monkey", "master",
  "dragon", "login", "princess", "football", "shadow", "sunshine", "trustno1",
  "iloveyou", "batman", "access", "hello", "charlie", "letmein", "welcome",
  "password1", "admin", "passw0rd", "p@ssword", "pass123", "123456789",
  "1234567890", "000000", "111111", "password123", "qwerty123",
]);

const KEYBOARD_PATTERNS: string[][] = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "a", "z"],
  ["w", "s", "x"],
  ["e", "d", "c"],
  ["r", "f", "v"],
];

const SEQUENTIAL_PATTERNS: string[][] = [
  ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"],
  ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  ["a", "c", "e", "g", "i", "k", "m", "o", "q", "s", "u", "w", "y"],
];

const COMMON_SUBSTITUTIONS: Record<string, string> = {
  "@": "a", "4": "a", "0": "o", "1": "i", "3": "e", "$": "s",
  "5": "s", "7": "t", "8": "b", "!": "i", "+": "t",
};

// ─── Entropy Calculation ─────────────────────────────────────────────────────

function calculateCharPoolSize(password: string): { size: number; pools: string[] } {
  let totalSize = 0;
  const pools: string[] = [];

  for (const pool of CHAR_POOLS) {
    if (pool.regex.test(password)) {
      totalSize += pool.size;
      pools.push(pool.name);
    }
  }

  // Fallback: at minimum 1
  return { size: Math.max(totalSize, 1), pools };
}

function calculateShannonEntropy(password: string): number {
  if (password.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const ch of password) freq.set(ch, (freq.get(ch) || 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / password.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function calculatePasswordEntropy(password: string): { bits: number; perChar: number } {
  const { size } = calculateCharPoolSize(password);
  if (password.length === 0 || size <= 1) return { bits: 0, perChar: 0 };
  const bits = password.length * Math.log2(size);
  return { bits, perChar: Math.log2(size) };
}

// ─── Pattern Detection ───────────────────────────────────────────────────────

function detectRepetitionPatterns(password: string): PatternMatch[] {
  const patterns: PatternMatch[] = [];
  const lower = password.toLowerCase();

  // Check for 3+ repeated characters
  const repeatMatch = lower.match(/(.)\1{2,}/g);
  if (repeatMatch) {
    for (const match of repeatMatch) {
      patterns.push({
        pattern: match,
        category: "repetition",
        severity: "warning",
        description: `"${match}" repeats ${match.length} times — easily guessed by pattern attacks`,
      });
    }
  }

  // Check for repeated substrings (e.g., "abcabc")
  for (let len = 1; len <= Math.floor(lower.length / 2); len++) {
    const chunk = lower.slice(0, len);
    let repeats = 0;
    for (let i = 0; i + len <= lower.length; i += len) {
      if (lower.slice(i, i + len) === chunk) repeats++;
      else break;
    }
    if (repeats >= 3) {
      patterns.push({
        pattern: chunk.repeat(repeats),
        category: "repetition",
        severity: "warning",
        description: `"${chunk}" is repeated ${repeats} times — reduces effective entropy`,
      });
      break;
    }
  }

  return patterns;
}

function detectSequentialPatterns(password: string): PatternMatch[] {
  const patterns: PatternMatch[] = [];
  const lower = password.toLowerCase();

  for (const seq of SEQUENTIAL_PATTERNS) {
    const seqStr = seq.join("");
    const reverseStr = seq.reverse().join("");
    for (let winLen = 3; winLen <= Math.min(8, lower.length); winLen++) {
      for (let i = 0; i <= lower.length - winLen; i++) {
        const slice = lower.slice(i, i + winLen);
        if (seqStr.includes(slice) || reverseStr.includes(slice)) {
          patterns.push({
            pattern: slice,
            category: "sequence",
            severity: "warning",
            description: `Sequential pattern "${slice}" found — trivially guessable`,
          });
        }
      }
    }
  }

  return patterns;
}

function detectDictionaryWords(password: string): PatternMatch[] {
  const patterns: PatternMatch[] = [];
  const lower = password.toLowerCase();

  if (COMMON_PASSWORDS.has(lower)) {
    patterns.push({
      pattern: lower,
      category: "dictionary",
      severity: "critical",
      description: `"${lower}" is in the top common passwords list — cracked instantly`,
    });
    return patterns; // No need to check further
  }

  // Check common password prefixes/suffixes
  const commonPrefixes = ["pass", "admin", "root", "user", "test", "login"];
  const commonSuffixes = ["123", "1234", "12345", "2024", "2025", "!"];

  for (const prefix of commonPrefixes) {
    if (lower.startsWith(prefix)) {
      patterns.push({
        pattern: prefix,
        category: "dictionary",
        severity: "warning",
        description: `Starts with common prefix "${prefix}" — easily dictionary-attacked`,
      });
      break;
    }
  }

  for (const suffix of commonSuffixes) {
    if (lower.endsWith(suffix)) {
      patterns.push({
        pattern: suffix,
        category: "dictionary",
        severity: "info",
        description: `Ends with common suffix "${suffix}" — adds minimal entropy`,
      });
      break;
    }
  }

  return patterns;
}

function detectKeyboardPatterns(password: string): PatternMatch[] {
  const patterns: PatternMatch[] = [];
  const lower = password.toLowerCase();

  for (const row of KEYBOARD_PATTERNS) {
    const rowStr = row.join("");
    for (let winLen = 3; winLen <= Math.min(6, lower.length); winLen++) {
      for (let i = 0; i <= lower.length - winLen; i++) {
        const slice = lower.slice(i, i + winLen);
        if (rowStr.includes(slice)) {
          patterns.push({
            pattern: slice,
            category: "keyboard",
            severity: "warning",
            description: `Keyboard walk "${slice}" detected — easily brute-forced`,
          });
        }
      }
    }
  }

  return patterns;
}

function detectCommonSubstitutions(password: string): PatternMatch[] {
  const patterns: PatternMatch[] = [];

  // Check if password is mostly leetspeak (e.g., "p@$$w0rd")
  let substitutionCount = 0;
  let substitutionTotal = 0;
  for (const ch of password) {
    if (COMMON_SUBSTITUTIONS[ch]) {
      substitutionCount++;
    }
    if (!/[a-zA-Z0-9]/.test(ch)) {
      substitutionTotal++;
    }
  }

  if (substitutionTotal > 0 && substitutionCount / substitutionTotal > 0.5) {
    // De-leet the password
    const deleeted = password
      .split("")
      .map((ch) => COMMON_SUBSTITUTIONS[ch] || ch)
      .join("")
      .toLowerCase();

    if (COMMON_PASSWORDS.has(deleeted)) {
      patterns.push({
        pattern: password,
        category: "common_substitution",
        severity: "critical",
        description: `"${password}" is a leetspeak variant of "${deleeted}" — cracked instantly by rule engines`,
      });
    } else {
      patterns.push({
        pattern: password,
        category: "common_substitution",
        severity: "info",
        description: "Contains common leetspeak substitutions — rule-based attacks can reverse them",
      });
    }
  }

  return patterns;
}

function detectAllPatterns(password: string): PatternMatch[] {
  const allPatterns: PatternMatch[] = [
    ...detectRepetitionPatterns(password),
    ...detectSequentialPatterns(password),
    ...detectDictionaryWords(password),
    ...detectKeyboardPatterns(password),
    ...detectCommonSubstitutions(password),
  ];
  return allPatterns;
}

// ─── Crack Time Estimation ───────────────────────────────────────────────────

const ATTACK_MODELS: { model: AttackModel; label: string; hashRate: string; ratePerSec: number }[] = [
  { model: "offline_bcrypt", label: "Offline (bcrypt, 10 rounds)", hashRate: "~30 hashes/s", ratePerSec: 30 },
  { model: "offline_md5", label: "Offline (MD5 GPU cluster)", hashRate: "~100 billion/s", ratePerSec: 100_000_000_000 },
  { model: "online_throttled", label: "Online (throttled, 5 attempts/s)", hashRate: "5 attempts/s", ratePerSec: 5 },
  { model: "online_fast", label: "Online (no throttle, 100/s)", hashRate: "100 attempts/s", ratePerSec: 100 },
];

function estimateCrackTimes(entropyBits: number): CrackTimeEstimate[] {
  return ATTACK_MODELS.map(({ model, label, hashRate, ratePerSec }) => {
    const totalCombinations = Math.pow(2, entropyBits);
    const timeSeconds = totalCombinations / (2 * ratePerSec); // average case = half keyspace
    return {
      attackModel: model,
      label,
      hashRate,
      timeSeconds,
      timeFormatted: formatTime(timeSeconds),
      timeHumanReadable: formatTimeHuman(timeSeconds),
    };
  });
}

function formatTime(seconds: number): string {
  if (seconds < 0.001) return "< 1ms";
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  if (seconds < 31536000) return `${(seconds / 86400).toFixed(1)}d`;
  if (seconds < 31536000 * 1000) return `${(seconds / 31536000).toFixed(1)}y`;
  if (seconds < 31536000 * 1e6) return `${(seconds / (31536000 * 1000)).toFixed(1)}Ky`;
  if (seconds < 31536000 * 1e9) return `${(seconds / (31536000 * 1e6)).toFixed(1)}My`;
  return `${(seconds / (31536000 * 1e9)).toExponential(1)}Gy`;
}

function formatTimeHuman(seconds: number): string {
  if (seconds < 1) return "Instantly";
  if (seconds < 60) return "Seconds — trivially cracked";
  if (seconds < 3600) return "Minutes — very weak";
  if (seconds < 86400) return "Hours — weak";
  if (seconds < 86400 * 30) return "Days — below average";
  if (seconds < 31536000) return "Months — moderate";
  if (seconds < 31536000 * 100) return "Years — strong";
  if (seconds < 31536000 * 1e6) return "Centuries — very strong";
  if (seconds < 31536000 * 1e9) return "Millennia — excellent";
  return "Heat death of universe — unbreakable";
}

// ─── Strength Rating ─────────────────────────────────────────────────────────

function rateStrength(
  entropyBits: number,
  patterns: PatternMatch[],
  length: number,
): { rating: StrengthRating; score: number } {
  let score = 0;

  // Base score from entropy (0-60 points)
  score += Math.min(60, entropyBits * 0.6);

  // Length bonus (0-20 points)
  score += Math.min(20, length * 1.5);

  // Pattern penalty
  const criticalCount = patterns.filter((p) => p.severity === "critical").length;
  const warningCount = patterns.filter((p) => p.severity === "warning").length;
  score -= criticalCount * 30;
  score -= warningCount * 10;

  // Clamp
  score = Math.max(0, Math.min(100, score));

  let rating: StrengthRating;
  if (score < 20) rating = "very_weak";
  else if (score < 40) rating = "weak";
  else if (score < 60) rating = "fair";
  else if (score < 80) rating = "strong";
  else rating = "very_strong";

  return { rating, score: Math.round(score) };
}

// ─── Recommendations ─────────────────────────────────────────────────────────

function generateRecommendations(
  password: string,
  patterns: PatternMatch[],
  charPools: string[],
  entropyBits: number,
): string[] {
  const recs: string[] = [];

  if (password.length < 12) {
    recs.push(`Increase length to at least 12 characters (currently ${password.length})`);
  }
  if (password.length < 16) {
    recs.push("Consider 16+ characters for high-security applications");
  }
  if (!charPools.includes("uppercase")) {
    recs.push("Add uppercase letters (A-Z) to increase character pool size");
  }
  if (!charPools.includes("lowercase")) {
    recs.push("Add lowercase letters (a-z) to increase character pool size");
  }
  if (!charPools.includes("digits")) {
    recs.push("Add digits (0-9) to expand the character pool");
  }
  if (!charPools.includes("symbols_common")) {
    recs.push("Add special characters (!@#$%^&*) to maximize entropy");
  }

  const criticalPatterns = patterns.filter((p) => p.severity === "critical");
  if (criticalPatterns.length > 0) {
    recs.push("Your password matches a known common password — replace it immediately");
  }

  if (patterns.some((p) => p.category === "keyboard")) {
    recs.push("Avoid keyboard walks (e.g., qwerty, asdf) — they are in standard wordlists");
  }

  if (patterns.some((p) => p.category === "sequence")) {
    recs.push("Avoid sequential characters (abc, 123) — they add zero entropy");
  }

  if (entropyBits < 40) {
    recs.push("Use a password manager to generate a truly random password");
  }

  if (recs.length === 0) {
    recs.push("Excellent password! Consider using a password manager to store it safely");
  }

  return recs;
}

// ─── Analysis Steps (Educational Breakdown) ──────────────────────────────────

function buildSteps(
  password: string,
  poolSize: number,
  pools: string[],
  entropy: { bits: number; perChar: number },
  patterns: PatternMatch[],
  rating: { rating: StrengthRating; score: number },
): AnalysisStep[] {
  const steps: AnalysisStep[] = [];
  let s = 1;

  steps.push({
    step: s++,
    category: "Length",
    description: `Password has ${password.length} character(s)`,
    result: password.length >= 12 ? "Good length" : `Too short (aim for 12+)`,
    impact: password.length >= 12 ? "positive" : "negative",
  });

  steps.push({
    step: s++,
    category: "Character Pool",
    description: `${pools.join(", ")} — total pool size = ${poolSize}`,
    result: `${poolSize} possible characters per position`,
    impact: poolSize >= 70 ? "positive" : poolSize >= 40 ? "neutral" : "negative",
  });

  steps.push({
    step: s++,
    category: "Entropy",
    description: `${entropy.bits.toFixed(1)} total bits of entropy (${entropy.perChar.toFixed(1)} bits/char)`,
    result: entropy.bits >= 60 ? "Strong" : entropy.bits >= 40 ? "Moderate" : "Weak",
    impact: entropy.bits >= 60 ? "positive" : entropy.bits >= 40 ? "neutral" : "negative",
  });

  if (patterns.length > 0) {
    steps.push({
      step: s++,
      category: "Patterns",
      description: `${patterns.length} pattern(s) detected`,
      result: patterns.map((p) => `${p.category}: "${p.pattern}"`).join(", "),
      impact: patterns.some((p) => p.severity === "critical") ? "negative" : "neutral",
    });
  }

  steps.push({
    step: s++,
    category: "Final Rating",
    description: `Overall strength: ${rating.rating.replace("_", " ").toUpperCase()}`,
    result: `Score: ${rating.score}/100`,
    impact: rating.score >= 60 ? "positive" : rating.score >= 40 ? "neutral" : "negative",
  });

  return steps;
}

// ─── Main Analysis Function ──────────────────────────────────────────────────

export function analyzePassword(password: string): PasswordAnalysis {
  const { size: charPoolSize, pools: charPoolsUsed } = calculateCharPoolSize(password);
  const { bits: entropyBits, perChar: entropyPerChar } = calculatePasswordEntropy(password);
  const patterns = detectAllPatterns(password);
  const { rating, score } = rateStrength(entropyBits, patterns, password.length);
  const crackTimes = estimateCrackTimes(entropyBits);
  const recommendations = generateRecommendations(password, patterns, charPoolsUsed, entropyBits);
  const steps = buildSteps(password, charPoolSize, charPoolsUsed, { bits: entropyBits, perChar: entropyPerChar }, patterns, { rating, score });

  return {
    password,
    length: password.length,
    entropyBits,
    entropyPerChar,
    strengthRating: rating,
    strengthScore: score,
    charPoolSize,
    charPoolsUsed,
    patterns,
    crackTimes,
    steps,
    recommendations,
  };
}
