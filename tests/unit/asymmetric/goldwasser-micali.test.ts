import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS, parsePublicKey, parsePrivateKey } from '../../../lib/cipher/asymmetric/goldwasser-micali'
import { CipherError } from '../../../lib/utils/errors'

describe('Goldwasser-Micali', () => {
  it('exports valid test vectors that match expected output', () => {
    expect(TEST_VECTORS.length).toBeGreaterThan(1)
    const encVec = TEST_VECTORS[0]
    expect(encrypt(encVec.input, encVec.key).output).toBe(encVec.expected)

    const decVec = TEST_VECTORS[1]
    expect(decrypt(decVec.input, decVec.key).output).toBe(decVec.expected)
  })

  it('round trips bit-by-bit with default demo key', () => {
    const pt = 'a5' // 10100101
    const ct = encrypt(pt, 'mock')
    expect(decrypt(ct.output, 'mock').output).toBe(pt)
  })

  it('respects caller-provided public key (n, x) and private key (p, q)', () => {
    // Custom primes p=13, q=17 -> n=221
    // x=3: 3 mod 13 is non-residue (3^6 = 729 = 1n mod 13? 3^6 = 1 mod 13 -> residue mod 13)
    // For p=13, q=17 -> n=221.
    // Non-residues mod 13: 2, 5, 6, 7, 8, 11
    // Non-residues mod 17: 3, 5, 6, 7, 10, 11, 12, 14
    // Choose x=5: 5 mod 13 (5^6 = 15625 = 12 = -1 mod 13), 5 mod 17 (5^8 = 390625 = 16 = -1 mod 17)
    // Jacobi(5, 221) = (-1)*(-1) = +1.
    const customPub = '221, 5'
    const customPriv = '13, 17'

    const pt = '3c'
    const ct = encrypt(pt, customPub)
    const dec = decrypt(ct.output, customPriv)
    expect(dec.output).toBe(pt)
  })

  it('parses JSON format keys correctly', () => {
    const pubJson = JSON.stringify({ n: '253', x: '7' })
    const privJson = JSON.stringify({ p: '11', q: '23' })

    const pt = '42'
    const ct = encrypt(pt, pubJson)
    const dec = decrypt(ct.output, privJson)
    expect(dec.output).toBe(pt)
  })

  it('demonstrates probabilistic variation: encrypting same input twice yields different ciphertexts', () => {
    const pt = 'a5'
    const ct1 = encrypt(pt, '253, 7').output
    const ct2 = encrypt(pt, '253, 7').output

    expect(ct1).not.toBe(ct2)
    expect(decrypt(ct1, '11, 23').output).toBe(pt)
    expect(decrypt(ct2, '11, 23').output).toBe(pt)
  })

  it('rejects public key with Jacobi symbol != 1', () => {
    // n=253. x=2 has Jacobi(2, 253) = -1.
    expect(() => parsePublicKey('253, 2')).toThrowError(CipherError)
    try {
      encrypt('01', '253, 2')
      expect.unreachable()
    } catch (e: any) {
      expect(e).toBeInstanceOf(CipherError)
      expect(e.code).toBe('INVALID_KEY')
    }
  })

  it('rejects private key where x is a quadratic residue mod p or q', () => {
    // p=11, q=23 -> n=253. x=3 is a quadratic residue mod 11 (3^5 = 243 = 1 mod 11)
    try {
      parsePrivateKey('11, 23, 3')
      expect.unreachable()
    } catch (e: any) {
      expect(e).toBeInstanceOf(CipherError)
      expect(e.code).toBe('INVALID_KEY')
    }
  })

  it('rejects inconsistent modulus n != p * q', () => {
    try {
      parsePrivateKey('p=11, q=23, n=999')
      expect.unreachable()
    } catch (e: any) {
      expect(e).toBeInstanceOf(CipherError)
      expect(e.code).toBe('INVALID_KEY')
    }
  })

  it('metadata is populated correctly', () => {
    const result = encrypt('00', 'mock')
    expect(result.metadata.name).toBe('Goldwasser-Micali')
    expect(result.metadata.securityStatus).toBe('secure')
  })

  it('verifies strict round-trip decryption for various byte patterns', () => {
    const testPayloads = ['00', 'ff', 'a5', '3c', '42']
    for (const pt of testPayloads) {
      const ct = encrypt(pt, 'mock')
      const decrypted = decrypt(ct.output, 'mock')
      expect(decrypted.output).toBe(pt)
    }
  })
})
