import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, gcmEncryptRaw } from '../../../lib/cipher/symmetric/aes-gcm'
import { CipherError } from '../../../lib/utils/errors'
import { toByteArray, fromByteArray } from '../../../lib/utils/encoding'

const hex = (s: string) => toByteArray(s, 'hex')

// NIST SP 800-38D / McGrew-Viega "The Galois/Counter Mode of Operation (GCM)"
// standard test vectors. All use a 96-bit IV.
const VECTORS = [
  {
    name: 'Test Case 1 — AES-128, empty plaintext',
    key: '00000000000000000000000000000000',
    iv: '000000000000000000000000',
    aad: '',
    plaintext: '',
    ciphertext: '',
    tag: '58e2fccefa7e3061367f1d57a4e7455a',
  },
  {
    name: 'Test Case 2 — AES-128, single zero block',
    key: '00000000000000000000000000000000',
    iv: '000000000000000000000000',
    aad: '',
    plaintext: '00000000000000000000000000000000',
    ciphertext: '0388dace60b6a392f328c2b971b2fe78',
    tag: 'ab6e47d42cec13bdf53a67b21257bddf',
  },
  {
    name: 'Test Case 3 — AES-128, 4 blocks',
    key: 'feffe9928665731c6d6a8f9467308308',
    iv: 'cafebabefacedbaddecaf888',
    aad: '',
    plaintext:
      'd9313225f88406e5a55909c5aff5269a86a7a9531534f7da2e4c303d8a318a721c3c0c95956809532fcf0e2449a6b525b16aedf5aa0de657ba637b391aafd255',
    ciphertext:
      '42831ec2217774244b7221b784d0d49ce3aa212f2c02a4e035c17e2329aca12e21d514b25466931c7d8f6a5aac84aa051ba30b396a0aac973d58e091473f5985',
    tag: '4d5c2af327cd64a62cf35abd2ba6fab4',
  },
  {
    name: 'Test Case 4 — AES-128, AAD + truncated final block',
    key: 'feffe9928665731c6d6a8f9467308308',
    iv: 'cafebabefacedbaddecaf888',
    aad: 'feedfacedeadbeeffeedfacedeadbeefabaddad2',
    plaintext:
      'd9313225f88406e5a55909c5aff5269a86a7a9531534f7da2e4c303d8a318a721c3c0c95956809532fcf0e2449a6b525b16aedf5aa0de657ba637b39',
    ciphertext:
      '42831ec2217774244b7221b784d0d49ce3aa212f2c02a4e035c17e2329aca12e21d514b25466931c7d8f6a5aac84aa051ba30b396a0aac973d58e091',
    tag: '5bc94fbc3221a5db94fae95ae7121a47',
  },
  {
    name: 'Test Case 14 — AES-256, single zero block',
    key: '0000000000000000000000000000000000000000000000000000000000000000',
    iv: '000000000000000000000000',
    aad: '',
    plaintext: '00000000000000000000000000000000',
    ciphertext: 'cea7403d4d606b6e074ec5d3baf39d18',
    tag: 'd0d1c8a799996bf0265b98b5d48ab919',
  },
]

describe('AES-GCM', () => {
  describe('NIST GCM test vectors (reference gcmEncryptRaw)', () => {
    for (const v of VECTORS) {
      it(v.name, () => {
        const { ciphertext, tag } = gcmEncryptRaw(hex(v.key), hex(v.iv), hex(v.plaintext), hex(v.aad))
        expect(fromByteArray(ciphertext, 'hex')).toBe(v.ciphertext)
        expect(fromByteArray(tag, 'hex')).toBe(v.tag)
      })
    }
  })

  describe('WebCrypto real-mode matches the reference implementation', () => {
    it('produces the NIST ciphertext + tag for Test Case 3', async () => {
      const v = VECTORS[2]
      // Feed the raw plaintext bytes via hex encoding (the vector is binary,
      // not valid UTF-8).
      const res = await encrypt(v.plaintext, v.key, {
        iv: v.iv,
        encoding: 'hex',
      })
      // encrypt() prepends the IV: iv ‖ ciphertext ‖ tag.
      expect(res.output).toBe(v.iv + v.ciphertext + v.tag)
    })
  })

  describe('encrypt → decrypt round-trip', () => {
    it('recovers the original UTF-8 plaintext', async () => {
      const key = '000102030405060708090a0b0c0d0e0f'
      const message = 'Integrity + confidentiality!'
      const enc = await encrypt(message, key)
      const dec = await decrypt(enc.output, key)
      expect(dec.output).toBe(message)
    })

    it('round-trips an AES-256 key', async () => {
      const key = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'
      const enc = await encrypt('longer secret payload for GCM', key)
      const dec = await decrypt(enc.output, key)
      expect(dec.output).toBe('longer secret payload for GCM')
    })
  })

  describe('tamper detection (integrity vs. confidentiality)', () => {
    it('rejects a message whose ciphertext byte was flipped', async () => {
      const key = '000102030405060708090a0b0c0d0e0f'
      const enc = await encrypt('Transfer $100 to Alice', key)
      // Flip one bit in the first ciphertext byte (just after the 12-byte IV).
      const bytes = enc.output.match(/.{2}/g) as string[]
      const ivPairs = 12
      bytes[ivPairs] = ((parseInt(bytes[ivPairs], 16) ^ 0x01) & 0xff).toString(16).padStart(2, '0')
      const tampered = bytes.join('')

      await expect(decrypt(tampered, key)).rejects.toThrow(CipherError)
      await expect(decrypt(tampered, key)).rejects.toThrow(/authentication failed/i)
    })

    it('rejects a message whose tag was flipped', async () => {
      const key = '000102030405060708090a0b0c0d0e0f'
      const enc = await encrypt('Transfer $100 to Alice', key)
      const bytes = enc.output.match(/.{2}/g) as string[]
      const last = bytes.length - 1
      bytes[last] = ((parseInt(bytes[last], 16) ^ 0x80) & 0xff).toString(16).padStart(2, '0')
      await expect(decrypt(bytes.join(''), key)).rejects.toThrow(/authentication failed/i)
    })
  })

  describe('instrumentation', () => {
    it('emits distinct CTR and GHASH steps', async () => {
      const res = await encrypt('two blocks worth of plaintext data!!', '000102030405060708090a0b0c0d0e0f', {
        instrument: true,
      })
      const labels = res.steps.map((s) => s.label)
      expect(labels).toContain('GCM Setup — Hash Subkey H')
      expect(labels.some((l) => l.includes('CTR Keystream'))).toBe(true)
      expect(labels.some((l) => l.includes('CTR Encrypt'))).toBe(true)
      expect(labels.some((l) => l.includes('GHASH'))).toBe(true)
      expect(labels.some((l) => l.includes('Authentication Tag'))).toBe(true)
    })

    it('does not emit steps when instrumentation is off', async () => {
      const res = await encrypt('hello', '000102030405060708090a0b0c0d0e0f')
      expect(res.steps).toHaveLength(0)
    })
  })

  describe('validation', () => {
    it('rejects an invalid key length', async () => {
      await expect(encrypt('hi', 'tooshort')).rejects.toThrow(/16, 24, or 32 bytes/)
    })

    it('rejects a non-96-bit IV', async () => {
      await expect(encrypt('hi', '000102030405060708090a0b0c0d0e0f', { iv: 'abcd' })).rejects.toThrow(/24 hex/)
    })

    it('rejects ciphertext shorter than IV + tag', async () => {
      await expect(decrypt('00', '000102030405060708090a0b0c0d0e0f')).rejects.toThrow(/too short/)
    })
  })
})
