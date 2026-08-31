export type RsaAttackCode = "INVALID_INPUT" | "INVALID_KEY" | "NOT_APPLICABLE" | "LIMIT_EXCEEDED";

export class RsaAttackError extends Error {
  code: RsaAttackCode;

  constructor(code: RsaAttackCode, message: string) {
    super(message);
    this.name = "RsaAttackError";
    this.code = code;
  }
}

export interface AttackStep {
  label: string;
  formula: string;
  substituted: string;
  note: string;
}

export interface FermatResult {
  p: bigint;
  q: bigint;
  iterations: number;
  steps: AttackStep[];
  primeGap: bigint;
}

export interface WienerConvergent {
  k: bigint;
  d: bigint;
  phi: bigint | null;
  accepted: boolean;
}

export interface WienerResult {
  d: bigint | null;
  convergents: WienerConvergent[];
  steps: AttackStep[];
}

export interface CommonModulusResult {
  m: bigint;
  a: bigint;
  b: bigint;
  steps: AttackStep[];
}

export interface HastadResult {
  m: bigint;
  crtValue: bigint;
  steps: AttackStep[];
}

export interface HastadCongruence {
  c: bigint;
  n: bigint;
}

export function gcd(a: bigint, b: bigint): bigint {
  let x = abs(a);
  let y = abs(b);

  while (y !== 0n) {
    [x, y] = [y, x % y];
  }

  return x;
}

export function abs(value: bigint): bigint {
  return value < 0n ? -value : value;
}

export function egcd(a: bigint, b: bigint): { g: bigint; x: bigint; y: bigint } {
  if (b === 0n) {
    return { g: abs(a), x: a < 0n ? -1n : 1n, y: 0n };
  }

  const result = egcd(b, a % b);
  return {
    g: result.g,
    x: result.y,
    y: result.x - (a / b) * result.y,
  };
}

export function mod(value: bigint, modulus: bigint): bigint {
  const result = value % modulus;
  return result < 0n ? result + modulus : result;
}

export function modInverse(value: bigint, modulus: bigint): bigint {
  const result = egcd(value, modulus);

  if (result.g !== 1n) {
    throw new RsaAttackError("INVALID_INPUT", "Modular inverse does not exist.");
  }

  return mod(result.x, modulus);
}

export function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  if (modulus <= 0n) throw new RsaAttackError("INVALID_INPUT", "Modulus must be positive.");
  if (exponent < 0n) return modPow(modInverse(base, modulus), -exponent, modulus);

  let result = 1n;
  let current = mod(base, modulus);
  let exp = exponent;

  while (exp > 0n) {
    if (exp & 1n) result = (result * current) % modulus;
    current = (current * current) % modulus;
    exp >>= 1n;
  }

  return result;
}

export function integerSqrt(value: bigint): bigint {
  if (value < 0n) throw new RsaAttackError("INVALID_INPUT", "Square root of a negative value is not defined.");
  if (value < 2n) return value;

  let x0 = value;
  let x1 = (value >> 1n) + 1n;

  while (x1 < x0) {
    x0 = x1;
    x1 = (x1 + value / x1) >> 1n;
  }

  return x0;
}

export function isPerfectSquare(value: bigint): boolean {
  if (value < 0n) return false;
  const root = integerSqrt(value);
  return root * root === value;
}

export function integerNthRoot(value: bigint, degree: bigint): { root: bigint; exact: boolean } {
  if (value < 0n) throw new RsaAttackError("INVALID_INPUT", "Root input must be non-negative.");
  if (degree <= 0n) throw new RsaAttackError("INVALID_INPUT", "Root degree must be positive.");
  if (value < 2n) return { root: value, exact: true };

  let low = 0n;
  let high = value;

  while (low <= high) {
    const mid = (low + high) >> 1n;
    const power = mid ** degree;

    if (power === value) return { root: mid, exact: true };
    if (power < value) low = mid + 1n;
    else high = mid - 1n;
  }

  return { root: high, exact: false };
}

export function continuedFraction(numerator: bigint, denominator: bigint): bigint[] {
  if (denominator <= 0n) throw new RsaAttackError("INVALID_INPUT", "Denominator must be positive.");

  const terms: bigint[] = [];
  let n = numerator;
  let d = denominator;

  while (d !== 0n) {
    const q = n / d;
    terms.push(q);
    [n, d] = [d, n - q * d];
  }

  return terms;
}

