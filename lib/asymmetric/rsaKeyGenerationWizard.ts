export interface RsaWizardInput {
  primeP: number;
  primeQ: number;
  publicExponent: number;
}

export interface RsaWizardStep {
  id: string;
  title: string;
  formula: string;
  result: string;
  explanation: string;
}

export interface RsaWizardResult {
  input: RsaWizardInput;
  modulus: number;
  totient: number;
  lambda: number;
  privateExponent: number;
  publicKey: string;
  privateKey: string;
  steps: RsaWizardStep[];
  securityNotes: string[];
}

export const DEFAULT_RSA_WIZARD_INPUT: RsaWizardInput = {
  primeP: 61,
  primeQ: 53,
  publicExponent: 17,
};

const DEMO_MIN_PRIME = 3;
const DEMO_MAX_PRIME = 997;

export const RSA_DEMO_PRIMES = [
  11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83,
  89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 157, 163, 167, 173,
  179, 181, 191, 193, 197, 199,
];

export function isPrime(value: number): boolean {
  if (!Number.isInteger(value) || value < 2) return false;
  if (value === 2) return true;
  if (value % 2 === 0) return false;

  for (let divisor = 3; divisor * divisor <= value; divisor += 2) {
    if (value % divisor === 0) return false;
  }

  return true;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }

  return x;
}

export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs((a / gcd(a, b)) * b);
}

export function extendedGcd(
  a: number,
  b: number,
): { gcd: number; x: number; y: number } {
  if (b === 0) {
    return { gcd: a, x: 1, y: 0 };
  }

  const next = extendedGcd(b, a % b);

  return {
    gcd: next.gcd,
    x: next.y,
    y: next.x - Math.floor(a / b) * next.y,
  };
}

export function modInverse(value: number, modulus: number): number {
  const result = extendedGcd(value, modulus);

  if (result.gcd !== 1) {
    throw new Error("Public exponent must be coprime with modulus.");
  }

  return ((result.x % modulus) + modulus) % modulus;
}

export function validateRsaWizardInput(input: RsaWizardInput): RsaWizardInput {
  const { primeP, primeQ, publicExponent } = input;

  if (!Number.isInteger(primeP) || !Number.isInteger(primeQ)) {
    throw new Error("Both RSA factors must be integers.");
  }

  if (primeP < DEMO_MIN_PRIME || primeP > DEMO_MAX_PRIME) {
    throw new Error(
      `Prime p must be between ${DEMO_MIN_PRIME} and ${DEMO_MAX_PRIME}.`,
    );
  }

  if (primeQ < DEMO_MIN_PRIME || primeQ > DEMO_MAX_PRIME) {
    throw new Error(
      `Prime q must be between ${DEMO_MIN_PRIME} and ${DEMO_MAX_PRIME}.`,
    );
  }

  if (!isPrime(primeP)) {
    throw new Error("p must be a prime number.");
  }

  if (!isPrime(primeQ)) {
    throw new Error("q must be a prime number.");
  }

  if (primeP === primeQ) {
    throw new Error("p and q must be different primes.");
  }

  const lambda = lcm(primeP - 1, primeQ - 1);

  if (!Number.isInteger(publicExponent) || publicExponent <= 1) {
    throw new Error("Public exponent e must be an integer greater than 1.");
  }

  if (publicExponent >= lambda) {
    throw new Error("Public exponent e must be smaller than λ(n).");
  }

  if (gcd(publicExponent, lambda) !== 1) {
    throw new Error("Public exponent e must be coprime with λ(n).");
  }

  return { primeP, primeQ, publicExponent };
}

