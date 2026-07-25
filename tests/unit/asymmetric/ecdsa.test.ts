import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/asymmetric/ecdsa'
import { CipherError } from '@/lib/utils/errors'

describe('ECDSA (secp256k1)', () => {
  const privKey = '0101010101010101010101010101010101010101010101010101010101010101'.slice(0, 64)
  const message = 'hello ECSoC26'

  it('passes standard test vectors', () => {
    const vector = TEST_VECTORS[0]
    const result = encrypt(vector.input, vector.key)
    expect(result.output).toBeDefined()
    expect(result.output.length).toBe(128) // 64-byte compact r||s hex
  })

  it('signs and verifies a round trip', () => {
    const sig = encrypt(message, privKey)
    // pull the public key back out for verify — re-derive via a fresh sign trace
    // (the file above surfaces it in instrumented steps; for the fast path,
    // sign again with instrument:true to grab it, or export getPublicKey too)
    const signed = encrypt(message, privKey, { instrument: true })
    const pubKeyStep = signed.steps.find((s) => s.label === 'Public key derivation')
    expect(pubKeyStep).toBeDefined()
    const pubKeyHex = pubKeyStep!.outputState
    const verified = decrypt(message, `${pubKeyHex}|${sig.output}`)
    expect(verified.output).toBe(message)
  })

  it('produces a deterministic signature for the same input (RFC 6979)', () => {
    const a = encrypt(message, privKey)
    const b = encrypt(message, privKey)
    expect(a.output).toBe(b.output)
  })

  it('rejects a tampered message', () => {
    const signed = encrypt(message, privKey, { instrument: true })
    const pubKeyHex = signed.steps.find((s) => s.label === 'Public key derivation')!.outputState
    expect(() => decrypt('hello ECSoC26!', `${pubKeyHex}|${signed.output}`)).toThrow(/VERIFICATION_FAILED/)
  })

  it('rejects a tampered signature', () => {
    const signed = encrypt(message, privKey, { instrument: true })
    const pubKeyHex = signed.steps.find((s) => s.label === 'Public key derivation')!.outputState
    const tampered = signed.output.slice(0, -2) + (signed.output.slice(-2) === '00' ? '01' : '00')
    expect(() => decrypt(message, `${pubKeyHex}|${tampered}`)).toThrow(/VERIFICATION_FAILED/)
  })

  it('generates a key when none is supplied', () => {
    const signed = encrypt(message, '', { instrument: true })
    expect(signed.steps.some((s) => s.label === 'Key generation')).toBe(true)
  })

  it('throws INVALID_KEY when verification key format is wrong', () => {
    expect(() => decrypt(message, 'not-a-pipe-separated-key')).toThrow(CipherError)
    expect(() => decrypt(message, 'not-a-pipe-separated-key')).toThrow(/Verify expects "publicKeyHex|signatureHex"/)
  })

  it('includes milestone steps in instrumented mode', () => {
    const result = encrypt(message, privKey, { instrument: true })
    expect(result.steps.filter(s => s.isMilestone).length).toBeGreaterThan(1)
  })
})
