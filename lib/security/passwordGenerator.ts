/**
 * Secure Password Generator — Cryptographically random password generation.
 *
 * Generates passwords using the Web Crypto API for true randomness.
 * Provides configurable character pools, exclusion rules, and
 * educational visualization of the generation process.
 */

import { cryptoRandomInt } from "../random/cryptoRandom";

export interface PasswordGeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeDigits: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean;
  excludeChars: string;
  requireEachCategory: boolean;
  customAlphabet?: string;
}

export interface GeneratedPassword {
  password: string;
  length: number;
  charPoolSize: number;
  entropyBits: number;
  generationSteps: GenerationStep[];
  charBreakdown: CharBreakdownItem[];
}

export interface GenerationStep {
  step: number;
  description: string;
  detail: string;
}

export interface CharBreakdownItem {
  index: number;
  char: string;
  category: string;
  hexCode: string;
}

// ─── Default Options ─────────────────────────────────────────────────────────

const DEFAULT_OPTIONS: PasswordGeneratorOptions = {
  length: 16,
  includeUppercase: true,
  includeLowercase: true,
  includeDigits: true,
  includeSymbols: true,
  excludeAmbiguous: false,
  excludeChars: "",
  requireEachCategory: true,
};

// ─── Character Sets ──────────────────────────────────────────────────────────

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?/~`";
const AMBIGUOUS = "il1Lo0O";

// ─── Core Generation ─────────────────────────────────────────────────────────

function buildAlphabet(options: PasswordGeneratorOptions): {
  alphabet: string;
  pools: string[];
  steps: GenerationStep[];
} {
  const steps: GenerationStep[] = [];
  const pools: string[] = [];
  let alphabet = "";

  if (options.customAlphabet) {
    alphabet = options.customAlphabet;
    steps.push({
      step: 1,
      description: "Using custom alphabet",
      detail: `${alphabet.length} characters defined by user`,
    });
    return { alphabet, pools: ["custom"], steps };
  }

  let stepNum = 1;

  if (options.includeLowercase) {
    let pool = LOWERCASE;
    if (options.excludeAmbiguous) pool = removeChars(pool, AMBIGUOUS);
    pool = removeChars(pool, options.excludeChars);
    alphabet += pool;
    pools.push(`lowercase (${pool.length})`);
    steps.push({
      step: stepNum++,
      description: "Added lowercase letters",
      detail: `${pool.length} characters: ${pool.slice(0, 10)}…`,
    });
  }

  if (options.includeUppercase) {
    let pool = UPPERCASE;
    if (options.excludeAmbiguous) pool = removeChars(pool, AMBIGUOUS);
    pool = removeChars(pool, options.excludeChars);
    alphabet += pool;
    pools.push(`uppercase (${pool.length})`);
    steps.push({
      step: stepNum++,
      description: "Added uppercase letters",
      detail: `${pool.length} characters: ${pool.slice(0, 10)}…`,
    });
  }

  if (options.includeDigits) {
    let pool = DIGITS;
    if (options.excludeAmbiguous) pool = removeChars(pool, AMBIGUOUS);
    pool = removeChars(pool, options.excludeChars);
    alphabet += pool;
    pools.push(`digits (${pool.length})`);
    steps.push({
      step: stepNum++,
      description: "Added digits",
      detail: `${pool.length} characters: ${pool}`,
    });
  }

  if (options.includeSymbols) {
    let pool = SYMBOLS;
    pool = removeChars(pool, options.excludeChars);
    alphabet += pool;
    pools.push(`symbols (${pool.length})`);
    steps.push({
      step: stepNum++,
      description: "Added symbols",
      detail: `${pool.length} characters: ${pool.slice(0, 15)}…`,
    });
  }

  steps.push({
    step: stepNum++,
    description: "Final character pool",
    detail: `${alphabet.length} total characters from ${pools.join(" + ")}`,
  });

  return { alphabet, pools, steps };
}

function removeChars(source: string, toRemove: string): string {
  return source
    .split("")
    .filter((ch) => !toRemove.includes(ch))
    .join("");
}

/**
 * Generate a cryptographically random password.
 * Uses Web Crypto API for secure randomness when available,
 * falls back to Math.random for Node.js test environments.
 */
export function generatePassword(
  options: Partial<PasswordGeneratorOptions> = {},
): GeneratedPassword {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { alphabet, pools, steps } = buildAlphabet(opts);

  if (alphabet.length === 0) {
    return {
      password: "",
      length: 0,
      charPoolSize: 0,
      entropyBits: 0,
      generationSteps: [
        { step: 1, description: "Error", detail: "No characters available — enable at least one character category" },
      ],
      charBreakdown: [],
    };
  }

  // Generate random indices
  const indices = secureRandomIndices(alphabet.length, opts.length);

  // Build password
  let passwordChars: string[];

  if (opts.requireEachCategory && !opts.customAlphabet) {
    passwordChars = generateWithGuarantees(alphabet, opts);
  } else {
    passwordChars = indices.map((idx) => alphabet[idx]);
  }

  const password = passwordChars.join("");

  // Analyze breakdown
  const charBreakdown = passwordChars.map((char, index) => ({
    index,
    char,
    category: categorizeChar(char),
    hexCode: `0x${char.charCodeAt(0).toString(16).padStart(2, "0")}`,
  }));

  const entropyBits = Math.floor(opts.length * Math.log2(alphabet.length));

  steps.push({
    step: steps.length + 1,
    description: "Generated password",
    detail: `${opts.length} characters, ${alphabet.length}² possible combinations, ${entropyBits} bits of entropy`,
  });

  return {
    password,
    length: opts.length,
    charPoolSize: alphabet.length,
    entropyBits,
    generationSteps: steps,
    charBreakdown,
  };
}

/**
 * Generate multiple password candidates and return all.
 */
export function generatePasswordCandidates(
  count: number,
  options: Partial<PasswordGeneratorOptions> = {},
): GeneratedPassword[] {
  return Array.from({ length: count }, () => generatePassword(options));
}

/**
 * Get the recommended default options for a given security level.
 */
export function getRecommendedOptions(
  level: "basic" | "standard" | "high" | "paranoid",
): PasswordGeneratorOptions {
  switch (level) {
    case "basic":
      return {
        length: 8,
        includeUppercase: true,
        includeLowercase: true,
        includeDigits: true,
        includeSymbols: false,
        excludeAmbiguous: false,
        excludeChars: "",
        requireEachCategory: true,
      };
    case "standard":
      return {
        length: 16,
        includeUppercase: true,
        includeLowercase: true,
        includeDigits: true,
        includeSymbols: true,
        excludeAmbiguous: false,
        excludeChars: "",
        requireEachCategory: true,
      };
    case "high":
      return {
        length: 24,
        includeUppercase: true,
        includeLowercase: true,
        includeDigits: true,
        includeSymbols: true,
        excludeAmbiguous: true,
        excludeChars: "",
        requireEachCategory: true,
      };
    case "paranoid":
      return {
        length: 32,
        includeUppercase: true,
        includeLowercase: true,
        includeDigits: true,
        includeSymbols: true,
        excludeAmbiguous: true,
        excludeChars: "",
        requireEachCategory: true,
      };
  }
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Generate cryptographically secure random indices without modulo bias.
 */
function secureRandomIndices(poolSize: number, count: number): number[] {
  return Array.from({ length: count }, () => cryptoRandomInt(poolSize));
}

/**
 * Generate a password that guarantees at least one character from each enabled category.
 */
function generateWithGuarantees(
  alphabet: string,
  opts: PasswordGeneratorOptions,
): string[] {
  const requiredChars: string[] = [];

  let lower = LOWERCASE;
  let upper = UPPERCASE;
  let digits = DIGITS;
  let symbols = SYMBOLS;

  if (opts.excludeAmbiguous) {
    lower = removeChars(lower, AMBIGUOUS);
    upper = removeChars(upper, AMBIGUOUS);
    digits = removeChars(digits, AMBIGUOUS);
  }
  if (opts.excludeChars) {
    lower = removeChars(lower, opts.excludeChars);
    upper = removeChars(upper, opts.excludeChars);
    digits = removeChars(digits, opts.excludeChars);
    symbols = removeChars(symbols, opts.excludeChars);
  }

  // Pick one from each required pool
  if (opts.includeLowercase && lower.length > 0) {
    requiredChars.push(pickRandom(lower));
  }
  if (opts.includeUppercase && upper.length > 0) {
    requiredChars.push(pickRandom(upper));
  }
  if (opts.includeDigits && digits.length > 0) {
    requiredChars.push(pickRandom(digits));
  }
  if (opts.includeSymbols && symbols.length > 0) {
    requiredChars.push(pickRandom(symbols));
  }

  if (requiredChars.length >= opts.length) {
    return shuffleArray(requiredChars).slice(0, opts.length);
  }

  // Fill remaining slots from full alphabet
  const remaining = opts.length - requiredChars.length;
  const indices = secureRandomIndices(alphabet.length, remaining);
  const fillers = indices.map((idx) => alphabet[idx]);

  // Combine and shuffle
  const chars: string[] = [...requiredChars, ...fillers];
  return shuffleArray(chars);
}

function pickRandom(str: string): string {
  const idx = secureRandomIndices(str.length, 1)[0];
  return str[idx];
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomIndices(i + 1, 1)[0];
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function categorizeChar(ch: string): string {
  if (/[a-z]/.test(ch)) return "lowercase";
  if (/[A-Z]/.test(ch)) return "uppercase";
  if (/[0-9]/.test(ch)) return "digit";
  return "symbol";
}
