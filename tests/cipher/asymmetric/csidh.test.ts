import { describe, it, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  computeSharedSecret,
  describeCsidhGroupAction,
  TEST_VECTORS,
} from '../../../lib/cipher/asymmetric/csidh';

describe('CSIDH-512 Isogeny Key Exchange (Pedagogical Simulation)', () => {
  it('should compute shared secrets via encrypt', () => {
    const result = encrypt('0a', '05');
    expect(result.output).toBeDefined();
    expect(result.outputEncoding).toBe('hex');
    expect(result.output.length).toBe(128); // 64 bytes hex
  });

  it('should satisfy commutativity property for key exchange', () => {
    const alicePriv = '1a2b3c';
    const alicePub = '1a2b3c'; // simulated pubKey
    const bobPriv = '4d5e6f';
    const bobPub = '4d5e6f';

    const sharedAlice = encrypt(bobPub, alicePriv);
    const sharedBob = encrypt(alicePub, bobPriv);

    // Commutativity: Alice with Bob's pub == Bob with Alice's pub
    expect(sharedAlice.output).toBe(sharedBob.output);
  });

  it('should compute shared secret directly via computeSharedSecret', () => {
    const P = 10007n;
    const s1 = computeSharedSecret(123n, 456n, P);
    const s2 = computeSharedSecret(456n, 123n, P);
    expect(s1).toBe(s2);
    expect(s1).toBe((123n + 456n) % P);
  });

  it('should describe group action metadata correctly', () => {
    const desc = describeCsidhGroupAction('0a', '05');
    expect(desc.simulatedSharedHex).toBeDefined();
    expect(desc.primeBits).toBe(511);
    expect(desc.isIdentity).toBe(false);
  });

  it('should match test vectors', () => {
    for (const vector of TEST_VECTORS) {
      const res = encrypt(vector.input, vector.key);
      expect(res.output).toBe(vector.expected);
    }
  });
});