export function generateRsaWizard(input: RsaWizardInput): RsaWizardResult {
  const safeInput = validateRsaWizardInput(input);
  const { primeP, primeQ, publicExponent } = safeInput;
  const modulus = primeP * primeQ;
  const totient = (primeP - 1) * (primeQ - 1);
  const lambda = lcm(primeP - 1, primeQ - 1);
  const privateExponent = modInverse(publicExponent, lambda);

  const steps: RsaWizardStep[] = [
    {
      id: "select-primes",
      title: "Select two distinct primes",
      formula: `p = ${primeP}, q = ${primeQ}`,
      result: `${primeP} and ${primeQ} are prime and distinct.`,
      explanation:
        "RSA begins with two different prime numbers. In production these primes are extremely large and generated securely; here they are intentionally small for visualization.",
    },
    {
      id: "compute-modulus",
      title: "Compute the modulus",
      formula: `n = p × q = ${primeP} × ${primeQ}`,
      result: `n = ${modulus}`,
      explanation:
        "The modulus n is part of both the public and private keys. RSA security depends on factoring n being infeasible when p and q are very large.",
    },
    {
      id: "compute-totient",
      title: "Compute Carmichael's totient λ(n)",
      formula: `λ(n) = lcm(p - 1, q - 1) = lcm(${primeP - 1}, ${primeQ - 1})`,
      result: `λ(n) = ${lambda} (Euler's φ(n) = ${totient})`,
      explanation:
        "PKCS#1 v2.2 (RFC 8017) specifies Carmichael's lambda λ(n) = lcm(p - 1, q - 1) to derive the private exponent. While the original 1978 RSA paper used Euler's totient φ(n) = (p - 1)(q - 1), λ(n) yields the minimal private exponent d satisfying e · d ≡ 1 (mod λ(n)).",
    },
    {
      id: "choose-exponent",
      title: "Choose the public exponent",
      formula: `gcd(e, λ(n)) = gcd(${publicExponent}, ${lambda})`,
      result: `gcd = ${gcd(publicExponent, lambda)}`,
      explanation:
        "The public exponent e must be coprime with Carmichael's lambda λ(n), ensuring a valid modular inverse exists.",
    },
    {
      id: "compute-private-exponent",
      title: "Compute the private exponent",
      formula: `d ≡ e⁻¹ mod λ(n) = ${publicExponent}⁻¹ mod ${lambda}`,
      result: `d = ${privateExponent}`,
      explanation:
        "The private exponent d is derived mod λ(n) in compliance with RFC 8017 / PKCS#1 v2.2. It reverses the public exponent transformation and must remain secret.",
    },
    {
      id: "assemble-keys",
      title: "Assemble key pair",
      formula: "Public key = (n, e), Private key = (n, d)",
      result: `Public: (${modulus}, ${publicExponent}), Private: (${modulus}, ${privateExponent})`,
      explanation:
        "Anyone can use the public key, but only the holder of the private key can decrypt or sign. This demo key is intentionally tiny and insecure.",
    },
  ];

  return {
    input: safeInput,
    modulus,
    totient,
    lambda,
    privateExponent,
    publicKey: `(${modulus}, ${publicExponent})`,
    privateKey: `(${modulus}, ${privateExponent})`,
    steps,
    securityNotes: [
      "This wizard uses small primes for education only.",
      "This wizard derives d mod λ(n) = lcm(p - 1, q - 1) in accordance with PKCS#1 v2.2 (RFC 8017). This produces the minimal valid private exponent.",
      "Real RSA keys should be generated with audited cryptographic libraries.",
      "Production RSA commonly uses 2048-bit or larger moduli.",
      "Never reuse demo primes or private exponents for real security.",
      "Modern applications often prefer hybrid encryption and authenticated schemes instead of raw RSA.",
    ],
  };
}

export function getRecommendedPublicExponents(totient: number): number[] {
  return [3, 5, 17, 257, 65537].filter(
    (candidate) =>
      candidate > 1 && candidate < totient && gcd(candidate, totient) === 1,
  );
}

export function buildRsaWizardManualChecklist(): string[] {
  return [
    "Open the RSA Key Generation Wizard page.",
    "Confirm the default p=61, q=53, e=17 example generates n=3233, λ(n)=780, and d=413 (or d=2753 if using φ(n)=3000).",
    "Change p or q to another prime and confirm n, λ(n), and d update.",
    "Enter a non-prime value and confirm a friendly validation error appears.",
    "Enter the same value for p and q and confirm validation prevents it.",
    "Try an exponent that is not coprime with λ(n) and confirm an error appears.",
    "Click each step and confirm the formula, result, and explanation update.",
    "Resize to mobile width and confirm the wizard remains usable.",
  ];
}