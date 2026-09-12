import { describe, it, expect, vi } from 'vitest'
import { cryptoRandomBytes, cryptoRandomInt } from '../../lib/random/cryptoRandom'
import * as fs from 'fs'
import * as path from 'path'

describe('Cryptographic Randomness & CSPRNG Audit', () => {
    describe('cryptoRandomBytes', () => {
        it('uses Web Crypto getRandomValues, not Math.random', () => {
            const mathRandomSpy = vi.spyOn(Math, 'random')
            const cryptoSpy = vi.spyOn(crypto, 'getRandomValues')
            
            const bytes = cryptoRandomBytes(32)
            expect(cryptoSpy).toHaveBeenCalled()
            expect(mathRandomSpy).not.toHaveBeenCalled()
            expect(bytes).toBeInstanceOf(Uint8Array)
            expect(bytes.length).toBe(32)

            mathRandomSpy.mockRestore()
            cryptoSpy.mockRestore()
        })

        it('throws on non-positive or invalid length', () => {
            expect(() => cryptoRandomBytes(0)).toThrow(RangeError)
            expect(() => cryptoRandomBytes(-5)).toThrow(RangeError)
            expect(() => cryptoRandomBytes(3.14)).toThrow(RangeError)
        })

        it('produces distinct byte sequences across multiple invocations', () => {
            const a = cryptoRandomBytes(16)
            const b = cryptoRandomBytes(16)
            expect(Buffer.from(a).toString('hex')).not.toBe(Buffer.from(b).toString('hex'))
        })
    })

    describe('cryptoRandomInt', () => {
        it('returns integers in the range [0, max)', () => {
            for (let max of [1, 2, 5, 10, 100, 256, 1000]) {
                for (let i = 0; i < 50; i++) {
                    const val = cryptoRandomInt(max)
                    expect(Number.isInteger(val)).toBe(true)
                    expect(val).toBeGreaterThanOrEqual(0)
                    expect(val).toBeLessThan(max)
                }
            }
        })

        it('throws on non-positive or invalid max', () => {
            expect(() => cryptoRandomInt(0)).toThrow(RangeError)
            expect(() => cryptoRandomInt(-1)).toThrow(RangeError)
            expect(() => cryptoRandomInt(1.5)).toThrow(RangeError)
        })
    })

    describe('Zero Math.random in Cryptographic Implementation Files', () => {
        it('ensures no active cryptographic cipher in lib/cipher/ uses Math.random()', () => {
            const cipherDir = path.resolve(__dirname, '../../lib/cipher')

            function scanDirectory(dir: string): string[] {
                const results: string[] = []
                const entries = fs.readdirSync(dir, { withFileTypes: true })
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name)
                    if (entry.isDirectory()) {
                        results.push(...scanDirectory(fullPath))
                    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
                        results.push(fullPath)
                    }
                }
                return results
            }

            const tsFiles = scanDirectory(cipherDir)
            expect(tsFiles.length).toBeGreaterThan(50)

            const violations: { file: string; line: number; text: string }[] = []

            for (const file of tsFiles) {
                const content = fs.readFileSync(file, 'utf-8')
                const lines = content.split('\n')
                lines.forEach((lineText, idx) => {
                    // Check if line contains Math.random( but ignore comments
                    const trimmed = lineText.trim()
                    if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
                        return
                    }
                    if (/Math\.random\s*\(/.test(lineText)) {
                        violations.push({
                            file: path.relative(cipherDir, file),
                            line: idx + 1,
                            text: trimmed
                        })
                    }
                })
            }

            expect(violations).toEqual([])
        })
    })
})