// KZG Polynomial Commitment & Bilinear Pairing Engine

export interface Polynomial {
  coeffs: number[]; // [a0, a1, a2, ...] representing a0 + a1*X + a2*X^2 + ...
}

export function evaluatePolynomial(poly: Polynomial, x: number): number {
  return poly.coeffs.reduce((acc, coeff, idx) => acc + coeff * Math.pow(x, idx), 0);
}

export function computeQuotientPolynomial(poly: Polynomial, z: number, y: number): Polynomial {
  // Compute P(X) - y
  const adjustedCoeffs = [...poly.coeffs];
  adjustedCoeffs[0] -= y;

  // Perform polynomial long division by (X - z)
  // Since P(z) = y, (X - z) divides P(X) - y with remainder 0.
  const quotientCoeffs: number[] = new Array(Math.max(0, adjustedCoeffs.length - 1)).fill(0);
  let remainderCoeffs = [...adjustedCoeffs];

  for (let i = quotientCoeffs.length - 1; i >= 0; i--) {
    quotientCoeffs[i] = remainderCoeffs[i + 1];
    remainderCoeffs[i] += remainderCoeffs[i + 1] * z;
  }

  return { coeffs: quotientCoeffs };
}

export function generateSRS(degree: number, tau: number) {
  const g1Points: number[] = [];
  let currentTau = 1;

  for (let i = 0; i <= degree; i++) {
    g1Points.push(currentTau);
    currentTau *= tau;
  }

  return {
    g1Points,
    g2Tau: tau,
  };
}

export function verifyBilinearPairing(
  commitment: number,
  y: number,
  proof: number,
  tau: number,
  z: number
): boolean {
  // Simulates e(W, [tau - z]_2) == e(C - [y]_1, G2)
  const leftSide = proof * (tau - z);
  const rightSide = commitment - y;
  
  // Use floating-point tolerance check for simulated cryptographic pairing
  return Math.abs(leftSide - rightSide) < 1e-5;
}
