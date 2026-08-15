// lib/quantum/shorSimulator.ts

// Basic greatest common divisor
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

// Modular exponentiation: base^exp mod modulus
export function modExp(base: number, exp: number, modulus: number): number {
  let result = 1;
  base = base % modulus;
  while (exp > 0) {
    if (exp % 2 === 1) {
      result = (result * base) % modulus;
    }
    exp = Math.floor(exp / 2);
    base = (base * base) % modulus;
  }
  return result;
}

// Period finding (classical simulation of the quantum part for small N)
// Returns r such that a^r = 1 (mod N)
export function findPeriod(a: number, N: number): number {
  let r = 1;
  let current = a % N;
  
  if (gcd(a, N) !== 1) {
    return 0; // Invalid base for period finding (it shares a factor with N)
  }

  while (current !== 1 && r < N * 2) {
    current = (current * a) % N;
    r++;
  }
  
  return current === 1 ? r : 0;
}

// Simulate the probability distribution of measuring a state after Inverse QFT
// In a real quantum computer, QFT on the periodic state creates peaks at states 
// j close to k * (Q / r), where Q is the size of the upper register (e.g. 256 for 8 qubits).
export function simulateShorProbabilities(r: number, numQubits: number): { state: number, prob: number }[] {
  const Q = Math.pow(2, numQubits);
  const probs: { state: number, prob: number }[] = [];
  
  if (r === 0) return probs;

  // We place peaks at k * (Q/r)
  // For visual purposes in the educational lab, we just mock the exact peaks
  // and some surrounding noise.
  for (let k = 0; k < r; k++) {
    const peak = Math.round(k * (Q / r));
    probs.push({ state: peak, prob: 1 / r });
  }
  
  return probs;
}

// Complete Shor's algorithm simulation for small numbers
export function simulateShor(N: number, a: number): {
  success: boolean,
  message: string,
  r?: number,
  factors?: [number, number],
  probs?: { state: number, prob: number }[]
} {
  if (N <= 1 || N % 2 === 0) {
    return { success: false, message: "N must be an odd composite number." };
  }

  const g = gcd(a, N);
  if (g > 1) {
    return { success: true, message: `Lucky guess! Base 'a' shares a factor with N.`, factors: [g, N / g] };
  }

  const r = findPeriod(a, N);
  if (r === 0) {
    return { success: false, message: "Could not find a valid period." };
  }
  
  if (r % 2 !== 0) {
    return { success: false, r, message: `Period r=${r} is odd. Shor's algorithm requires an even period. Try another base.` };
  }

  const x = modExp(a, r / 2, N);
  if (x === N - 1) {
    return { success: false, r, message: `Period r=${r} yields a^(r/2) = -1 mod N. This is a trivial non-factor. Try another base.` };
  }

  const factor1 = gcd(x - 1, N);
  const factor2 = gcd(x + 1, N);

  if (factor1 * factor2 === N || (factor1 > 1 && factor2 > 1)) {
    // Determine the actual prime factors. gcd might just give one prime.
    const f1 = factor1 > 1 ? factor1 : factor2;
    const f2 = N / f1;
    return { 
      success: true, 
      message: "Successfully factored N!", 
      r, 
      factors: [f1, f2],
      probs: simulateShorProbabilities(r, 8) // simulate 8 qubits (Q=256) for the upper register
    };
  }

  return { success: false, r, message: "Failed to extract factors despite finding an even period." };
}
