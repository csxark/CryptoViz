import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/symmetric/idea';
import { CipherError } from '../../../lib/utils/errors';

describe('IDEA cipher', () => {
  it('round-trips test vectors', () => {
    for (const v of TEST_VECTORS) {
      const ct = encrypt(v.input, v.key);
      const dt = decrypt(ct.output, v.key);
      // IDEA implementation pads input to 8-byte blocks
      expect(dt.output.startsWith(v.input)).toBe(true);
    }
  });

  it('throws INPUT_REQUIRED on empty input', () => {
    expect(() => encrypt('', '000102030405060708090a0b0c0d0e0f')).toThrowError(/INPUT_REQUIRED/);
  });

  it('throws INPUT_TOO_LONG above 4096 bytes', () => {
    const huge = '00'.repeat(4100);
    expect(() => encrypt(huge, '000102030405060708090a0b0c0d0e0f')).toThrowError(/INPUT_TOO_LONG/);
  });

  it('throws INVALID_KEY for wrong key size', () => {
    expect(() => encrypt('0000000000000000', '00010203')).toThrowError(/INVALID_KEY/);
  });
});
