/**
 * Cryptographic Negative Security Testing Gate (Phase 8)
 *
 * Strict adversarial and negative verification:
 * - AEAD (AES-GCM & ChaCha20-Poly1305):
 *     * Modified ciphertext must strictly reject
 *     * Modified authentication tag must strictly reject
 *     * Modified Additional Authenticated Data (AAD) must strictly reject
 *     * Wrong decryption key must strictly reject
 *     * Wrong nonce/IV must strictly reject
 *     * Authentication failures must NEVER be interpreted as successful decryption.
 * - Block Ciphers:
 *     * Invalid key size rejected
 *     * Malformed hex input rejected
 *     * Invalid IV size rejected
 *     * Truncated/corrupted ciphertext rejected
 * - Asymmetric / Signatures:
 *     * Corrupted signature strictly rejected
 *     * Invalid private key length rejected
 */

import { describe, it, expect } from 'vitest'
import { ed25519 } from '@noble/curves/ed25519.js'
import * as aesEngine from '../../lib/cipher/symmetric/aes'
import * as aesGcmEngine from '../../lib/cipher/symmetric/aes-gcm'
import * as chachaPolyEngine from '../../lib/cipher/symmetric/chacha20-poly1305'
import * as ed25519Engine from '../../lib/cipher/asymmetric/ed25519'
import { toByteArray, fromByteArray } from '../../lib/utils/encoding'

