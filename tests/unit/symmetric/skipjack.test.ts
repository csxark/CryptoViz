import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/symmetric/skipjack';

describe('Skipjack', () => {
  it('matches the published KAT vector', () => {
    const v = TEST_VECTORS[0];
    const res = encrypt(v.input, v.key);
    expect(res.output).toBe(v.expected);
  });

  it('round-trips encrypt/decrypt', () => {
    const v = TEST_VECTORS[0];
    const enc = encrypt(v.input, v.key);
    const dec = decrypt(enc.output, v.key);
    expect(dec.output).toBe(v.input);
  });

  it('throws INPUT_REQUIRED on empty input', () => {
    expect(() => encrypt('', '00998877665544332211')).toThrowError(/INPUT_REQUIRED/);
  });

  it('throws INPUT_TOO_LONG above 4096 bytes', () => {
    const huge = '00'.repeat(4100);
    expect(() => encrypt(huge, '00998877665544332211')).toThrowError(/INPUT_TOO_LONG/);
  });

  it('throws INVALID_KEY for wrong key size', () => {
    expect(() => encrypt('33221100ddccbbaa', 'aabbcc')).toThrowError(/INVALID_KEY/);
  });
});
