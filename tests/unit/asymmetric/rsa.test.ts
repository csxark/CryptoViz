import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/asymmetric/rsa'

// Demo-mode encrypt/decrypt are synchronous, but real mode (WebCrypto RSA-OAEP)
// is async, so encrypt/decrypt now return CipherResult | Promise<CipherResult>.
// Awaiting works for both the sync and async paths.

describe('RSA Asymmetric Cipher Unit Tests', () => {
  it('passes standard test vectors (encrypt)', async () => {
    // Vector 1: M=65, key=3233,17 -> C=2790
    const vector = TEST_VECTORS[0]
    const result = await encrypt(vector.input, vector.key)
    expect(result.output).toBe(vector.expected)
  })

  it('passes standard test vectors (decrypt)', async () => {
    // Vector 2: C=2790, key=3233,2753 -> M=65
    const vector = TEST_VECTORS[1]
    const result = await decrypt(vector.input, vector.key)
    expect(result.output).toBe(vector.expected)
  })

  it('supports explicit inputEncoding option (integer vs text vs hex)', async () => {
    // Explicit integer mode
    const intRes = await encrypt('65', '3233,17', { inputEncoding: 'integer' })
    expect(intRes.output).toBe('2790')

    // Explicit text mode
    const textRes = await encrypt('A', '3233,17', { inputEncoding: 'text' })
    expect(textRes.output).toBe('2790') // 'A'.charCodeAt(0) === 65

    // Explicit hex mode
    const hexRes = await encrypt('41', '3233,17', { inputEncoding: 'hex' })
    expect(hexRes.output).toBe('2790') // 0x41 === 65
  })

  it('round-trips an integer-mode message >= 128 (#1278)', async () => {
    // The old decrypt heuristic byte-decoded any single block >= 128, so 200
    // came back as the replacement char instead of "200".
    const enc = await encrypt('200', '3233,17', { inputEncoding: 'integer' })
    const dec = await decrypt(enc.output, '3233,2753', { inputEncoding: 'integer' })
    expect(dec.output).toBe('200')
  })

  it('handles instrumented mode correctly for encryption and decryption', async () => {
    const encResult = await encrypt('65', '3233,17', { instrument: true })
    expect(encResult.steps.length).toBeGreaterThan(0)
    expect(encResult.output).toBe('2790')

    const decResult = await decrypt('2790', '3233,2753', { instrument: true })
    expect(decResult.steps.length).toBeGreaterThan(0)
    expect(decResult.output).toBe('65')
  })

  it('throws on input value larger than or equal to modulus', () => {
    expect(() => encrypt('3234', '3233,17', { inputEncoding: 'integer' })).toThrow(/0 <= m < n|is >= modulus/)
    expect(() => decrypt('3234', '3233,2753')).toThrow(/is >= modulus n/)
  })

  it('real mode performs a genuine RSA-OAEP encrypt/decrypt round-trip (WebCrypto)', async () => {
    const msg = 'Hello World'
    const enc = await encrypt(msg, '', { mode: 'real', instrument: true })
    // A 2048-bit RSA ciphertext is 256 bytes -> 512 hex chars.
    expect(enc.output).toMatch(/^[0-9a-f]{512}$/)
    expect(enc.outputEncoding).toBe('hex')
    expect(enc.metadata.keySize).toBe(2048)

    const dec = await decrypt(enc.output, '', { mode: 'real', instrument: true })
    expect(dec.output).toBe(msg)
    expect(dec.metadata.keySize).toBe(2048)
  })

  it('real mode uses randomised OAEP padding (ciphertexts differ, both decrypt)', async () => {
    const msg = 'same message'
    const a = await encrypt(msg, '', { mode: 'real' })
    const b = await encrypt(msg, '', { mode: 'real' })
    expect(a.output).not.toBe(b.output)
    expect((await decrypt(a.output, '', { mode: 'real' })).output).toBe(msg)
    expect((await decrypt(b.output, '', { mode: 'real' })).output).toBe(msg)
  })

  it('real mode rejects plaintext larger than the OAEP limit', async () => {
    const tooLong = 'x'.repeat(191)
    await expect(encrypt(tooLong, '', { mode: 'real' })).rejects.toThrow(/at most 190 bytes/)
  })

  it('real mode rejects a tampered / foreign ciphertext', async () => {
    await expect(decrypt('00'.repeat(256), '', { mode: 'real' })).rejects.toThrow(/decryption failed/i)
  })

  it('throws on missing parameters or invalid key formats', () => {
    expect(() => encrypt('65', 'abc')).toThrow(/Invalid RSA key format/)
    expect(() => decrypt('2790', '3233')).toThrow(/Invalid RSA key format/)
  })

  it('rejects composite p in the 3-value demo key format', () => {
    expect(() => encrypt('65', '15,53,17')).toThrow(/p and q must be prime/i)
  })

  it('rejects composite q in the 3-value demo key format', () => {
    expect(() => encrypt('65', '61,21,17')).toThrow(/p and q must be prime/i)
  })

  it('derives n, d from p,q,e for encrypt/decrypt (3-value key format)', async () => {
    const encResult = await encrypt('65', '61,53,17')
    expect(encResult.output).toBe('2790')
    const decResult = await decrypt('2790', '61,53,17')
    expect(decResult.output).toBe('65')
  })

  it('asserts strict round-trip decrypt(encrypt(m, pub), priv) === m across various inputs', async () => {
    const pubKey = '3233,17'
    const privKey = '3233,2753'
    const testMessages = ['10', '65', '100', '255', '1000']
    for (const msg of testMessages) {
      const encrypted = await encrypt(msg, pubKey, { inputEncoding: 'integer' })
      const decrypted = await decrypt(encrypted.output, privKey, { inputEncoding: 'integer' })
      expect(decrypted.output).toBe(msg)
    }
  })
})
