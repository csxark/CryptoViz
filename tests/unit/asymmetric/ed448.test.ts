import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/asymmetric/ed448'

describe('Ed448', () => {
  const privKey = '01'.repeat(57)
  const message = 'ECSoC26 ed448 test'

  it('signs and verifies a round trip', () => {
    const signed = encrypt(message, privKey, { instrument: true })
    const pubKeyHex = signed.steps.find((s) => s.label.includes('Public key'))!.outputState
    const verified = decrypt(message, `${pubKeyHex}|${signed.output}`)
    expect(verified.output).toBe(message)
  })

  it('is deterministic', () => {
    expect(encrypt(message, privKey).output).toBe(encrypt(message, privKey).output)
  })

  it('rejects a tampered message', () => {
    const signed = encrypt(message, privKey, { instrument: true })
    const pubKeyHex = signed.steps.find((s) => s.label.includes('Public key'))!.outputState
    expect(() => decrypt(message + '!', `${pubKeyHex}|${signed.output}`)).toThrow(/VERIFICATION_FAILED/)
  })

  it('rejects a tampered signature', () => {
    const signed = encrypt(message, privKey, { instrument: true })
    const pubKeyHex = signed.steps.find((s) => s.label.includes('Public key'))!.outputState
    const tampered = signed.output.slice(0, -2) + (signed.output.slice(-2) === '00' ? '01' : '00')
    expect(() => decrypt(message, `${pubKeyHex}|${tampered}`)).toThrow(/VERIFICATION_FAILED/)
  })

  it('generates a key when none is supplied', () => {
    const signed = encrypt(message, '', { instrument: true })
    expect(signed.steps.some((s) => s.label === 'Key generation')).toBe(true)
  })
})
