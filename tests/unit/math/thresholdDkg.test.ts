import { describe, it, expect } from 'vitest'
import {
  generateParticipantPolynomial,
  calculateCommitments,
  evaluatePolynomial,
  verifyShare,
  aggregateShares,
  aggregateGroupPublicKey,
  calculateLagrangeCoefficient,
  generatePartialSignature,
  computeSchnorrChallenge,
  aggregateSignatures,
  verifyClassicSchnorr,
  CURVE_ORDER,
  mod,
  Share,
} from '../../../lib/math/thresholdDkg'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { fromByteArray } from '../../../lib/utils/encoding'

describe('Threshold DKG & Schnorr Simulator Math', () => {
  it('handles a complete DKG flow correctly', () => {
    const n = 5
    const t = 3
    const message = 'Test threshold signature'

    // Phase 1: Polynomials and Commitments
    const polys: bigint[][] = []
    const commitments: string[][] = []

    for (let i = 1; i <= n; i++) {
      const poly = generateParticipantPolynomial(t)
      polys.push(poly)
      commitments.push(calculateCommitments(poly))
    }

    // Phase 2: Share Distribution and Verification
    const secretShares: bigint[] = new Array(n).fill(0n)

    for (let i = 1; i <= n; i++) {
      const senderPoly = polys[i - 1]
      const senderCommitments = commitments[i - 1]

      for (let j = 1; j <= n; j++) {
        const shareVal = evaluatePolynomial(senderPoly, j)
        const share: Share = { senderId: i, receiverId: j, value: shareVal }
        
        // Verify share
        const isValid = verifyShare(share, senderCommitments)
        expect(isValid).toBe(true)

        secretShares[j - 1] = mod(secretShares[j - 1] + shareVal, CURVE_ORDER)
      }
    }

    // Check that no individual share equals the aggregated group secret
    // Group secret would be sum of poly[0] for all participants
    const groupSecret = polys.reduce((acc, p) => mod(acc + p[0], CURVE_ORDER), 0n)
    for (const share of secretShares) {
      expect(share).not.toBe(groupSecret)
    }

    // Group PK
    const pk = aggregateGroupPublicKey(commitments)
    const expectedPk = secp256k1.Point.BASE.multiply(groupSecret).toHex(false)
    expect(pk).toBe(expectedPk)

    // Phase 3: Threshold Signing
    const selectedSubset = [1, 3, 5] // t participants

    // Ephemeral secrets for each selected participant
    const ephemeralSecrets: Record<number, bigint> = {}
    const partialRs: string[] = []

    for (const j of selectedSubset) {
      const kBytes = secp256k1.utils.randomSecretKey()
      const k = mod(BigInt('0x' + fromByteArray(kBytes, 'hex')), CURVE_ORDER)
      ephemeralSecrets[j] = k
      partialRs.push(secp256k1.Point.BASE.multiply(k).toHex(false))
    }

    // Aggregate ephemeral R
    let R_agg = secp256k1.Point.ZERO
    for (const r of partialRs) {
      R_agg = R_agg.add(secp256k1.Point.fromHex(r))
    }
    const R_hex = R_agg.toHex(false)

    const challenge = computeSchnorrChallenge(R_hex, pk, message)

    // Generate partial signatures
    const partialSigs = []
    for (const j of selectedSubset) {
      const lambda = calculateLagrangeCoefficient(j, selectedSubset)
      const sig = generatePartialSignature(j, secretShares[j - 1], ephemeralSecrets[j], challenge, lambda)
      partialSigs.push(sig)
    }

    // Aggregate signatures
    const { R: R_final, z } = aggregateSignatures(partialSigs)
    expect(R_final).toBe(R_hex)

    // Verify
    const isValidSignature = verifyClassicSchnorr(message, R_final, z, pk)
    expect(isValidSignature).toBe(true)
  })

  it('fails verification with tampered shares', () => {
    const poly = generateParticipantPolynomial(3)
    const commitments = calculateCommitments(poly)
    
    const validShareVal = evaluatePolynomial(poly, 2)
    const validShare: Share = { senderId: 1, receiverId: 2, value: validShareVal }
    expect(verifyShare(validShare, commitments)).toBe(true)

    const tamperedShare: Share = { senderId: 1, receiverId: 2, value: validShareVal + 1n }
    expect(verifyShare(tamperedShare, commitments)).toBe(false)
  })
})
