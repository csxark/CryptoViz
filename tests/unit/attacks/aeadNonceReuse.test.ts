import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { gcmEncryptRaw } from '../../../lib/cipher/symmetric/aes-gcm'
import {
  GF_ONE,
  gfMul,
  gfInverse,
  gfSqrt,
  xorBlocks,
  ghashSingleBlock,
  recoverAuthKey,
  forgeTag,
  runForbiddenAttack,
  textToBlock,
  type Block,
} from '../../../lib/attacks/aeadNonceReuse'

const eq = (a: Block, b: Block) => Buffer.from(a).equals(Buffer.from(b))
const bytes = () => fc.uint8Array({ minLength: 16, maxLength: 16 }).map((a) => a as Block)
const nonzero = () => bytes().filter((a) => !a.every((x) => x === 0))

describe('aeadNonceReuse — GF(2¹²⁸) field arithmetic', () => {
  it('GF_ONE is the multiplicative identity', () => {
    fc.assert(fc.property(bytes(), (a) => eq(gfMul(a, GF_ONE), a)), { numRuns: 40 })
  })

  it('a · a⁻¹ = 1 for every non-zero element', () => {
    fc.assert(fc.property(nonzero(), (a) => eq(gfMul(a, gfInverse(a)), GF_ONE)), { numRuns: 40 })
  })

  it('inverting zero throws', () => {
    expect(() => gfInverse(new Uint8Array(16) as Block)).toThrow(/inverse/i)
  })

  it('√(a²) = a — the square root is unique over GF(2¹²⁸)', () => {
    fc.assert(fc.property(bytes(), (a) => eq(gfSqrt(gfMul(a, a)), a)), { numRuns: 40 })
  })
})

describe('aeadNonceReuse — forbidden-attack recovery', () => {
  it('recovers H exactly from two nonce-reusing single-block messages', () => {
    fc.assert(
      fc.property(nonzero(), bytes(), nonzero(), nonzero(), (H, pad, C1, C2) => {
        fc.pre(!eq(C1, C2))
        const T1 = xorBlocks(ghashSingleBlock(H, C1), pad)
        const T2 = xorBlocks(ghashSingleBlock(H, C2), pad)
        const rec = recoverAuthKey({ ciphertext: C1, tag: T1 }, { ciphertext: C2, tag: T2 })
        return eq(rec.H, H) && eq(rec.pad, pad)
      }),
      { numRuns: 40 },
    )
  })

  it('refuses to recover when the two ciphertext blocks are identical', () => {
    const C = textToBlock('same block xxxxx')
    const H = textToBlock('secret hashkey!!')
    const T1 = xorBlocks(ghashSingleBlock(H, C), textToBlock('pad'))
    expect(() =>
      recoverAuthKey({ ciphertext: C, tag: T1 }, { ciphertext: C, tag: T1 }),
    ).toThrow(/identical/i)
  })

  it('a tag forged from recovered secrets matches the genuine GHASH tag', () => {
    const H = textToBlock('hash-subkey-Hxx!')
    const pad = textToBlock('nonce-pad-EKJ0!!')
    const C1 = textToBlock('victim block #1!')
    const C2 = textToBlock('victim block #2!')
    const rec = recoverAuthKey(
      { ciphertext: C1, tag: xorBlocks(ghashSingleBlock(H, C1), pad) },
      { ciphertext: C2, tag: xorBlocks(ghashSingleBlock(H, C2), pad) },
    )
    const forgedC = textToBlock('ATTACKER CHOICE!')
    const forged = forgeTag(rec, forgedC)
    const genuine = xorBlocks(ghashSingleBlock(H, forgedC), pad) // what a verifier computes
    expect(eq(forged, genuine)).toBe(true)
  })
})

describe('aeadNonceReuse — end-to-end against the reference AES-GCM', () => {
  it('recovers the key and forges a tag the real GCM verifier accepts', () => {
    const key = new Uint8Array(16).map((_, i) => (i * 37 + 5) & 0xff)
    const iv = new Uint8Array(12).map((_, i) => (i * 11 + 1) & 0xff) // 96-bit IV
    const P1 = new Uint8Array(16).map((_, i) => (i * 3 + 1) & 0xff)
    const P2 = new Uint8Array(16).map((_, i) => (i * 5 + 9) & 0xff)

    // Victim reuses the IV across two messages — the fatal mistake.
    const v1 = gcmEncryptRaw(key, iv, P1)
    const v2 = gcmEncryptRaw(key, iv, P2)

    const result = runForbiddenAttack(
      { ciphertext: v1.ciphertext, tag: v1.tag },
      { ciphertext: v2.ciphertext, tag: v2.tag },
      P1, // known plaintext -> keystream for a meaningful forgery
      textToBlock('PAY ATTACKER $$$'),
    )

    // The real key, encrypting the forged plaintext under the same nonce, must
    // reproduce the attacker's forged ciphertext and tag bit-for-bit.
    const oracle = gcmEncryptRaw(key, iv, result.forgedPlaintext)
    expect(eq(oracle.ciphertext, result.forgedCiphertext)).toBe(true)
    expect(eq(oracle.tag, result.forgedTag)).toBe(true)
    expect(result.steps.some((s) => s.isMilestone)).toBe(true)
  })
})
