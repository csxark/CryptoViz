// lib/math/ringLwe.ts

// Polynomial operations in Z_q[X] / (X^n + 1)
// We represent a polynomial as an array of coefficients [c_0, c_1, ..., c_{n-1}]
// corresponding to c_0 + c_1*X + c_2*X^2 + ... + c_{n-1}*X^{n-1}

export function parsePolynomial(input: string): number[] {
  // Simple parser: assumes comma-separated values for coefficients, e.g. "1, -2, 0, 4"
  // For production, a more robust algebra parser would be nice, but this suffices for the lab.
  return input.split(',').map(s => parseInt(s.trim()) || 0);
}

// Polynomial multiplication in Z[X] (standard multiplication without reduction)
export function polyMultiply(a: number[], b: number[]): number[] {
  const result = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      result[i + j] += a[i] * b[j];
    }
  }
  return result;
}

// Reduce polynomial mod (X^n + 1)
export function polyReduceModRing(p: number[], n: number): number[] {
  const result = new Array(n).fill(0);
  for (let i = 0; i < p.length; i++) {
    const power = i % (2 * n);
    // Since X^n = -1, X^{n+k} = -X^k
    if (power < n) {
      result[power] += p[i];
    } else {
      result[power - n] -= p[i];
    }
  }
  return result;
}

// Reduce polynomial mod q (coefficients in (-q/2, q/2] or [0, q-1])
// We will use [0, q-1] standard positive modulo for simplicity, 
// though sometimes centered lift is preferred. Let's use standard.
export function polyReduceModQ(p: number[], q: number, centered: boolean = false): number[] {
  return p.map(c => {
    let reduced = ((c % q) + q) % q;
    if (centered && reduced > Math.floor(q / 2)) {
      reduced -= q;
    }
    return reduced;
  });
}

// Full Ring-LWE multiplication: (a * b) mod (X^n + 1) mod q
export function ringPolyMultiply(a: number[], b: number[], n: number, q: number, centered: boolean = false): {
  rawMult: number[],
  ringReduced: number[],
  fullyReduced: number[]
} {
  const rawMult = polyMultiply(a, b);
  const ringReduced = polyReduceModRing(rawMult, n);
  const fullyReduced = polyReduceModQ(ringReduced, q, centered);
  
  return {
    rawMult,
    ringReduced,
    fullyReduced
  };
}

export function ringPolyAdd(a: number[], b: number[], q: number, centered: boolean = false): number[] {
  const n = Math.max(a.length, b.length);
  const result = new Array(n).fill(0);
  for(let i=0; i<n; i++) {
    result[i] = (a[i] || 0) + (b[i] || 0);
  }
  return polyReduceModQ(result, q, centered);
}
