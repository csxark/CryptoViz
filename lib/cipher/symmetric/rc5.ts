import { CipherError } from '../../utils/errors'
import type { CipherOptions, CipherResult, CipherStep, TestVector } from '../types'

const R = 12
const T = 2 * (R + 1)
const P32 = 0xb7e15163
const Q32 = 0x9e3779b9

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s/g, '')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16)
  return out
}
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}
function utf8ToBytes(s: string): Uint8Array { return new TextEncoder().encode(s) }

function rotl32(x: number, s: number): number { s &= 31; return ((x << s) | (x >>> (32 - s))) >>> 0 }
function rotr32(x: number, s: number): number { s &= 31; return ((x >>> s) | (x << (32 - s))) >>> 0 }
function add32(a: number, b: number): number { return (a + b) >>> 0 }
function sub32(a: number, b: number): number { return (a - b) >>> 0 }

function expandKey(key: Uint8Array): number[] {
  if (key.length !== 16) throw new CipherError('INVALID_KEY', 'RC5-32/12/16 requires a 16-byte key')
  const c = 4
  const L = new Array(c).fill(0)
  for (let i = key.length - 1; i >= 0; i--) L[Math.floor(i / 4)] = ((L[Math.floor(i / 4)] << 8) + key[i]) >>> 0
  const S = new Array(T)
  S[0] = P32
  for (let i = 1; i < T; i++) S[i] = add32(S[i - 1], Q32)
  let A = 0, B = 0, i = 0, j = 0
  const n = 3 * Math.max(T, c)
  for (let k = 0; k < n; k++) {
    A = S[i] = rotl32(add32(add32(S[i], A), B), 3)
    B = L[j] = rotl32(add32(add32(L[j], A), B), add32(A, B))
    i = (i + 1) % T; j = (j + 1) % c
  }
  return S
}

function encryptBlock(a0: number, b0: number, S: number[], steps: CipherStep[] | null): [number, number] {
  let A = add32(a0, S[0]), B = add32(b0, S[1])
  for (let i = 1; i <= R; i++) {
    const rotA = B & 31
    A = add32(rotl32(A ^ B, rotA), S[2 * i])
    const rotB = A & 31
    B = add32(rotl32(B ^ A, rotB), S[2 * i + 1])
    steps?.push({
      index: steps.length, label: `Round ${i}`, sublabel: `rotation amounts: ${rotA}, ${rotB}`,
      inputState: `${a0.toString(16)}${b0.toString(16)}`, outputState: `${A.toString(16)}${B.toString(16)}`,
      note: 'Rotation amount is derived from the other half-block, not a fixed schedule', isMilestone: true,
    })
  }
  return [A, B]
}
function decryptBlock(a0: number, b0: number, S: number[], steps: CipherStep[] | null): [number, number] {
  let A = a0, B = b0
  for (let i = R; i >= 1; i--) {
    const rotB = A & 31
    B = rotr32(sub32(B, S[2 * i + 1]), rotB) ^ A
    const rotA = B & 31
    A = rotr32(sub32(A, S[2 * i]), rotA) ^ B
    steps?.push({ index: steps.length, label: `Inverse round ${i}`, sublabel: `rotation amounts: ${rotA}, ${rotB}`, inputState: '', outputState: `${A.toString(16)}${B.toString(16)}`, note: 'Reversing round i' })
  }
  return [sub32(A, S[0]), sub32(B, S[1])]
}

function toWordPairs(data: Uint8Array): [number, number][] {
  const pairs: [number, number][] = []
  for (let i = 0; i < data.length; i += 8) {
    const a = (data[i] ?? 0) | ((data[i + 1] ?? 0) << 8) | ((data[i + 2] ?? 0) << 16) | ((data[i + 3] ?? 0) << 24)
    const b = (data[i + 4] ?? 0) | ((data[i + 5] ?? 0) << 8) | ((data[i + 6] ?? 0) << 16) | ((data[i + 7] ?? 0) << 24)
    pairs.push([a >>> 0, b >>> 0])
  }
  return pairs
}
function fromWordPairs(pairs: [number, number][]): Uint8Array {
  const out = new Uint8Array(pairs.length * 8)
  pairs.forEach(([a, b], i) => {
    for (let k = 0; k < 4; k++) out[i * 8 + k] = (a >>> (8 * k)) & 0xff
    for (let k = 0; k < 4; k++) out[i * 8 + 4 + k] = (b >>> (8 * k)) & 0xff
  })
  return out
}

function parseInput(input: string, options: CipherOptions): Uint8Array {
  const useHex = (options as any).hexInput ?? true
  const bytes = useHex ? hexToBytes(input) : utf8ToBytes(input)
  if (bytes.length === 0) throw new CipherError('INPUT_REQUIRED', 'Input cannot be empty')
  if (bytes.length > 4096) throw new CipherError('INPUT_TOO_LONG', 'Input exceeds 4096 byte limit')
  const padded = new Uint8Array(Math.ceil(bytes.length / 8) * 8)
  padded.set(bytes)
  return padded
}

function run(input: string, key: string, options: CipherOptions, direction: 'encrypt' | 'decrypt'): CipherResult {
  const start = performance.now()
  const keyBytes = hexToBytes(key)
  const S = expandKey(keyBytes)
  const data = parseInput(input, options)
  const steps: CipherStep[] = []
  const collect = options.instrument ? steps : null
  const outPairs = toWordPairs(data).map(([a, b]) =>
    direction === 'encrypt' ? encryptBlock(a, b, S, collect) : decryptBlock(a, b, S, collect)
  )
  return {
    output: bytesToHex(fromWordPairs(outPairs)), outputEncoding: 'hex', steps,
    metadata: { name: 'RC5-32/12/16', keySize: 128, blockSize: 64, rounds: R, securityStatus: 'legacy', yearDesigned: 1994, standardBody: 'Rivest' },
    durationMs: performance.now() - start,
  }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return run(input, key, options, 'encrypt')
}
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return run(input, key, options, 'decrypt')
}

export const TEST_VECTORS: TestVector[] = [
  {
    key: '00000000000000000000000000000000',
    input: '0000000000000000',
    expected: '21a5dbee154b8f6d',
    description: 'Published RC5-32/12/16 all-zero known-answer vector — cross-check before merging',
  },
]
