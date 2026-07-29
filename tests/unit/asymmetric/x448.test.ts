import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/asymmetric/x448'

describe('X448 (Curve448 Diffie-Hellman)', () => {
  it('both parties derive the same shared secret', () => {
    const alicePriv = encrypt('', '', { instrument: true })
    const aliceSk = alicePriv.steps[0].outputState
    const alicePub = alicePriv.output

    const bobPriv = encrypt('', '', { instrument: true })
    const bobSk = bobPriv.steps[0].outputState
    const bobPub = bobPriv.output

    const aliceShared = decrypt(`${aliceSk}|${bobPub}`, '')
    const bobShared = decrypt(`${bobSk}|${alicePub}`, '')
    expect(aliceShared.output).toBe(bobShared.output)
  })

  it('rejects a key of the wrong length (e.g. an X25519 key)', () => {
    const x25519Key = '0'.repeat(64) // 32 bytes, wrong for X448
    expect(() => encrypt('', x25519Key)).toThrow(/56 bytes/)
  })

  it('generates a key when none is supplied', () => {
    const result = encrypt('', '', { instrument: true })
    expect(result.steps.some((s) => s.label === 'Key generation')).toBe(true)
  })
})
