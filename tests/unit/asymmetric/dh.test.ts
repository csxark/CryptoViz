import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, checkPrimitiveRoot, getGeneratorOrder, TEST_VECTORS } from '../../../lib/cipher/asymmetric/dh'
import { modPow } from '../../../lib/cipher/asymmetric/rsa'

describe('Diffie-Hellman Key Exchange Unit Tests', () => {
  it('passes standard test vectors (agreement)', () => {
    // Vector 1: a=6, b=15, p=23, g=5 -> Shared secret K=2
    const vector = TEST_VECTORS[0]
    const result = encrypt(vector.input, vector.key)
    expect(result.output).toBe(vector.expected)
  })

  it('demonstrates the man-in-the-middle key substitution (dual shared secrets)', () => {
    // p=23, g=5; a=6, b=15, Eve's e=9
    const P = 23n
    const G = 5n
    const a = 6n
    const b = 15n
    const e = 9n

    // Public keys
    const A = modPow(G, a, P) // Alice's key g^a = 8
    const B = modPow(G, b, P) // Bob's key g^b = 19
    const E1 = modPow(G, e, P) // Eve's key sent to Bob
    const E2 = modPow(G, e, P) // Eve's key sent to Alice

    // Honest shared secret (no MitM)
    const KAB = modPow(B, a, P) // = 2

    // MitM: Alice & Eve share a secret; Bob & Eve share another
    const KAE = modPow(E2, a, P) // Alice's key with Eve
    const KEA = modPow(A, e, P) // Eve's key with Alice
    const KBE = modPow(E1, b, P) // Bob's key with Eve
    const KEB = modPow(B, e, P) // Eve's key with Bob

    expect(A).toBe(8n)
    expect(B).toBe(19n)
    expect(KAB).toBe(2n)

    // Dual secrets match on each side...
    expect(KAE).toBe(KEA)
    expect(KBE).toBe(KEB)
    // ...but neither equals the honest shared secret
    expect(KAE).not.toBe(KAB)
    expect(KBE).not.toBe(KAB)
    // And Alice/Bob end up with different keys (no common secret)
    expect(KAE).not.toBe(KBE)
  })

  it('correctly identifies primitive roots and computes generator orders', () => {
    // For p = 23: 5 is a primitive root (order 22)
    const check5 = checkPrimitiveRoot(5n, 23n)
    expect(check5.isPrimitive).toBe(true)
    expect(check5.order).toBe(22n)

    // For p = 23: 2 is NOT a primitive root (order 11)
    const check2 = checkPrimitiveRoot(2n, 23n)
    expect(check2.isPrimitive).toBe(false)
    expect(check2.order).toBe(11n)
  })

  it('displays primitive root validation in instrumented mode step 0', () => {
    // g=5, p=23 (primitive root)
    const resPrim = encrypt('6,15', '23,5', { instrument: true })
    expect(resPrim.steps[0].note).toMatch(/valid primitive root/i)
    expect(resPrim.steps[0].table?.find((r) => r.key === 'Primitive Root Status')?.value).toContain('Primitive root')

    // g=2, p=23 (non-primitive root)
    const resNonPrim = encrypt('6,15', '23,2', { instrument: true })
    expect(resNonPrim.steps[0].note).toMatch(/NOT a primitive root/i)
    expect(resNonPrim.steps[0].table?.find((r) => r.key === 'Primitive Root Status')?.value).toContain('Non-primitive root')
  })

  it('passes standard test vectors (alice public key computation)', () => {
    // Vector 2: a=6, p=23, g=5 -> Public key A=8
    const vector = TEST_VECTORS[1]
    const result = encrypt(vector.input, vector.key)
    expect(result.output).toBe(vector.expected)
  })

  it('handles instrumented mode correctly with paint analogy', () => {
    const result = encrypt('6,15', '23,5', { instrument: true })
    expect(result.steps.length).toBe(10) // 10 steps total
    expect(result.steps[1].label).toContain('Paint Mixing')
    expect(result.output).toBe('2')
  })

  it('throws on private key secrets out of range [2, p-2]', () => {
    expect(() => encrypt('1,15', '23,5')).toThrow(/must be in range/)
    expect(() => encrypt('22,15', '23,5')).toThrow(/must be in range/)
    expect(() => encrypt('6,1', '23,5')).toThrow(/must be in range/)
    expect(() => encrypt('6,22', '23,5')).toThrow(/must be in range/)
  })

  it('throws on decrypt as DH is key exchange only', () => {
    expect(() => decrypt('2')).toThrow(/does not support decryption/)
  })

  it('real mode performs a genuine ECDH P-256 key exchange', () => {
    const res = encrypt('alice_secret_seed', '', { mode: 'real', instrument: true })
    expect(res.metadata.name).toBe('ECDH P-256')
    expect(res.metadata.keySize).toBe(256)
    // Shared secret is the 32-byte x-coordinate -> 64 hex chars.
    expect(res.output).toMatch(/^[0-9a-f]{64}$/)
    expect(res.steps.length).toBe(1)
    expect(res.steps[0].note).toMatch(/Elliptic Curve Diffie-Hellman/)
    // Both parties' public keys are shown, proving a real exchange took place.
    expect(res.steps[0].table).toHaveLength(2)
  })

  it('real mode yields a valid shared secret for any seed input', () => {
    const res = encrypt('6,15', '', { mode: 'real' })
    expect(res.output).toMatch(/^[0-9a-f]{64}$/)
    expect(res.outputEncoding).toBe('hex')
  })
})
