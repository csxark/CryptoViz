import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS, getCastryckDecruAttackSummary, computeJInvariant, walkIsogeny } from '@/lib/cipher/asymmetric/sidh'

describe('SIDH', () => {
    it('exports test vectors', () => expect(TEST_VECTORS.length).toBeGreaterThan(0))

    it('metadata flags broken status unconditionally', () => {
        const result = encrypt('01', 'pub,priv')
        expect(result.metadata.securityStatus).toBe('broken')
        expect(result.metadata.breakingComplexity).toContain('Castryck')
        expect(result.metadata.breakingComplexity).toContain('Decru')
    })

    it('instrumentation explains the break mechanism', () => {
        const result = encrypt('01', 'pub,priv', { instrument: true })
        const breakNote = result.steps.find(s => s.note?.includes('Castryck'))
        expect(breakNote).toBeDefined()
        expect(breakNote?.note).toContain('torsion')
    })

    it('metadata includes explicit securityWarning about the Castryck-Decru attack', () => {
        const result = encrypt('01', 'pub,priv')
        expect(result.metadata.securityWarning).toContain('Castryck-Decru key-recovery attack')
    })

    it('getCastryckDecruAttackSummary exposes Eurocrypt 2023 details and DOI link', () => {
        const summary = getCastryckDecruAttackSummary()
        expect(summary.authors).toContain('Wouter Castryck')
        expect(summary.authors).toContain('Thomas Decru')
        expect(summary.venue).toContain('Eurocrypt 2023')
        expect(summary.doiUrl).toContain('2022/975')
    })

    describe('Mathematical implementation (#1707)', () => {
        it('does not return an all-zero 32-byte result for valid inputs (regression)', () => {
            const result = encrypt('01', 'pub,priv');
            expect(result.output).not.toBe('0000000000000000000000000000000000000000000000000000000000000000');
            expect(result.output.length).toBe(64); // 32 bytes in hex
        });

        it('produces deterministic output for the same inputs', () => {
            const result1 = encrypt('1a2b3c', 'secret_key_1');
            const result2 = encrypt('1a2b3c', 'secret_key_1');
            expect(result1.output).toBe(result2.output);
        });

        it('produces different outputs for different keys', () => {
            const result1 = encrypt('1a2b3c', 'secret_key_1');
            const result2 = encrypt('1a2b3c', 'secret_key_2');
            expect(result1.output).not.toBe(result2.output);
        });

        it('produces different outputs for different inputs', () => {
            const result1 = encrypt('1a2b3c', 'secret_key_1');
            const result2 = encrypt('ffeedd', 'secret_key_1');
            expect(result1.output).not.toBe(result2.output);
        });
        
        it('decrypt works symmetrically as encrypt (no actual decryption for SIDH, it computes the shared secret)', () => {
            const encResult = encrypt('010203', 'test');
            const decResult = decrypt('010203', 'test');
            expect(encResult.output).toBe(decResult.output);
        });

        it('throws an error for empty input', () => {
            expect(() => encrypt('', 'key')).toThrow();
        });

        it('throws an error for non-hex input', () => {
            expect(() => encrypt('zzxx', 'key')).toThrow();
        });

        it('matches test vector', () => {
            const vector = TEST_VECTORS[0];
            const result = encrypt(vector.input, vector.key);
            expect(result.output).toBe(vector.expected);
        });

        describe('Fp2 Math Verification', () => {
            it('computeJInvariant successfully evaluates normal coefficients', () => {
                const j1 = computeJInvariant({ a: 10n, b: 20n });
                expect(j1).toBeDefined();
                expect(typeof j1.a).toBe('bigint');
                expect(typeof j1.b).toBe('bigint');
            });

            it('computeJInvariant handles potential singular points (A^2 = 4) without crashing', () => {
                // If A = 2, A^2 = 4. 4 - 4 = 0. Inverse of 0 should throw, which computeJInvariant catches
                const j2 = computeJInvariant({ a: 2n, b: 0n });
                expect(j2.a).toBe(0n);
                expect(j2.b).toBe(0n);
            });

            it('walkIsogeny mixes properties properly avoiding constant outcomes', () => {
                const A1 = walkIsogeny(5n, [{a: 1n, b: 2n}]);
                const A2 = walkIsogeny(6n, [{a: 1n, b: 2n}]);
                const A3 = walkIsogeny(5n, [{a: 1n, b: 3n}]);
                
                // Outputs should differ across varying secrets and torsion images
                expect(A1.a === A2.a && A1.b === A2.b).toBeFalsy();
                expect(A1.a === A3.a && A1.b === A3.b).toBeFalsy();
            });
        });
        
        describe('Extensive Input Coverage', () => {
            it('gracefully handles large pseudo-random hex payloads', () => {
                const largeHex = Array(200).fill('f').join('');
                const result = encrypt(largeHex, 'my_very_long_secret_key_string');
                expect(result.output.length).toBe(64);
                expect(result.output).not.toBe('0000000000000000000000000000000000000000000000000000000000000000');
            });

            it('handles single-byte inputs effectively', () => {
                const result = encrypt('ab', 'k');
                expect(result.output.length).toBe(64);
                expect(result.output).not.toBe('0000000000000000000000000000000000000000000000000000000000000000');
            });
            
            it('handles highly repetitive input sequences smoothly', () => {
                const zeros = Array(50).fill('00').join('');
                const result1 = encrypt(zeros, 'secret');
                const result2 = encrypt(zeros, 'secret2');
                expect(result1.output).not.toBe('0000000000000000000000000000000000000000000000000000000000000000');
                expect(result1.output).not.toBe(result2.output);
            });
        });
    });
})
