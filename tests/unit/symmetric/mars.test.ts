import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/symmetric/mars'

describe('MARS', () => {
    it('exports test vectors', () => {
        expect(TEST_VECTORS.length).toBeGreaterThan(0)
    })

    it('passes official zero-key vector', () => {
        const result = encrypt(
            '00000000000000000000000000000000',
            '00000000000000000000000000000000'
        )
        expect(result.output).toBe('35c1c07521c2c5544f8b35d43bb88bec')
    })

    it('passes sequential key vector', () => {
        const result = encrypt(
            '00112233445566778899aabbccddeeff',
            '1234567890abcdef1234567890abcdef'
        )
        expect(result.output).toBe('678d473db04f0303504e18b2caedd2f1')
    })

    it('decrypt is exact inverse of encrypt', () => {
        const key = '1234567890abcdef1234567890abcdef'
        const pt = '00112233445566778899aabbccddeeff'
        const ct = encrypt(pt, key)
        const decrypted = decrypt(ct.output, key)
        expect(decrypted.output).toBe(pt)
    })

    it('handles multiple blocks correctly and inverts cleanly', () => {
        const key = '1234567890abcdef1234567890abcdef'
        const pt = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff'
        const ct = encrypt(pt, key)
        expect(ct.output.length).toBe(64)
        const decrypted = decrypt(ct.output, key)
        expect(decrypted.output).toBe(pt)
    })

    it('supports instrumentation', () => {
        const result = encrypt(
            '00000000000000000000000000000000',
            '00000000000000000000000000000000',
            { instrument: true }
        )
        expect(result.steps.length).toBeGreaterThan(0)
        expect(result.steps[0].label).toContain('Key')
    })

    it('rejects invalid key length', () => {
        expect(() =>
            encrypt('00000000000000000000000000000000', '00112233')
        ).toThrow()
    })

    it('rejects non-multiple block input', () => {
        expect(() =>
            encrypt('00112233', '00000000000000000000000000000000')
        ).toThrow()
    })

    it('rejects empty input', () => {
        expect(() =>
            encrypt('', '00000000000000000000000000000000')
        ).toThrow()
    })

    it('metadata is populated', () => {
        const result = encrypt(
            '00000000000000000000000000000000',
            '00000000000000000000000000000000'
        )
        expect(result.metadata.name).toBe('MARS')
        expect(result.metadata.blockSize).toBe(128)
        expect(result.metadata.rounds).toBe(32)
        expect(result.metadata.securityStatus).toBe('secure')
    })

    describe('Extended Conformance & Invariant Suites', () => {
        const testKeys = [
            '00000000000000000000000000000000', // 128-bit zero key
            '1234567890abcdef1234567890abcdef', // 128-bit sequence
            'ffffffffffffffffffffffffffffffff', // 128-bit all ones
            '000102030405060708090a0b0c0d0e0f1011121314151617', // 192-bit key
            '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f', // 256-bit key
        ]

        const testPlaintexts = [
            '00000000000000000000000000000000',
            'ffffffffffffffffffffffffffffffff',
            '0123456789abcdef0123456789abcdef',
            'a5a5a5a5a5a5a5a55a5a5a5a5a5a5a5a',
            'fedcba9876543210fedcba9876543210',
        ]

        for (const [kIdx, key] of testKeys.entries()) {
            for (const [pIdx, pt] of testPlaintexts.entries()) {
                it(`satisfies round-trip bijection for key #${kIdx + 1} and pt #${pIdx + 1}`, () => {
                    const ct = encrypt(pt, key)
                    expect(ct.output).toMatch(/^[0-9a-f]{32}$/i)
                    const dec = decrypt(ct.output, key)
                    expect(dec.output.toLowerCase()).toBe(pt.toLowerCase())
                })
            }
        }

        it('demonstrates avalanche effect on single bit plaintext flip', () => {
            const key = '1234567890abcdef1234567890abcdef'
            const pt1 = '00000000000000000000000000000000'
            const pt2 = '00000000000000000000000000000001'
            const ct1 = encrypt(pt1, key).output
            const ct2 = encrypt(pt2, key).output

            let bitDiffCount = 0
            for (let i = 0; i < ct1.length; i += 2) {
                const b1 = parseInt(ct1.slice(i, i + 2), 16)
                const b2 = parseInt(ct2.slice(i, i + 2), 16)
                let xor = b1 ^ b2
                while (xor > 0) {
                    bitDiffCount += xor & 1
                    xor >>= 1
                }
            }

            // In a secure block cipher with 128-bit block, expect ~64 bits flipped (at least 40 bits)
            expect(bitDiffCount).toBeGreaterThan(40)
        })

        it('demonstrates avalanche effect on single bit key flip', () => {
            const key1 = '00000000000000000000000000000000'
            const key2 = '00000000000000000000000000000001'
            const pt = '0123456789abcdef0123456789abcdef'
            const ct1 = encrypt(pt, key1).output
            const ct2 = encrypt(pt, key2).output

            let bitDiffCount = 0
            for (let i = 0; i < ct1.length; i += 2) {
                const b1 = parseInt(ct1.slice(i, i + 2), 16)
                const b2 = parseInt(ct2.slice(i, i + 2), 16)
                let xor = b1 ^ b2
                while (xor > 0) {
                    bitDiffCount += xor & 1
                    xor >>= 1
                }
            }

            expect(bitDiffCount).toBeGreaterThan(40)
        })

        it('is completely deterministic across multiple invocations', () => {
            const key = '1234567890abcdef1234567890abcdef'
            const pt = '00112233445566778899aabbccddeeff'
            const run1 = encrypt(pt, key)
            const run2 = encrypt(pt, key)
            expect(run1.output).toBe(run2.output)
        })

        it('does not mutate input parameters', () => {
            const key = '1234567890abcdef1234567890abcdef'
            const pt = '00112233445566778899aabbccddeeff'
            encrypt(pt, key)
            expect(key).toBe('1234567890abcdef1234567890abcdef')
            expect(pt).toBe('00112233445566778899aabbccddeeff')
        })

        it('handles uppercase hex input and key cleanly', () => {
            const key = '1234567890ABCDEF1234567890ABCDEF'
            const pt = '00112233445566778899AABBCCDDEEFF'
            const ct = encrypt(pt, key)
            expect(ct.output).toBe('678d473db04f0303504e18b2caedd2f1')
            const dec = decrypt(ct.output.toUpperCase(), key)
            expect(dec.output).toBe('00112233445566778899aabbccddeeff')
        })

        it('round-trips 4-block and 8-block data streams', () => {
            const key = '0123456789abcdef0123456789abcdef'
            const fourBlocks = '0123456789abcdef0123456789abcdef'.repeat(4)
            const eightBlocks = 'fedcba9876543210fedcba9876543210'.repeat(8)

            const ct4 = encrypt(fourBlocks, key)
            expect(ct4.output.length).toBe(128)
            expect(decrypt(ct4.output, key).output).toBe(fourBlocks)

            const ct8 = encrypt(eightBlocks, key)
            expect(ct8.output.length).toBe(256)
            expect(decrypt(ct8.output, key).output).toBe(eightBlocks)
        })

        it('rejects invalid inputs with descriptive CipherError instances', () => {
            const validKey = '00000000000000000000000000000000'
            const validPt = '00000000000000000000000000000000'

            // Odd-length hex
            expect(() => encrypt('123', validKey)).toThrow()
            expect(() => encrypt(validPt, '123')).toThrow()

            // Non-hex chars
            expect(() => encrypt('zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz', validKey)).toThrow()
            expect(() => encrypt(validPt, 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz')).toThrow()

            // Whitespace stripped correctly or throws if invalid
            const ptWithSpaces = '00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00'
            const keyWithSpaces = '00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00'
            const res = encrypt(ptWithSpaces, keyWithSpaces)
            expect(res.output).toBe('35c1c07521c2c5544f8b35d43bb88bec')
        })

        describe('Key Size and Boundary Variation Tests', () => {
            it('supports 128-bit, 192-bit, and 256-bit key schedule lengths', () => {
                const pt = '0123456789abcdef0123456789abcdef'
                const key128 = '00112233445566778899aabbccddeeff'
                const key192 = '00112233445566778899aabbccddeeff0011223344556677'
                const key256 = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff'

                const ct128 = encrypt(pt, key128)
                const ct192 = encrypt(pt, key192)
                const ct256 = encrypt(pt, key256)

                expect(ct128.output).not.toBe(ct192.output)
                expect(ct192.output).not.toBe(ct256.output)

                expect(decrypt(ct128.output, key128).output).toBe(pt)
                expect(decrypt(ct192.output, key192).output).toBe(pt)
                expect(decrypt(ct256.output, key256).output).toBe(pt)
            })

            it('rejects unsupported key sizes such as 64-bit, 80-bit, or 512-bit', () => {
                const pt = '0123456789abcdef0123456789abcdef'
                const key64 = '0011223344556677'
                const key80 = '00112233445566778899'
                const key512 = '00112233445566778899aabbccddeeff'.repeat(4)

                expect(() => encrypt(pt, key64)).toThrow()
                expect(() => encrypt(pt, key80)).toThrow()
                expect(() => encrypt(pt, key512)).toThrow()
            })

            it('populates intermediate execution steps when instrumented', () => {
                const pt = '00112233445566778899aabbccddeeff'
                const key = '1234567890abcdef1234567890abcdef'
                const enc = encrypt(pt, key, { instrument: true })
                expect(enc.steps.length).toBeGreaterThan(1)
                expect(enc.steps[0].label).toContain('Key schedule')
                expect(enc.steps[1].label).toContain('Block 1/1')

                const dec = decrypt(enc.output, key, { instrument: true })
                expect(dec.steps.length).toBeGreaterThan(1)
                expect(dec.steps[0].label).toContain('Key schedule')
                expect(dec.steps[1].label).toContain('Block 1/1')
            })

            it('verifies round-trip on pseudo-randomly generated blocks and keys', () => {
                let state = 0x12345678
                function pseudoRandomHex(byteCount: number): string {
                    const bytes: string[] = []
                    for (let i = 0; i < byteCount; i++) {
                        state = (Math.imul(1103515245, state) + 12345) & 0x7fffffff
                        bytes.push((state & 0xff).toString(16).padStart(2, '0'))
                    }
                    return bytes.join('')
                }

                for (let i = 0; i < 20; i++) {
                    const key = pseudoRandomHex(16)
                    const pt = pseudoRandomHex(16)
                    const ct = encrypt(pt, key)
                    expect(ct.output).toMatch(/^[0-9a-f]{32}$/i)
                    const dec = decrypt(ct.output, key)
                    expect(dec.output).toBe(pt)
                }
            })

            it('verifies round-trip on multi-block pseudo-random streams', () => {
                let state = 0x87654321
                function pseudoRandomHex(byteCount: number): string {
                    const bytes: string[] = []
                    for (let i = 0; i < byteCount; i++) {
                        state = (Math.imul(1103515245, state) + 12345) & 0x7fffffff
                        bytes.push((state & 0xff).toString(16).padStart(2, '0'))
                    }
                    return bytes.join('')
                }

                for (let i = 0; i < 10; i++) {
                    const key = pseudoRandomHex(32) // 256-bit key
                    const blockCount = (i % 5) + 1 // 1 to 5 blocks
                    const pt = pseudoRandomHex(blockCount * 16)
                    const ct = encrypt(pt, key)
                    expect(ct.output.length).toBe(blockCount * 32)
                    const dec = decrypt(ct.output, key)
                    expect(dec.output).toBe(pt)
                }
            })
        })
    })
})




