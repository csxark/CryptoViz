// Modular arithmetic helpers for Z_q
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function modPow(base: number, exp: number, modVal: number): number {
  let res = 1;
  base = mod(base, modVal);
  while (exp > 0) {
    if (exp % 2 === 1) res = mod(res * base, modVal);
    base = mod(base * base, modVal);
    exp = Math.floor(exp / 2);
  }
  return res;
}

export function modInverse(n: number, modVal: number): number {
  return modPow(n, modVal - 2, modVal); // Fermat's Little Theorem for prime q
}

// NTT parameters for Kyber-like ring (q = 3329, n = 8 or 16 for visualization demo)
export const Q = 3329;

// Bit reversal for N-point transform
export function bitReverse(x: number, bits: number): number {
  let res = 0;
  for (let i = 0; i < bits; i++) {
    res = (res << 1) | (x & 1);
    x >>= 1;
  }
  return res;
}

export interface ButterflyStep {
  stage: number;
  description: string;
  coefficients: number[];
  activeIndices: [number, number];
  twiddleFactor: number;
}

// Forward Negacyclic NTT simulation
export function computeNTTSteps(input: number[]): { steps: ButterflyStep[], result: number[] } {
  const n = input.length;
  const bits = Math.log2(n);
  let a = [...input];
  const steps: ButterflyStep[] = [];

  // Initial state step
  steps.push({
    stage: 0,
    description: "Initial polynomial coefficients vector",
    coefficients: [...a],
    activeIndices: [0, 0],
    twiddleFactor: 1
  });

  // Simplified root of unity for demonstration (e.g., q=3329, primitive root)
  const zeta = 17; // Example primitive root modulo 3329

  let t = n >> 1;
  let m = 1;
  let stageCount = 1;

  while (m < n) {
    let k = 0;
    for (let i = 0; i < m; i++) {
      const s = modPow(zeta, bitReverse(i, bits - 1), Q);
      for (let j = i; j < n; j += 2 * m) {
        const u = a[j];
        const v = mod(a[j + m] * s, Q);
        
        a[j] = mod(u + v, Q);
        a[j + m] = mod(u - v, Q);

        steps.push({
          stage: stageCount,
          description: `Butterfly operation on indices (${j}, ${j + m}) with twiddle factor $\\zeta = ${s}$`,
          coefficients: [...a],
          activeIndices: [j, j + m],
          twiddleFactor: s
        });
      }
      k++;
    }
    t >>= 1;
    m <<= 1;
    stageCount++;
  }

  return { steps, result: a };
}

// Pointwise multiplication in NTT domain
export function pointwiseMultiply(nttA: number[], nttB: number[]): number[] {
  return nttA.map((val, idx) => mod(val * nttB[idx], Q));
}