describe('Negative Security & Adversarial Integrity Gate (Phase 8)', () => {
  describe('AEAD Integrity: AES-GCM Tamper Rejection (SP 800-38D)', () => {
    const validKey = '000102030405060708090a0b0c0d0e0f' // 128-bit key
    const validIv = '000000000000000000000000' // 96-bit IV
    const plaintext = 'Confidential and Authenticated Payload'
    const validAadHex = '686561646572' // hex of 'header'

    it('successfully encrypts valid plaintext and generates valid ciphertext + tag', async () => {
      const enc = await aesGcmEngine.encrypt(plaintext, validKey, {
        iv: validIv,
        aad: validAadHex,
      })
      expect(enc.output).toBeTruthy()

      const dec = await aesGcmEngine.decrypt(enc.output, validKey, {
        iv: validIv,
        aad: validAadHex,
      })
      expect(dec.output).toBe(plaintext)
    })

    it('strictly REJECTS modified ciphertext (bit flip) and never returns plaintext', async () => {
      const enc = await aesGcmEngine.encrypt(plaintext, validKey, {
        iv: validIv,
        aad: validAadHex,
      })

      // Tamper ciphertext
      let tamperedOutput: string
      if (enc.output.includes(':')) {
        const [ct, tag] = enc.output.split(':')
        const flippedChar = ct[0] === 'a' ? 'b' : 'a'
        tamperedOutput = `${flippedChar}${ct.slice(1)}:${tag}`
      } else {
        const flippedChar = enc.output[0] === 'a' ? 'b' : 'a'
        tamperedOutput = `${flippedChar}${enc.output.slice(1)}`
      }

      await expect(
        aesGcmEngine.decrypt(tamperedOutput, validKey, {
          iv: validIv,
          aad: validAadHex,
        })
      ).rejects.toThrow()
    })

    it('strictly REJECTS modified authentication tag', async () => {
      const enc = await aesGcmEngine.encrypt(plaintext, validKey, {
        iv: validIv,
        aad: validAadHex,
      })

      let tamperedTag: string
      if (enc.output.includes(':')) {
        const [ct, tag] = enc.output.split(':')
        const flipped = tag[0] === '0' ? '1' : '0'
        tamperedTag = `${ct}:${flipped}${tag.slice(1)}`
      } else {
        // Tag is at the end (last 32 hex chars)
        const ctPart = enc.output.slice(0, -32)
        const tagPart = enc.output.slice(-32)
        const flipped = tagPart[0] === '0' ? '1' : '0'
        tamperedTag = `${ctPart}${flipped}${tagPart.slice(1)}`
      }

      await expect(
        aesGcmEngine.decrypt(tamperedTag, validKey, {
          iv: validIv,
          aad: validAadHex,
        })
      ).rejects.toThrow()
    })

    it('strictly REJECTS altered Additional Authenticated Data (AAD)', async () => {
      const enc = await aesGcmEngine.encrypt(plaintext, validKey, {
        iv: validIv,
        aad: validAadHex,
      })

      // Altered hex AAD
      const tamperedAadHex = '686561646573' // one bit flipped

      await expect(
        aesGcmEngine.decrypt(enc.output, validKey, {
          iv: validIv,
          aad: tamperedAadHex,
        })
      ).rejects.toThrow()
    })

    it('strictly REJECTS decryption with wrong key', async () => {
      const enc = await aesGcmEngine.encrypt(plaintext, validKey, {
        iv: validIv,
        aad: validAadHex,
      })

      const wrongKey = 'ffffffffffffffffffffffffffffffff'
      await expect(
        aesGcmEngine.decrypt(enc.output, wrongKey, {
          iv: validIv,
          aad: validAadHex,
        })
      ).rejects.toThrow()
    })

    it('strictly REJECTS decryption with wrong nonce/IV', async () => {
      const enc = await aesGcmEngine.encrypt(plaintext, validKey, {
        iv: validIv,
        aad: validAadHex,
      })

      const wrongIv = 'ffffffffffffffffffffffff'
      await expect(
        aesGcmEngine.decrypt(enc.output, validKey, {
          iv: wrongIv,
          aad: validAadHex,
        })
      ).rejects.toThrow()
    })
  })

  describe('AEAD Integrity: ChaCha20-Poly1305 Tamper Rejection (RFC 7539 / RFC 8439)', () => {
    const keyHex = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f' // 256-bit
    const nonceHex = '000000000000000000000000' // 96-bit (24 hex chars)
    const aadHex = '686561646572'
    const compositeKey = `${keyHex}|${nonceHex}|${aadHex}`
    const ptHex = '43686143686132302d506f6c793133303520414541442054657374204d657373616765' // hex of 'ChaCha20-Poly1305 AEAD Test Message'

    it('successfully encrypts and decrypts with valid key, nonce, and AAD', () => {
      const enc = chachaPolyEngine.encrypt(ptHex, compositeKey)
      expect(enc.output).toBeTruthy()

      const dec = chachaPolyEngine.decrypt(enc.output, compositeKey)
      expect(dec.output).toBe(ptHex)
    })

    it('strictly rejects modified ciphertext or tag for ChaCha20-Poly1305', () => {
      const enc = chachaPolyEngine.encrypt(ptHex, compositeKey)
      expect(enc.output).toBeTruthy()

      // Flip first character
      const flipped = enc.output[0] === 'a' ? 'b' : 'a'
      const corrupted = `${flipped}${enc.output.slice(1)}`

      expect(() =>
        chachaPolyEngine.decrypt(corrupted, compositeKey)
      ).toThrow()
    })

    it('strictly rejects modified AAD for ChaCha20-Poly1305', () => {
      const enc = chachaPolyEngine.encrypt(ptHex, compositeKey)

      const tamperedKey = `${keyHex}|${nonceHex}|686561646573`
      expect(() =>
        chachaPolyEngine.decrypt(enc.output, tamperedKey)
      ).toThrow()
    })

    it('strictly rejects decryption with wrong key for ChaCha20-Poly1305', () => {
      const enc = chachaPolyEngine.encrypt(ptHex, compositeKey)

      const wrongKey = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      expect(() =>
        chachaPolyEngine.decrypt(enc.output, `${wrongKey}|${nonceHex}|${aadHex}`)
      ).toThrow()
    })
  })

  describe('Block Ciphers: Key & Input Validation Negative Tests', () => {
    it('AES rejects invalid key length (not 128, 192, or 256 bits)', () => {
      const invalidKey = '0123456789abcdef' // Only 8 bytes (16 hex chars)
      expect(() =>
        aesEngine.encrypt('Hello World', invalidKey, { encoding: 'hex' })
      ).toThrow()
    })

    it('AES rejects malformed non-hex key when hex expected', () => {
      const malformedKey = '000102030405060708090a0b0c0d0eZZ' // Non-hex ZZ
      expect(() =>
        aesEngine.encrypt('Hello World', malformedKey, { encoding: 'hex' })
      ).toThrow()
    })

    it('AES rejects CBC mode encryption when IV is required but invalid length', () => {
      const validKey = '000102030405060708090a0b0c0d0e0f'
      // Invalid IV length in CBC mode
      expect(() =>
        aesEngine.encrypt('Hello World', validKey, { mode: 'CBC', iv: '0102' })
      ).toThrow()
    })

    it('AES-CBC rejects corrupted ciphertext with invalid padding', () => {
      const validKey = '000102030405060708090a0b0c0d0e0f'
      const validIv = '00000000000000000000000000000000'
      const enc = aesEngine.encrypt('Test message for padding verification', validKey, {
        mode: 'CBC',
        iv: validIv,
      })

      // Corrupt the last block of ciphertext
      const rawCt = enc.output
      const flipped = rawCt[rawCt.length - 1] === '0' ? '1' : '0'
      const corruptedCt = rawCt.slice(0, -1) + flipped

      expect(() =>
        aesEngine.decrypt(corruptedCt, validKey, { mode: 'CBC', iv: validIv })
      ).toThrow()
    })
  })

  describe('Digital Signatures: Ed25519 Negative Verification (RFC 8032)', () => {
    const validPrivKey = '4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb'
    const skBytes = toByteArray(validPrivKey, 'hex')
    const pubKeyHex = fromByteArray(ed25519.getPublicKey(skBytes), 'hex')
    const message = 'Important Document To Be Signed'

    it('rejects invalid private key length (must be 32 bytes / 64 hex)', () => {
      const shortKey = '0123456789abcdef' // Only 8 bytes
      expect(() =>
        ed25519Engine.encrypt(message, shortKey)
      ).toThrow()
    })

    it('rejects corrupted signature during verification', () => {
      const signRes = ed25519Engine.encrypt(message, validPrivKey)
      const sigHex = signRes.output

      // Flip first hex char of signature
      const flipped = sigHex[0] === 'a' ? 'b' : 'a'
      const corruptedSig = `${flipped}${sigHex.slice(1)}`

      // Verify should return 'invalid'
      const verifyRes = ed25519Engine.decrypt(message, `${corruptedSig},${pubKeyHex}`)
      expect(verifyRes.output).toBe('invalid')
    })

    it('rejects signature verified against wrong message', () => {
      const signRes = ed25519Engine.encrypt(message, validPrivKey)
      const sigHex = signRes.output

      const verifyRes = ed25519Engine.decrypt('Altered Message Content', `${sigHex},${pubKeyHex}`)
      expect(verifyRes.output).toBe('invalid')
    })
  })

  describe('Post-Quantum Cryptography Negative Verification', () => {
    it('ML-DSA-65 strictly rejects tampered message and forged signature', async () => {
      const { generateKeypair, encrypt: dsaSign, decrypt: dsaVerify } = await import('../../lib/cipher/asymmetric/ml-dsa')
      const { publicKey, privateKey } = generateKeypair()
      const message = 'Authenticated Treaty Draft'
      const sig = dsaSign(message, privateKey).output

      // Tampered message
      expect(() => dsaVerify('Altered Treaty Draft', `${publicKey}|${sig}`)).toThrow(/VERIFICATION_FAILED/)

      // Corrupted signature
      const corruptedSig = (sig[0] === 'a' ? 'b' : 'a') + sig.slice(1)
      expect(() => dsaVerify(message, `${publicKey}|${corruptedSig}`)).toThrow(/VERIFICATION_FAILED/)
    })

    it('SPHINCS+ (SLH-DSA) strictly rejects altered message', async () => {
      const { generate, sign: slhSign, verify: slhVerify } = await import('../../lib/cipher/asymmetric/sphincs-plus')
      const { publicKey, privateKey } = generate({ paramSet: '128s' })
      const message = 'Critical Nuclear Directive'
      const sig = slhSign(message, privateKey, { paramSet: '128s' })

      expect(slhVerify('Modified Nuclear Directive', publicKey, sig, { paramSet: '128s' })).toBe(false)
    })
  })

  describe('Standard Block Ciphers Negative Testing', () => {
    it('SM4 strictly rejects invalid key lengths (must be 128-bit / 32 hex chars)', async () => {
      const { encrypt: sm4Encrypt } = await import('../../lib/cipher/symmetric/sm4')
      expect(() => sm4Encrypt('00112233445566778899aabbccddeeff', '0123456789abcdef')).toThrow(/INVALID_KEY_LENGTH|128-bit/i)
    })

    it('Camellia strictly rejects malformed key lengths', async () => {
      const { encrypt: camelliaEncrypt } = await import('../../lib/cipher/symmetric/camellia')
      const invalidKey = toByteArray('012345', 'hex')
      const pt = toByteArray('0123456789abcdeffedcba9876543210', 'hex')
      expect(() => camelliaEncrypt(pt, invalidKey, { mode: 'ECB', padding: 'None' })).toThrow()
    })

    it('ARIA strictly rejects invalid key lengths', async () => {
      const { encrypt: ariaEncrypt } = await import('../../lib/cipher/symmetric/aria')
      expect(() => ariaEncrypt('00112233445566778899aabbccddeeff', '0123456789')).toThrow()
    })
  })

  describe('Key Agreement Negative Testing (RFC 7748)', () => {
    it('X25519 strictly rejects malformed public key (not 32 bytes)', async () => {
      const { encrypt: x25519Agree } = await import('../../lib/cipher/asymmetric/x25519')
      const invalidPub = '0e6db6' // Too short
      const validPriv = '0a546e36bf0527c9d3b16154b82465edd62144c0ac1fc5a18506a2244ba449ac'
      expect(() => x25519Agree(invalidPub, validPriv)).toThrow()
    })
  })
})
