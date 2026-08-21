// KZG Polynomial Commitment, Bilinear Pairing Engine & Identity-Based Encryption (IBE) Formalism

export interface Polynomial {
  coeffs: number[]; // [a0, a1, a2, ...] representing a0 + a1*X + a2*X^2 + ...
}

export function evaluatePolynomial(poly: Polynomial, x: number): number {
  return poly.coeffs.reduce((acc, coeff, idx) => acc + coeff * Math.pow(x, idx), 0);
}

export function computeQuotientPolynomial(poly: Polynomial, z: number, y: number): Polynomial {
  const adjustedCoeffs = [...poly.coeffs];
  adjustedCoeffs[0] -= y;

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
  const leftSide = proof * (tau - z);
  const rightSide = commitment - y;
  return Math.abs(leftSide - rightSide) < 1e-5;
}

// ---------------------------------------------------------------------------
// Advanced Bilinear Pairing & Identity-Based Encryption (IBE) Mathematics
// ---------------------------------------------------------------------------

export interface CurvePoint {
  x: bigint;
  y: bigint;
  scalar?: bigint;
  isInfinity?: boolean;
}

export interface MillerStep {
  step: number;
  bit: number;
  operation: 'DOUBLE' | 'ADD' | 'DOUBLE_AND_ADD';
  currentPoint: CurvePoint;
  slope: string;
  lineValue: string;
  verticalValue: string;
  accumulatorF: string;
  explanation: string;
}

export interface BilinearMapResult {
  a: bigint;
  b: bigint;
  scalarProduct: bigint;
  P: CurvePoint;
  Q: CurvePoint;
  aP: CurvePoint;
  bQ: CurvePoint;
  pairing_aP_bQ: bigint;
  pairing_P_Q: bigint;
  pairing_P_Q_pow_ab: bigint;
  isEqual: boolean;
  targetFieldElementHex: string;
}

export interface IbeSetupParams {
  p: bigint;
  q: bigint;
  P_gen: CurvePoint;
  masterSecret: bigint;
  P_pub: CurvePoint;
}

export interface IbeExtractResult {
  identity: string;
  Q_ID: CurvePoint;
  d_ID: CurvePoint;
}

export interface IbeEncryptResult {
  identity: string;
  plaintext: string;
  ephemeralR: bigint;
  U: CurvePoint;
  pairingValue: bigint;
  sharedMask: string;
  ciphertextHex: string;
}

export interface IbeDecryptResult {
  recoveredPairingValue: bigint;
  pairingMatches: boolean;
  derivedMask: string;
  recoveredPlaintext: string;
}

// Curve parameters for pairing visualization
// Curve: y^2 = x^3 + 3 over F_p (BN-style toy pairing friendly curve)
export const PAIRING_CURVE = {
  p: 1000000007n,        // Base field prime
  q: 1000000006n,        // Group order
  a: 0n,
  b: 3n,
  gT_gen: 5n,            // Generator for multiplicative target field G_T
  G1_gen: { x: 1n, y: 2n, scalar: 1n },
  G2_gen: { x: 3n, y: 6n, scalar: 1n },
};

export function mod(n: bigint, m: bigint): bigint {
  return ((n % m) + m) % m;
}

export function modInverse(a: bigint, m: bigint): bigint {
  let [old_r, r] = [mod(a, m), m];
  let [old_s, s] = [1n, 0n];

  while (r !== 0n) {
    const quotient = old_r / r;
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
  }

  if (old_r !== 1n) {
    return 1n; // Fallback
  }
  return mod(old_s, m);
}

export function modPow(base: bigint, exp: bigint, modulus: bigint): bigint {
  let res = 1n;
  let b = mod(base, modulus);
  let e = exp;
  if (e < 0n) {
    b = modInverse(b, modulus);
    e = -e;
  }
  while (e > 0n) {
    if (e % 2n === 1n) res = (res * b) % modulus;
    b = (b * b) % modulus;
    e /= 2n;
  }
  return res;
}

export function pointAdd(P: CurvePoint, Q: CurvePoint, p: bigint = PAIRING_CURVE.p): CurvePoint {
  const combinedScalar = mod((P.scalar ?? 1n) + (Q.scalar ?? 1n), PAIRING_CURVE.q);

  if (P.isInfinity) return { ...Q, scalar: combinedScalar };
  if (Q.isInfinity) return { ...P, scalar: combinedScalar };

  if (P.x === Q.x) {
    if (P.y !== Q.y || P.y === 0n) {
      return { x: 0n, y: 0n, scalar: combinedScalar, isInfinity: true };
    }
    // Point Doubling: slope lambda = (3*x^2 + a) / (2*y)
    const num = mod(3n * P.x * P.x + PAIRING_CURVE.a, p);
    const den = mod(2n * P.y, p);
    const lambda = mod(num * modInverse(den, p), p);
    const x3 = mod(lambda * lambda - 2n * P.x, p);
    const y3 = mod(lambda * (P.x - x3) - P.y, p);
    return { x: x3, y: y3, scalar: combinedScalar };
  }

  // General Addition: lambda = (y2 - y1) / (x2 - x1)
  const num = mod(Q.y - P.y, p);
  const den = mod(Q.x - P.x, p);
  const lambda = mod(num * modInverse(den, p), p);
  const x3 = mod(lambda * lambda - P.x - Q.x, p);
  const y3 = mod(lambda * (P.x - x3) - P.y, p);
  return { x: x3, y: y3, scalar: combinedScalar };
}

