// tests/cipher/hash/hamsi.test.ts

import { generate, verify } from '../../../lib/cipher/hash/hamsi';

describe('Hamsi Hash Function (SHA-3 Finalist)', () => {
    it('should generate consistent hex digests for empty string', () => {
        const hash1 = generate('');
        const hash2 = generate('');
        expect(hash1).toBe(hash2);
        expect(hash1.length).toBe(64); // 256-bit output in hex
    });

    it('should produce distinct digests for different inputs', () => {
        const h1 = generate('abc');
        const h2 = generate('abcd');
        expect(h1).not.toBe(h2);
    });

    it('should verify hashes correctly via the verify contract', () => {
        const input = "SHA-3 Finalist Hamsi Test";
        const hash = generate(input);
        
        expect(verify(input, "", hash)).toBe(true);
        expect(verify(input + "diff", "", hash)).toBe(false);
    });

    it('should handle multi-block input strings without failure', () => {
        const longInput = "A".repeat(256);
        const hash = generate(longInput);
        expect(hash).toBeDefined();
        expect(hash.length).toBe(64);
    });
});
