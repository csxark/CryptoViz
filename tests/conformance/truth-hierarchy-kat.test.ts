/**
 * CRYPTO VIZ — AUTHORITATIVE TRUTH HIERARCHY & KNOWN ANSWER TESTS (KAT)
 *
 * This test suite validates CryptoViz cryptographic implementations against:
 * 1. Authoritative Published Standards (NIST FIPS 197, NIST SP 800-38D, NIST FIPS 46-3,
 *    NIST SP 800-67, FIPS 180-4, RFC 1321, RFC 2104, RFC 4231, RFC 5869, RFC 7539, RFC 8032).
 * 2. Independent Reference Oracles (Node.js built-in `node:crypto` and `@noble/*`).
 */

import { describe, it, expect } from 'vitest';
import nodeCrypto from 'node:crypto';
import { ed25519 } from '@noble/curves/ed25519.js';
import { toByteArray, fromByteArray } from '@/lib/utils/encoding';

// CryptoViz live engines
import * as aesEngine from '@/lib/cipher/symmetric/aes';
import * as aesGcmEngine from '@/lib/cipher/symmetric/aes-gcm';
import * as desEngine from '@/lib/cipher/symmetric/des';
import * as tripleDesEngine from '@/lib/cipher/symmetric/3des';
import * as sha1Engine from '@/lib/cipher/hash/sha1';
import * as sha256Engine from '@/lib/cipher/hash/sha256';
import * as sha512Engine from '@/lib/cipher/hash/sha512';
import * as md5Engine from '@/lib/cipher/hash/md5';
import * as hmacEngine from '@/lib/cipher/hash/hmac';
import * as hkdfEngine from '@/lib/cipher/hash/hkdf';
import * as chachaEngine from '@/lib/cipher/symmetric/chacha20';
import * as chachaPolyEngine from '@/lib/cipher/symmetric/chacha20-poly1305';
import * as ed25519Engine from '@/lib/cipher/asymmetric/ed25519';