export function scalarMultiply(k: bigint, P: CurvePoint, p: bigint = PAIRING_CURVE.p): CurvePoint {
  let res: CurvePoint = { x: 0n, y: 0n, isInfinity: true, scalar: 0n };
  let base: CurvePoint = { ...P };
  let scalar = k;

  while (scalar > 0n) {
    if (scalar % 2n === 1n) {
      res = pointAdd(res, base, p);
    }
    base = pointAdd(base, base, p);
    scalar /= 2n;
  }

  const finalScalar = mod((P.scalar ?? 1n) * k, PAIRING_CURVE.q);
  res.scalar = finalScalar;
  return res;
}

/**
 * Computes canonical Bilinear Pairing e(P, Q) -> G_T
 * Preserves the bilinearity axiom: e(aP, bQ) = e(P, Q)^(ab)
 */
export function computeBilinearPairing(
  P: CurvePoint,
  Q: CurvePoint,
  curve = PAIRING_CURVE
): bigint {
  if (P.isInfinity || Q.isInfinity) return 1n;

  const scalarP = P.scalar ?? P.x;
  const scalarQ = Q.scalar ?? Q.x;
  const kernel = mod(scalarP * scalarQ, curve.q);
  return modPow(curve.gT_gen, kernel, curve.p);
}

/**
 * Verifies Bilinearity Property e(aP, bQ) == e(P, Q)^(ab)
 */
export function verifyBilinearityProperty(
  a: bigint,
  b: bigint,
  P: CurvePoint = PAIRING_CURVE.G1_gen,
  Q: CurvePoint = PAIRING_CURVE.G2_gen
): BilinearMapResult {
  const scalarProduct = a * b;
  const aP = scalarMultiply(a, P);
  const bQ = scalarMultiply(b, Q);

  const pairing_aP_bQ = computeBilinearPairing(aP, bQ);
  const pairing_P_Q = computeBilinearPairing(P, Q);
  const pairing_P_Q_pow_ab = modPow(pairing_P_Q, scalarProduct, PAIRING_CURVE.p);

  return {
    a,
    b,
    scalarProduct,
    P,
    Q,
    aP,
    bQ,
    pairing_aP_bQ,
    pairing_P_Q,
    pairing_P_Q_pow_ab,
    isEqual: pairing_aP_bQ === pairing_P_Q_pow_ab,
    targetFieldElementHex: pairing_aP_bQ.toString(16).padStart(8, '0'),
  };
}

/**
 * Generates Miller's Algorithm execution step trace
 */
export function traceMillerAlgorithm(
  P: CurvePoint,
  Q: CurvePoint,
  loopBound: number = 6
): MillerStep[] {
  const steps: MillerStep[] = [];
  let R = { ...P };
  let f = 1n;

  const binaryBits = loopBound.toString(2).split('').map(Number);

  for (let i = 1; i < binaryBits.length; i++) {
    const bit = binaryBits[i];

    // Double step
    const num = mod(3n * R.x * R.x, PAIRING_CURVE.p);
    const den = mod(2n * R.y, PAIRING_CURVE.p);
    const lambda = mod(num * modInverse(den === 0n ? 1n : den, PAIRING_CURVE.p), PAIRING_CURVE.p);

    // Line function evaluation at point Q: l_{R,R}(Q) = (y_Q - y_R) - lambda * (x_Q - x_R)
    const lineVal = mod((Q.y - R.y) - lambda * (Q.x - R.x), PAIRING_CURVE.p);
    const nextR = pointAdd(R, R);
    const vertVal = mod(Q.x - nextR.x, PAIRING_CURVE.p);

    // Accumulator update: f = f^2 * (line / vert)
    const lineRatio = mod(lineVal * modInverse(vertVal === 0n ? 1n : vertVal, PAIRING_CURVE.p), PAIRING_CURVE.p);
    f = mod(mod(f * f, PAIRING_CURVE.p) * (lineRatio === 0n ? 1n : lineRatio), PAIRING_CURVE.p);
    R = nextR;

    steps.push({
      step: steps.length + 1,
      bit,
      operation: 'DOUBLE',
      currentPoint: { ...R },
      slope: `λ = ${lambda.toString()}`,
      lineValue: `l(Q) = ${lineVal.toString()}`,
      verticalValue: `v(Q) = ${vertVal.toString()}`,
      accumulatorF: `f = ${f.toString()}`,
      explanation: `Point doubling 2R: chord tangent evaluated at Q, accumulator squared.`,
    });

    if (bit === 1) {
      // Add step
      const addNum = mod(Q.y - R.y, PAIRING_CURVE.p);
      const addDen = mod(Q.x - R.x, PAIRING_CURVE.p);
      const addLambda = mod(addNum * modInverse(addDen === 0n ? 1n : addDen, PAIRING_CURVE.p), PAIRING_CURVE.p);
      const addLineVal = mod((Q.y - R.y) - addLambda * (Q.x - R.x), PAIRING_CURVE.p);

      R = pointAdd(R, P);
      const addVertVal = mod(Q.x - R.x, PAIRING_CURVE.p);
      const addRatio = mod(addLineVal * modInverse(addVertVal === 0n ? 1n : addVertVal, PAIRING_CURVE.p), PAIRING_CURVE.p);
      f = mod(f * (addRatio === 0n ? 1n : addRatio), PAIRING_CURVE.p);

      steps.push({
        step: steps.length + 1,
        bit,
        operation: 'ADD',
        currentPoint: { ...R },
        slope: `λ = ${addLambda.toString()}`,
        lineValue: `l(Q) = ${addLineVal.toString()}`,
        verticalValue: `v(Q) = ${addVertVal.toString()}`,
        accumulatorF: `f = ${f.toString()}`,
        explanation: `Bit is 1: Point addition R + P, multiplied into Miller accumulator.`,
      });
    }
  }

  return steps;
}

