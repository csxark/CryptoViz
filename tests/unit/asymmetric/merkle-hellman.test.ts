import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/asymmetric/merkle-hellman';
import { CipherError } from '../../../lib/utils/errors';
 
describe('Merkle-Hellman knapsack', () => {
    it('round-trips the textbook vector', () => {
        const v = TEST_VECTORS[0];
        const enc = encrypt(v.input, v.key);
        const dec = decrypt(enc.output, v.key);
        expect(dec.output).toBe(v.input);
    });
 
    it('throws INVALID_KEY for a non-superincreasing sequence', () => {
        expect(() => encrypt('A', '2,3,4,5,6,7,8,9,420,41')).toThrowError(CipherError);
    });
 
    it('throws INPUT_REQUIRED on empty input', () => {
        expect(() => encrypt('', TEST_VECTORS[0].key)).toThrowError(CipherError);
    });
 
    it('throws INPUT_TOO_LONG above 4096 bytes', () => {
        expect(() => encrypt('A'.repeat(4100), TEST_VECTORS[0].key)).toThrowError(CipherError);
    });
});