export function convergents(terms: bigint[]): Array<{ numerator: bigint; denominator: bigint }> {
  const result: Array<{ numerator: bigint; denominator: bigint }> = [];
  let nMinus2 = 0n;
  let nMinus1 = 1n;
  let dMinus2 = 1n;
  let dMinus1 = 0n;

  for (const term of terms) {
    const numerator = term * nMinus1 + nMinus2;
    const denominator = term * dMinus1 + dMinus2;
    result.push({ numerator, denominator });
    [nMinus2, nMinus1] = [nMinus1, numerator];
    [dMinus2, dMinus1] = [dMinus1, denominator];
  }

  return result;
}

export function crt(congruences: Array<{ remainder: bigint; modulus: bigint }>): bigint {
  if (congruences.length === 0) {
    throw new RsaAttackError("INVALID_INPUT", "At least one congruence is required.");
  }

  const product = congruences.reduce((acc, item) => acc * item.modulus, 1n);
  let total = 0n;

  for (const item of congruences) {
    const partial = product / item.modulus;
    total += item.remainder * partial * modInverse(partial, item.modulus);
  }

  return mod(total, product);
}

export function fermatFactor(n: bigint, maxIterations = 100000): FermatResult {
  if (n < 4n || n % 2n === 0n) {
    throw new RsaAttackError("INVALID_KEY", "Fermat factorization requires an odd composite n greater than 3.");
  }

  if (isPerfectSquare(n)) {
    throw new RsaAttackError("INVALID_KEY", "Perfect-square n is rejected for this teaching demo.");
  }

  let a = integerSqrt(n);
  if (a * a < n) a += 1n;

  const steps: AttackStep[] = [
    {
      label: "Start from ceil(sqrt(n))",
      formula: "a = ceil(sqrt(n))",
      substituted: `a = ${a}`,
      note: "If p and q are close, a is close to (p + q) / 2.",
    },
  ];

  for (let iterations = 0; iterations <= maxIterations; iterations += 1) {
    const b2 = a * a - n;

    if (iterations < 8 || isPerfectSquare(b2)) {
      steps.push({
        label: `Iteration ${iterations}`,
        formula: "b² = a² - n",
        substituted: `${b2} = ${a}² - ${n}`,
        note: isPerfectSquare(b2) ? "b² is a perfect square, so factors are recovered." : "Not a square yet.",
      });
    }

    if (isPerfectSquare(b2)) {
      const b = integerSqrt(b2);
      const p = a - b;
      const q = a + b;

      if (p * q !== n) {
        throw new RsaAttackError("INVALID_KEY", "Recovered values do not multiply to n.");
      }

      return {
        p,
        q,
        iterations,
        steps,
        primeGap: abs(q - p),
      };
    }

    a += 1n;
  }

  throw new RsaAttackError("LIMIT_EXCEEDED", "Fermat search limit reached before finding factors.");
}

export function wienerAttack(e: bigint, n: bigint): WienerResult {
  if (n <= 0n || e <= 0n || e >= n) {
    throw new RsaAttackError("INVALID_KEY", "Wiener's attack requires 0 < e < n.");
  }

  const terms = continuedFraction(e, n);
  const rows: WienerConvergent[] = [];
  const steps: AttackStep[] = [
    {
      label: "Continued fraction",
      formula: "e / n = [a0; a1, a2, ...]",
      substituted: `${e} / ${n} = [${terms.join(", ")}]`,
      note: "Candidate private exponents appear as denominators of convergents.",
    },
  ];

  for (const item of convergents(terms)) {
    const k = item.numerator;
    const d = item.denominator;

    if (k === 0n) {
      rows.push({ k, d, phi: null, accepted: false });
      continue;
    }

    if ((e * d - 1n) % k !== 0n) {
      rows.push({ k, d, phi: null, accepted: false });
      continue;
    }

    const phi = (e * d - 1n) / k;
    const s = n - phi + 1n;
    const discriminant = s * s - 4n * n;
    const accepted = discriminant >= 0n && isPerfectSquare(discriminant);

    rows.push({ k, d, phi, accepted });

    steps.push({
      label: `Convergent k/d = ${k}/${d}`,
      formula: "φ(n) = (e·d − 1) / k",
      substituted: `φ(n) = (${e}·${d} − 1) / ${k} = ${phi}`,
      note: accepted ? "This convergent yields a valid RSA private exponent." : "This convergent does not factor n.",
    });

    if (accepted) {
      return { d, convergents: rows, steps };
    }
  }

  return { d: null, convergents: rows, steps };
}