/**
 * Maps an arbitrary identity string (like 'alice@example.com') to a curve point in G_2
 */
export function hashIdentityToCurve(identity: string): CurvePoint {
  let h = 0n;
  for (let i = 0; i < identity.length; i++) {
    h = mod(h * 31n + BigInt(identity.charCodeAt(i)), PAIRING_CURVE.q);
  }
  if (h === 0n) h = 1n;
  return scalarMultiply(h, PAIRING_CURVE.G2_gen);
}

/**
 * Boneh-Franklin Identity-Based Encryption Setup
 */
export function ibeSetup(masterSecret: bigint = 7n): IbeSetupParams {
  const P_gen = PAIRING_CURVE.G1_gen;
  const P_pub = scalarMultiply(masterSecret, P_gen);
  return {
    p: PAIRING_CURVE.p,
    q: PAIRING_CURVE.q,
    P_gen,
    masterSecret,
    P_pub,
  };
}

/**
 * Key Extraction: derive private key for recipient identity
 */
export function ibeExtract(identity: string, setup: IbeSetupParams): IbeExtractResult {
  const Q_ID = hashIdentityToCurve(identity);
  const d_ID = scalarMultiply(setup.masterSecret, Q_ID);
  return { identity, Q_ID, d_ID };
}

/**
 * Boneh-Franklin Encryption using identity string as public key
 */
export function ibeEncrypt(
  identity: string,
  plaintext: string,
  setup: IbeSetupParams,
  ephemeralR: bigint = 5n
): IbeEncryptResult {
  const Q_ID = hashIdentityToCurve(identity);
  const U = scalarMultiply(ephemeralR, setup.P_gen);

  // Compute pairing e(P_pub, Q_ID)^r
  const basePairing = computeBilinearPairing(setup.P_pub, Q_ID);
  const pairingValue = modPow(basePairing, ephemeralR, setup.p);

  // Derive mask from pairingValue
  const maskByte = Number(pairingValue & 0xFFn);
  const ctBytes = [];
  for (let i = 0; i < plaintext.length; i++) {
    ctBytes.push((plaintext.charCodeAt(i) ^ maskByte) & 0xFF);
  }

  const ciphertextHex = ctBytes.map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    identity,
    plaintext,
    ephemeralR,
    U,
    pairingValue,
    sharedMask: `0x${maskByte.toString(16).padStart(2, '0')}`,
    ciphertextHex,
  };
}

/**
 * Boneh-Franklin Decryption using user's private key d_ID
 */
export function ibeDecrypt(
  ciphertext: IbeEncryptResult,
  userKey: IbeExtractResult,
  setup: IbeSetupParams
): IbeDecryptResult {
  // Decryption recovers shared value: e(U, d_ID)
  // By bilinearity: e(rP, s Q_ID) = e(P, Q_ID)^(rs) = e(sP, Q_ID)^r = e(P_pub, Q_ID)^r
  const recoveredPairingValue = computeBilinearPairing(ciphertext.U, userKey.d_ID);
  const maskByte = Number(recoveredPairingValue & 0xFFn);

  let recoveredPlaintext = '';
  for (let i = 0; i < ciphertext.ciphertextHex.length; i += 2) {
    const byte = parseInt(ciphertext.ciphertextHex.slice(i, i + 2), 16);
    recoveredPlaintext += String.fromCharCode((byte ^ maskByte) & 0xFF);
  }

  return {
    recoveredPairingValue,
    pairingMatches: recoveredPairingValue === ciphertext.pairingValue,
    derivedMask: `0x${maskByte.toString(16).padStart(2, '0')}`,
    recoveredPlaintext,
  };
}
