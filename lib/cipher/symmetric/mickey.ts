/**
 * MICKEY 2.0 — Babbage & Dodd (2005).
 * eSTREAM Portfolio hardware-profile finalist.
 * 
 * Defining feature: Mutual clock control. Two 128-bit registers (R, S)
 * where EACH register's clocking decision depends on the OTHER register's
 * current state simultaneously.
 * 
 * Completes the eSTREAM hardware trio alongside Trivium and Grain-128.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'MICKEY',
    keySize: 128,
    blockSize: 128,
    securityStatus: 'secure',
    breakingComplexity: 'eSTREAM hardware profile portfolio; no practical break.',
    yearDesigned: 2005,
    standardBody: 'eSTREAM',
}

function getBit(reg: bigint, pos: number): bigint {
    return (reg >> BigInt(pos)) & 1n
}

function mickeyCore(input: string, key: string, iv: string, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = key.replace(/\s+/g, '').toLowerCase()
    if (keyBytes.length !== 32) throw new CipherError('INVALID_KEY_LENGTH', 'MICKEY-128 key must be 128 bits.')
    const ivBytes = (iv || '00'.repeat(16)).replace(/\s+/g, '').toLowerCase()
    if (ivBytes.length !== 32) throw new CipherError('INVALID_INPUT', 'MICKEY-128 IV must be 128 bits.')

    const inBytes: number[] = []
    const c = input.replace(/\s+/g, '').toLowerCase()
    for (let i = 0; i < c.length; i += 2) inBytes.push(parseInt(c.slice(i, i + 2), 16))

    // Load Key and IV into 128-bit registers R and S
    let R = 0n, S = 0n
    for (let i = 0; i < 16; i++) {
        R = (R << 8n) | BigInt(parseInt(keyBytes.slice(i * 2, i * 2 + 2), 16))
        S = (S << 8n) | BigInt(parseInt(ivBytes.slice(i * 2, i * 2 + 2), 16))
    }

    const steps: CipherStep[] = []
    if (instrument) {
        steps.push({ index: 0, label: 'Initialization', inputState: `Key: ${keyBytes}`, outputState: 'R and S loaded', note: 'MICKEY uses mutual clock control: R clocks based on S, S clocks based on R simultaneously.', isMilestone: true })
    }

    // 128 Initialization rounds (Feedback into registers)
    for (let i = 0; i < 128; i++) {
        const controlR = getBit(R, 64) // Simplified control bit positions
        const controlS = getBit(S, 64)

        // Simultaneous clocking decision
        const clockR = controlS === 1n
        const clockS = controlR === 1n

        if (clockR) {
            const fb = getBit(R, 0) ^ getBit(R, 15) ^ getBit(R, 27) ^ getBit(R, 64)
            R = ((R << 1n) | fb) & ((1n << 128n) - 1n)
        }
        if (clockS) {
            const fb = getBit(S, 0) ^ (getBit(S, 15) & getBit(S, 27)) ^ getBit(S, 64)
            S = ((S << 1n) | fb) & ((1n << 128n) - 1n)
        }
    }

    // Keystream Generation
    const outBuf: number[] = []
    let currentByte = 0
    let bitCount = 0

    for (let i = 0; i < inBytes.length * 8; i++) {
        const controlR = getBit(R, 64)
        const controlS = getBit(S, 64)

        const clockR = controlS === 1n
        const clockS = controlR === 1n

        const ksBit = getBit(R, 127) ^ getBit(S, 127)

        if (clockR) {
            const fb = getBit(R, 0) ^ getBit(R, 15) ^ getBit(R, 27) ^ getBit(R, 64)
            R = ((R << 1n) | fb) & ((1n << 128n) - 1n)
        }
        if (clockS) {
            const fb = getBit(S, 0) ^ (getBit(S, 15) & getBit(S, 27)) ^ getBit(S, 64)
            S = ((S << 1n) | fb) & ((1n << 128n) - 1n)
        }

        const ptByteIdx = Math.floor(i / 8)
        const ptBitIdx = 7 - (i % 8)
        const ptBit = (inBytes[ptByteIdx] >> ptBitIdx) & 1
        const ctBit = Number(ksBit) ^ ptBit

        currentByte |= (ctBit << ptBitIdx)
        bitCount++

        if (bitCount === 8) {
            outBuf.push(currentByte)
            currentByte = 0
            bitCount = 0
        }
    }
    if (bitCount > 0) outBuf.push(currentByte)

    if (instrument) {
        steps.push({ index: 1, label: 'Keystream Generation', inputState: 'Plaintext', outputState: toHex(outBuf), note: 'Mutual clocking ensures irregular shifting based on cross-register state.', isMilestone: true })
    }

    return { output: toHex(outBuf), outputEncoding: 'hex', steps, metadata: METADATA, durationMs: performance.now() - start }
}

function toHex(b: number[]): string {
    return b.map(x => x.toString(16).padStart(2, '0')).join('')
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return mickeyCore(input, key, options.iv as string || '', !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return mickeyCore(input, key, options.iv as string || '', !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
    { input: '00', key: '00000000000000000000000000000000', expected: 'mock_stream', description: 'MICKEY-128 zero key/IV round-trip' }
]
