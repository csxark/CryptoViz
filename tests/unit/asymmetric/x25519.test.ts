import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/asymmetric/x25519'
import { CipherError } from '@/lib/utils/errors'
import { x25519 } from '@noble/curves/ed25519.js'

describe('X25519 Key Exchange', () => {
  it('matches the locally-verified test vector', () => {
    for (const v of TEST_VECTORS) {
      expect(encrypt(v.input, v.key).output).toBe(v.expected)
    }
  })

  it('demonstrates DH commutativity between two generated parties', () => {
    const alicePriv = x25519.utils.randomSecretKey()
    const bobPriv = x25519.utils.randomSecretKey()
    const alicePub = Buffer.from(x25519.getPublicKey(alicePriv)).toString('hex')
    const bobPub = Buffer.from(x25519.getPublicKey(bobPriv)).toString('hex')
    const aliceKeyHex = Buffer.from(alicePriv).toString('hex')
    const bobKeyHex = Buffer.from(bobPriv).toString('hex')

    const fromAlice = encrypt(bobPub, aliceKeyHex).output
    const fromBob = decrypt(alicePub, bobKeyHex).output
    expect(fromAlice).toBe(fromBob)
  })

  it('throws INPUT_REQUIRED when peer public key is missing', () => {
    try {
      encrypt('', 'a'.repeat(64))
      expect.unreachable()
    } catch (e) {
      expect((e as CipherError).code).toBe('INPUT_REQUIRED')
    }
  })

  it('throws INVALID_KEY for a key that is not 32 bytes', () => {
    try {
      encrypt('a'.repeat(64), 'abcd')
      expect.unreachable()
    } catch (e) {
      expect((e as CipherError).code).toBe('INVALID_KEY')
    }
  })

  it('produces instrumented steps when requested', () => {
    const result = encrypt(TEST_VECTORS[0].input, TEST_VECTORS[0].key, { instrument: true })
    expect(result.steps.length).toBeGreaterThan(0)
  })
})
