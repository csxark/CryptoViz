import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/asymmetric/schnorr'

describe('Schnorr signatures (BIP340)', () => {
  const privKey = '0303030303030303030303030303030303030303030303030303030303030303'.slice(0, 64)
  const message = 'ECSoC26 schnorr test'

  it('signs and verifies a round trip', () => {
    const signed = encrypt(message, privKey, { instrument: true })
    const pubKeyHex = signed.steps.find((s) => s.label.includes('public key'))!.outputState
    const verified = decrypt(message, `${pubKeyHex}|${signed.output}`)
    expect(verified.output).toBe(message)
  })

  it('rejects a tampered message', () => {
    const signed = encrypt(message, privKey, { instrument: true })
    const pubKeyHex = signed.steps.find((s) => s.label.includes('public key'))!.outputState
    expect(() => decrypt(message + '!', `${pubKeyHex}|${signed.output}`)).toThrow(/VERIFICATION_FAILED/)
  })

  it('rejects a tampered signature', () => {
    const signed = encrypt(message, privKey, { instrument: true })
    const pubKeyHex = signed.steps.find((s) => s.label.includes('public key'))!.outputState
    const tampered = signed.output.slice(0, -2) + (signed.output.slice(-2) === '00' ? '01' : '00')
    expect(() => decrypt(message, `${pubKeyHex}|${tampered}`)).toThrow(/VERIFICATION_FAILED/)
  })

  it('generates a key when none is supplied', () => {
    const signed = encrypt(message, '', { instrument: true })
    expect(signed.steps.some((s) => s.label === 'Key generation')).toBe(true)
  })
})