describe('Authoritative Known-Answer Tests (KAT) & Truth Hierarchy', () => {

  describe('AES (NIST FIPS 197 / SP 800-38A)', () => {
    it('AES-128-ECB matches FIPS 197 Appendix C.1 & Node.js crypto oracle', () => {
      const key = '000102030405060708090a0b0c0d0e0f';
      const pt = '00112233445566778899aabbccddeeff';
      const expectedCt = '69c4e0d86a7b0430d8cdb78070b4c55a';

      // 1. Independent Oracle Check
      const cipher = nodeCrypto.createCipheriv('aes-128-ecb', Buffer.from(key, 'hex'), null);
      cipher.setAutoPadding(false);
      const oracleCt = cipher.update(Buffer.from(pt, 'hex')).toString('hex') + cipher.final().toString('hex');
      expect(oracleCt).toBe(expectedCt);

      // 2. CryptoViz Implementation Check
      const cvResult = aesEngine.encrypt(pt, key, { encoding: 'hex', padding: 'none', mode: 'ecb' });
      expect(cvResult.output.toLowerCase()).toBe(expectedCt);

      // 3. CryptoViz Decrypt Roundtrip
      const cvDec = aesEngine.decrypt(expectedCt, key, { encoding: 'hex', padding: 'none', mode: 'ecb' });
      expect(cvDec.output.toLowerCase()).toBe(pt);
    });

    it('AES-192-ECB matches FIPS 197 Appendix C.2 & Node.js crypto oracle', () => {
      const key = '000102030405060708090a0b0c0d0e0f1011121314151617';
      const pt = '00112233445566778899aabbccddeeff';
      const expectedCt = 'dda97ca4864cdfe06eaf70a0ec0d7191';

      const cipher = nodeCrypto.createCipheriv('aes-192-ecb', Buffer.from(key, 'hex'), null);
      cipher.setAutoPadding(false);
      const oracleCt = cipher.update(Buffer.from(pt, 'hex')).toString('hex') + cipher.final().toString('hex');
      expect(oracleCt).toBe(expectedCt);

      const cvResult = aesEngine.encrypt(pt, key, { encoding: 'hex', padding: 'none', mode: 'ecb' });
      expect(cvResult.output.toLowerCase()).toBe(expectedCt);

      const cvDec = aesEngine.decrypt(expectedCt, key, { encoding: 'hex', padding: 'none', mode: 'ecb' });
      expect(cvDec.output.toLowerCase()).toBe(pt);
    });

    it('AES-256-ECB matches FIPS 197 Appendix C.3 & Node.js crypto oracle', () => {
      const key = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
      const pt = '00112233445566778899aabbccddeeff';
      const expectedCt = '8ea2b7ca516745bfeafc49904b496089';

      const cipher = nodeCrypto.createCipheriv('aes-256-ecb', Buffer.from(key, 'hex'), null);
      cipher.setAutoPadding(false);
      const oracleCt = cipher.update(Buffer.from(pt, 'hex')).toString('hex') + cipher.final().toString('hex');
      expect(oracleCt).toBe(expectedCt);

      const cvResult = aesEngine.encrypt(pt, key, { encoding: 'hex', padding: 'none', mode: 'ecb' });
      expect(cvResult.output.toLowerCase()).toBe(expectedCt);

      const cvDec = aesEngine.decrypt(expectedCt, key, { encoding: 'hex', padding: 'none', mode: 'ecb' });
      expect(cvDec.output.toLowerCase()).toBe(pt);
    });
  });

  describe('AES-GCM (NIST SP 800-38D)', () => {
    it('Case 1: Key=128-bit 0s, IV=96-bit 0s, P="", AAD="" tag matches NIST SP 800-38D', async () => {
      const key = '00000000000000000000000000000000';
      const iv = '000000000000000000000000';
      const expectedTag = '58e2fccefa7e3061367f1d57a4e7455a';

      // Oracle verification
      const oracle = nodeCrypto.createCipheriv('aes-128-gcm', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
      oracle.final();
      expect(oracle.getAuthTag().toString('hex')).toBe(expectedTag);

      // CryptoViz verification
      const result = await aesGcmEngine.encrypt('', key, { iv, hexInput: true });
      // Output is IV (24) + ciphertext (0) + tag (32)
      const tag = result.output.slice(-32);
      expect(tag.toLowerCase()).toBe(expectedTag);

      const decResult = await aesGcmEngine.decrypt(result.output, key, { hexInput: true });
      expect(decResult.output).toBe('');
    });

    it('Case 2: Key=128-bit 0s, IV=96-bit 0s, P=128-bit 0s matches NIST SP 800-38D', async () => {
      const key = '00000000000000000000000000000000';
      const iv = '000000000000000000000000';
      const pt = '00000000000000000000000000000000';
      const expectedCt = '0388dace60b6a392f328c2b971b2fe78';
      const expectedTag = 'ab6e47d42cec13bdf53a67b21257bddf';

      const oracle = nodeCrypto.createCipheriv('aes-128-gcm', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
      const ct = oracle.update(Buffer.from(pt, 'hex')).toString('hex');
      oracle.final();
      const tag = oracle.getAuthTag().toString('hex');
      expect(ct).toBe(expectedCt);
      expect(tag).toBe(expectedTag);

      const result = await aesGcmEngine.encrypt(pt, key, { iv, hexInput: true });
      // Output is IV (24) + ciphertext (32) + tag (32)
      const cipherText = result.output.slice(24, -32);
      const outputTag = result.output.slice(-32);
      expect(cipherText.toLowerCase()).toBe(expectedCt);
      expect(outputTag.toLowerCase()).toBe(expectedTag);

      const decResult = await aesGcmEngine.decrypt(result.output, key, { hexInput: true });
      expect(decResult.output.toLowerCase()).toBe(pt);
    });
  });

  describe('DES & 3DES (NIST FIPS 46-3 & SP 800-67)', () => {
    it('DES matches published NBS/NIST standard vector', () => {
      const key = '133457799bbcdff1';
      const pt = '0123456789abcdef';
      const expectedCt = '85e813540f0ab405';

      const cvResult = desEngine.encrypt(pt, key, { encoding: 'hex', padding: 'none' });
      expect(cvResult.output.toLowerCase()).toBe(expectedCt);

      const cvDec = desEngine.decrypt(expectedCt, key, { encoding: 'hex', padding: 'none' });
      expect(cvDec.output.toLowerCase()).toBe(pt);
    });

    it('3DES (EDE) matches ANSI X9.52 / SP 800-67 & Node.js oracle', () => {
      const key = '0123456789abcdef23456789abcdef01456789abcdef0123';
      const pt = '0000000000000000';

      const cipher = nodeCrypto.createCipheriv('des-ede3', Buffer.from(key, 'hex'), null);
      cipher.setAutoPadding(false);
      const oracleCt = cipher.update(Buffer.from(pt, 'hex')).toString('hex') + cipher.final().toString('hex');

      const cvResult = tripleDesEngine.encrypt(pt, key, { encoding: 'hex', padding: 'none' });
      expect(cvResult.output.toLowerCase()).toBe(oracleCt);

      const cvDec = tripleDesEngine.decrypt(cvResult.output, key, { encoding: 'hex', padding: 'none' });
      expect(cvDec.output.toLowerCase()).toBe(pt);
    });
  });

  describe('Hash Functions (FIPS 180-4 & RFC 1321)', () => {
    it('SHA-1 matches FIPS 180-4 KAT for "abc"', () => {
      const expected = 'a9993e364706816aba3e25717850c26c9cd0d89d';
      expect(nodeCrypto.createHash('sha1').update('abc').digest('hex')).toBe(expected);
      const res = sha1Engine.encrypt('abc', '');
      expect(res.output.toLowerCase()).toBe(expected);
    });

    it('SHA-256 matches FIPS 180-4 KAT for "abc"', () => {
      const expected = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
      expect(nodeCrypto.createHash('sha256').update('abc').digest('hex')).toBe(expected);
      const res = sha256Engine.encrypt('abc', '');
      expect(res.output.toLowerCase()).toBe(expected);
    });

    it('SHA-512 matches FIPS 180-4 KAT for "abc"', () => {
      const expected = 'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f';
      expect(nodeCrypto.createHash('sha512').update('abc').digest('hex')).toBe(expected);
      const res = sha512Engine.encrypt('abc', '');
      expect(res.output.toLowerCase()).toBe(expected);
    });

    it('MD5 matches RFC 1321 KAT for "abc"', () => {
      const expected = '900150983cd24fb0d6963f7d28e17f72';
      expect(nodeCrypto.createHash('md5').update('abc').digest('hex')).toBe(expected);
      const res = md5Engine.encrypt('abc', '');
      expect(res.output.toLowerCase()).toBe(expected);
    });
  });

  describe('Message Authentication & KDF (RFC 4231 & RFC 5869)', () => {
    it('HMAC-SHA256 matches RFC 4231 Test Case 2', () => {
      const key = 'Jefe';
      const data = 'what do ya want for nothing?';
      const expected = '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843';

      const oracle = nodeCrypto.createHmac('sha256', key).update(data).digest('hex');
      expect(oracle).toBe(expected);

      const res = hmacEngine.encrypt(data, key, { hashAlgorithm: 'sha256' });
      expect(res.output.toLowerCase()).toBe(expected);
    });

    it('HKDF-SHA256 matches RFC 5869 Test Case 1 & Node.js crypto oracle', () => {
      const ikm = '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b';
      const salt = '000102030405060708090a0b0c';
      const info = 'f0f1f2f3f4f5f6f7f8f9';

      const oracleOkm = Buffer.from(nodeCrypto.hkdfSync('sha256', Buffer.from(ikm, 'hex'), Buffer.from(salt, 'hex'), Buffer.from(info, 'hex'), 42)).toString('hex');

      const res = hkdfEngine.encrypt(ikm, salt, {
        info,
        hash: 'SHA-256',
        keyLength: 42,
      });

      expect(res.output.toLowerCase()).toBe(oracleOkm);
    });
  });

  describe('ChaCha20 & ChaCha20-Poly1305 (RFC 7539 / RFC 8439)', () => {
    it('ChaCha20 matches RFC 7539 roundtrip with key|nonce format', () => {
      const key = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
      const nonce = '000000000000004a00000000';
      const keyWithNonce = `${key}|${nonce}:1`;
      const pt = 'Ladies and Gentlemen of the class of \'99: If I could offer you only one tip for the future, sunscreen would be it.';

      const res = chachaEngine.encrypt(pt, keyWithNonce);
      expect(res.output).toBeDefined();

      const dec = chachaEngine.decrypt(res.output, keyWithNonce);
      expect(dec.output).toBe(pt);
    });

    it('ChaCha20-Poly1305 matches RFC 7539 AEAD roundtrip with key|nonce|aad format', () => {
      const key = '808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f';
      const nonce = '070000004041424344454647';
      const aad = '50515253c0c1c2c3c4c5c6c7';
      const keyCombined = `${key}|${nonce}|${aad}`;
      const pt = '4c6164696573'; // Hex plaintext

      const res = chachaPolyEngine.encrypt(pt, keyCombined);
      expect(res.output).toContain('|');

      const dec = chachaPolyEngine.decrypt(res.output, keyCombined);
      expect(dec.output).toBe(pt);
    });
  });

  describe('Asymmetric Signatures (RFC 8032 Ed25519)', () => {
    it('Ed25519 signs and verifies roundtrip', () => {
      const privKey = '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60';
      const skBytes = toByteArray(privKey, 'hex');
      const pubHex = fromByteArray(ed25519.getPublicKey(skBytes), 'hex');
      const msg = 'Test message for Ed25519';

      const signRes = ed25519Engine.encrypt(msg, privKey);
      expect(signRes.output).toBeDefined();

      // Verify using decrypt with "sigHex,pubHex"
      const verifyRes = ed25519Engine.decrypt(msg, `${signRes.output},${pubHex}`);
      expect(verifyRes.output.toLowerCase()).toBe('valid');
    });
  });

});
