import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  SECP256K1_ORDER,
  signWithNonce,
  verifySignature,
  recoverPrivateKey,
  malleateSignature,
  publicKeyOf,
  runNonceReuseAttack,
  hashToScalar,
} from '../../../lib/attacks/signatureNonceReuse'

const n = SECP256K1_ORDER

describe('signatureNonceReuse — ECDSA lab engine', () => {
  it('signWithNonce produces signatures that verify under standard ECDSA', () => {
    const d = 0x1234567890abcdefn
    const sig = signWithNonce('authorize payment #42', d, 0xdeadbeefcafen)
    expect(verifySignature('authorize payment #42', sig, publicKeyOf(d))).toBe(true)
    // Tampering the message must break verification.
    expect(verifySignature('authorize payment #99', sig, publicKeyOf(d))).toBe(false)
  })

  it('reusing a nonce yields the same r for different messages', () => {
    const d = 0xabcabcabcn
    const k = 0x99887766n
    const a = signWithNonce('one', d, k)
    const b = signWithNonce('two', d, k)
    expect(a.r).toBe(b.r)
    expect(a.s).not.toBe(b.s)
  })

  it('recovers the exact private key from two nonce-reusing signatures', () => {
    const d = 0x0fedcba987654321n
    const k = 0x1111222233334444n
    const sig1 = signWithNonce('transfer 1 BTC to alice', d, k)
    const sig2 = signWithNonce('transfer 5 BTC to eve', d, k)
    const { d: recoveredD, k: recoveredK } = recoverPrivateKey(sig1, sig2)
    expect(recoveredD).toBe(d)
    expect(recoveredK).toBe(k % n)
  })

  it('runNonceReuseAttack reports keyRecovered=true with a milestone trace', () => {
    const result = runNonceReuseAttack(0x5eed5eed5eedn, 0x424242n, 'msg A', 'msg B')
    expect(result.keyRecovered).toBe(true)
    expect(result.recovered.d).toBe(0x5eed5eed5eedn)
    expect(result.signature1.r).toBe(result.signature2.r)
    expect(result.steps.some((s) => s.isMilestone)).toBe(true)
    expect(result.steps.length).toBeGreaterThanOrEqual(4)
  })

  it('refuses to "recover" when the two signatures used different nonces', () => {
    const d = 0x777n
    const sig1 = signWithNonce('one', d, 0x1000n)
    const sig2 = signWithNonce('two', d, 0x2000n)
    expect(sig1.r).not.toBe(sig2.r)
    expect(() => recoverPrivateKey(sig1, sig2)).toThrow(/nonce/i)
  })

  it('rejects a zero nonce', () => {
    expect(() => signWithNonce('x', 0x1n, 0n)).toThrow(/non-zero/i)
  })

  it('demonstrates malleability: (r, n-s) also verifies', () => {
    const d = 0xc0ffeen
    const sig = signWithNonce('hello', d, 0xbeefn)
    const twin = malleateSignature(sig)
    expect(twin.s).toBe((n - sig.s) % n)
    expect(twin.s).not.toBe(sig.s)
    expect(verifySignature('hello', twin, publicKeyOf(d))).toBe(true)
  })

  it('hashToScalar reduces into the scalar field', () => {
    const z = hashToScalar('anything')
    expect(z).toBeGreaterThanOrEqual(0n)
    expect(z).toBeLessThan(n)
  })

  it('property: recovery works for arbitrary keys, nonces, and message pairs', () => {
    fc.assert(
      fc.property(
        fc.bigInt(1n, n - 1n),
        fc.bigInt(1n, n - 1n),
        fc.string(),
        fc.string(),
        (d, k, m1, m2) => {
          fc.pre(m1 !== m2)
          const sig1 = signWithNonce(m1, d, k)
          const sig2 = signWithNonce(m2, d, k)
          fc.pre(sig1.s !== sig2.s) // distinct hashes -> distinct s under reuse
          return recoverPrivateKey(sig1, sig2).d === d
        },
      ),
      { numRuns: 40 },
    )
  })
})
