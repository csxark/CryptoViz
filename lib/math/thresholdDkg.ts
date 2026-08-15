import { secp256k1 } from '@noble/curves/secp256k1.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { toByteArray, fromByteArray } from '../utils/encoding'

export const CURVE_ORDER = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141')
export const G = secp256k1.Point.BASE

// Helper modulo functions for scalar field
export function mod(n: bigint, m: bigint): bigint {
  return ((n % m) + m) % m
}

export function modInverse(a: bigint, m: bigint): bigint {
  let t = 0n,
    newt = 1n,
    r = m,
    newr = mod(a, m)
  while (newr !== 0n) {
    let quotient = r / newr
    ;[t, newt] = [newt, t - quotient * newt]
    ;[r, newr] = [newr, r - quotient * newr]
  }
  if (r > 1n) throw new Error('a is not invertible')
  return mod(t, m)
}

export interface DkgParticipant {
  id: number // 1-indexed for polynomial evaluation
  polynomial: bigint[] // [a_0, a_1, ... a_{t-1}]
  commitments: string[] // hex strings of a_i * G
}

export interface Share {
  senderId: number
  receiverId: number
  value: bigint
}

// Phase 1: DKG Generate Polynomial
export function generateParticipantPolynomial(t: number): bigint[] {
  const poly: bigint[] = []
  for (let i = 0; i < t; i++) {
    const randomBytes = secp256k1.utils.randomSecretKey()
    let coeff = BigInt('0x' + fromByteArray(randomBytes, 'hex'))
    coeff = mod(coeff, CURVE_ORDER)
    poly.push(coeff)
  }
  return poly
}

export function calculateCommitments(poly: bigint[]): string[] {
  return poly.map((coeff) => G.multiply(coeff).toHex(false)) // Uncompressed or compressed? compressed is fine.
}

export function evaluatePolynomial(poly: bigint[], x: number): bigint {
  let result = 0n
  let xPow = 1n
  const xBig = BigInt(x)
  for (const coeff of poly) {
    const term = mod(coeff * xPow, CURVE_ORDER)
    result = mod(result + term, CURVE_ORDER)
    xPow = mod(xPow * xBig, CURVE_ORDER)
  }
  return result
}

// Phase 2: DKG Verify and Aggregate
export function verifyShare(share: Share, senderCommitments: string[]): boolean {
  // s_ij * G == C_i0 + C_i1 * j + C_i2 * j^2 + ...
  const lhs = G.multiply(share.value)
  let rhs = secp256k1.Point.ZERO
  let jPow = 1n
  const jBig = BigInt(share.receiverId)

  for (const C_hex of senderCommitments) {
    const C = secp256k1.Point.fromHex(C_hex)
    const term = C.multiply(jPow)
    rhs = rhs.add(term)
    jPow = mod(jPow * jBig, CURVE_ORDER)
  }

  return lhs.equals(rhs)
}

export function aggregateShares(receivedShares: Share[]): bigint {
  let finalSecret = 0n
  for (const share of receivedShares) {
    finalSecret = mod(finalSecret + share.value, CURVE_ORDER)
  }
  return finalSecret
}

export function aggregateGroupPublicKey(allCommitments: string[][]): string {
  // PK = sum_i (C_i0)
  let pk = secp256k1.Point.ZERO
  for (const participantCommitments of allCommitments) {
    const c0 = secp256k1.Point.fromHex(participantCommitments[0])
    pk = pk.add(c0)
  }
  return pk.toHex(false)
}

// Phase 3: Threshold Signing
export function calculateLagrangeCoefficient(participantId: number, selectedSubset: number[]): bigint {
  let num = 1n
  let den = 1n
  const iBig = BigInt(participantId)

  for (const j of selectedSubset) {
    if (j === participantId) continue
    const jBig = BigInt(j)
    // λ_i = Π (0 - j) / (i - j)
    num = mod(num * (-jBig), CURVE_ORDER)
    den = mod(den * (iBig - jBig), CURVE_ORDER)
  }

  return mod(num * modInverse(den, CURVE_ORDER), CURVE_ORDER)
}

// Classic Schnorr Partial Signature
export interface PartialSignature {
  participantId: number
  R: string // ephemeral public key hex
  z: bigint // partial response
}

export function generatePartialSignature(
  participantId: number,
  secretShare: bigint,
  ephemeralSecret: bigint,
  challenge: bigint,
  lagrangeCoeff: bigint
): PartialSignature {
  const R = G.multiply(ephemeralSecret).toHex(false)
  // z_i = k_i + c * λ_i * s_i
  const term = mod(mod(challenge * lagrangeCoeff, CURVE_ORDER) * secretShare, CURVE_ORDER)
  const z = mod(ephemeralSecret + term, CURVE_ORDER)

  return { participantId, R, z }
}

export function computeSchnorrChallenge(R_hex: string, PK_hex: string, message: string): bigint {
  const data = new Uint8Array([
    ...toByteArray(R_hex, 'hex'),
    ...toByteArray(PK_hex, 'hex'),
    ...toByteArray(message, 'utf8')
  ])
  const hashBytes = sha256(data)
  const hashBigInt = BigInt('0x' + fromByteArray(hashBytes, 'hex'))
  return mod(hashBigInt, CURVE_ORDER)
}

export function aggregateSignatures(partialSignatures: PartialSignature[]): { R: string, z: bigint } {
  let R_agg = secp256k1.Point.ZERO
  let z_agg = 0n

  for (const ps of partialSignatures) {
    R_agg = R_agg.add(secp256k1.Point.fromHex(ps.R))
    z_agg = mod(z_agg + ps.z, CURVE_ORDER)
  }

  return { R: R_agg.toHex(false), z: z_agg }
}

export function verifyClassicSchnorr(message: string, R_hex: string, z: bigint, PK_hex: string): boolean {
  // z * G == R + c * PK
  const lhs = G.multiply(z)
  
  const R = secp256k1.Point.fromHex(R_hex)
  const PK = secp256k1.Point.fromHex(PK_hex)
  const c = computeSchnorrChallenge(R_hex, PK_hex, message)

  const rhs = R.add(PK.multiply(c))

  return lhs.equals(rhs)
}
