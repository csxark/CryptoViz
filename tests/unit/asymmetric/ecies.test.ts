import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/asymmetric/ecies'
import { x25519 } from '@noble/curves/ed25519.js'

function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}

describe('ECIES (X25519)', () => {
  const recipientPriv = x25519.utils.randomSecretKey()
  const recipientPub = x25519.getPublicKey(recipientPriv)
  const recipientPrivHex = bytesToHex(recipientPriv)
  const recipientPubHex = bytesToHex(recipientPub)

  it('round-trips an arbitrary-length message', async () => {
    const message = 'This message is longer than a single AES block on purpose.'
    const ciphertext = (await encrypt(message, recipientPubHex)).output
    const decrypted = (await decrypt(ciphertext, recipientPrivHex)).output
    expect(decrypted).toBe(message)
  })

  it('produces a different ephemeral key (and ciphertext) each time', async () => {
    const a = (await encrypt('same message', recipientPubHex)).output
    const b = (await encrypt('same message', recipientPubHex)).output
    expect(a).not.toBe(b)
  })

  it('fails to decrypt with the wrong private key', async () => {
    const wrongPriv = bytesToHex(x25519.utils.randomSecretKey())
    const ciphertext = (await encrypt('secret', recipientPubHex)).output
    await expect(decrypt(ciphertext, wrongPriv)).rejects.toThrow(/ECIES decryption failed/)
  })

  it('fails to decrypt a tampered ciphertext', async () => {
    const ciphertext = (await encrypt('secret', recipientPubHex)).output
    const tampered = ciphertext.slice(0, -2) + (ciphertext.slice(-2) === '00' ? '01' : '00')
    await expect(decrypt(tampered, recipientPrivHex)).rejects.toThrow(/ECIES decryption failed/)
  })
})