export function commonModulusAttack(
  n: bigint,
  e1: bigint,
  e2: bigint,
  c1: bigint,
  c2: bigint,
): CommonModulusResult {
  if (n <= 1n || e1 <= 1n || e2 <= 1n) {
    throw new RsaAttackError("INVALID_INPUT", "Common modulus attack requires n > 1 and exponents > 1.");
  }

  const bezout = egcd(e1, e2);
  if (bezout.g !== 1n) {
    throw new RsaAttackError("NOT_APPLICABLE", "Common modulus attack requires coprime exponents.");
  }

  const a = bezout.x;
  const b = bezout.y;
  const m = mod(modPow(c1, a, n) * modPow(c2, b, n), n);

  return {
    m,
    a,
    b,
    steps: [
      {
        label: "Find Bézout coefficients",
        formula: "a·e₁ + b·e₂ = 1",
        substituted: `${a}·${e1} + ${b}·${e2} = 1`,
        note: "Coprime exponents allow the plaintext exponents to combine back to m¹.",
      },
      {
        label: "Recover plaintext",
        formula: "m = c₁ᵃ · c₂ᵇ mod n",
        substituted: `m = ${c1}^${a} · ${c2}^${b} mod ${n} = ${m}`,
        note: "Negative exponents use modular inverses.",
      },
    ],
  };
}

export function hastadBroadcastAttack(e: bigint, congruences: HastadCongruence[]): HastadResult {
  if (e <= 1n) {
    throw new RsaAttackError("INVALID_INPUT", "Håstad attack requires e > 1.");
  }

  if (congruences.length < Number(e)) {
    throw new RsaAttackError("INVALID_INPUT", "Håstad attack requires at least e congruences.");
  }

  for (let i = 0; i < congruences.length; i += 1) {
    for (let j = i + 1; j < congruences.length; j += 1) {
      if (gcd(congruences[i].n, congruences[j].n) !== 1n) {
        throw new RsaAttackError("INVALID_KEY", "Håstad attack requires pairwise coprime moduli.");
      }
    }
  }

  const crtValue = crt(
    congruences.map((item) => ({
      remainder: item.c,
      modulus: item.n,
    })),
  );

  const root = integerNthRoot(crtValue, e);
  if (!root.exact) {
    throw new RsaAttackError("NOT_APPLICABLE", "CRT value is not an exact e-th power.");
  }

  return {
    m: root.root,
    crtValue,
    steps: [
      {
        label: "Combine congruences",
        formula: "x ≡ cᵢ mod nᵢ",
        substituted: `x = ${crtValue}`,
        note: "CRT reconstructs mᵉ when the same message is sent under pairwise-coprime moduli.",
      },
      {
        label: "Extract exact root",
        formula: "m = exactRootₑ(x)",
        substituted: `m = exactRoot_${e}(${crtValue}) = ${root.root}`,
        note: "Because mᵉ is smaller than the product of moduli, the integer root reveals m.",
      },
    ],
  };
}

export const RSA_ATTACK_PRESETS = {
  fermat: {
    n: 100160063n,
    p: 10007n,
    q: 10009n,
  },
wiener: {
  n: 6497n,
  e: 5069n,
  d: 5n,
},  commonModulus: {
    n: 3233n,
    e1: 7n,
    e2: 11n,
    m: 42n,
    c1: modPow(42n, 7n, 3233n),
    c2: modPow(42n, 11n, 3233n),
  },
  hastad: {
    e: 3n,
    m: 42n,
    moduli: [101n, 103n, 107n],
    ciphertexts: [modPow(42n, 3n, 101n), modPow(42n, 3n, 103n), modPow(42n, 3n, 107n)],
  },
};

export function parseBigIntInput(value: string, label: string): bigint {
  const cleaned = value.trim();
  if (!cleaned) throw new RsaAttackError("INVALID_INPUT", `${label} is required.`);
if (!/^-?\d+$/.test(cleaned)) throw new RsaAttackError("INVALID_INPUT", `${label} must be a decimal integer.`);  return BigInt(cleaned);
}

export function attackStepsToRows(steps: AttackStep[]) {
  return steps.map((step, index) => ({
    index: index + 1,
    label: step.label,
    formula: step.formula,
    substituted: step.substituted,
    note: step.note,
  }));
}
