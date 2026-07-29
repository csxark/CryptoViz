import { CipherError, validateInput, validateKey } from '../../utils'
import type { CipherOptions, CipherResult, CipherStep, TestVector } from '../types'

/**
 * Skipjack — NSA Clipper-chip cipher, declassified 1998.
 * 64-bit block, 80-bit key, 32 rounds.
 */
const F_TABLE = [
  0xa3, 0xd7, 0x09, 0x83, 0xf8, 0x48, 0xf6, 0xf4, 0xb3, 0x21, 0x15, 0x78, 0x99, 0xb1, 0xaf, 0xf9,
  0xe7, 0x2d, 0x4d, 0x8a, 0xce, 0x4c, 0xca, 0x2e, 0x52, 0x95, 0xd9, 0x1e, 0x4e, 0x38, 0x44, 0x28,
  0x0a, 0xdf, 0x02, 0xa0, 0x17, 0xf1, 0x60, 0x68, 0x12, 0xb7, 0x7a, 0xc3, 0xe9, 0xfa, 0x3d, 0x53,
  0x96, 0x84, 0x6b, 0xba, 0xf2, 0x63, 0x9a, 0x19, 0x7c, 0xae, 0xe5, 0xf5, 0xf7, 0x16, 0x6a, 0xa2,
  0x39, 0xb6, 0x7b, 0x0f, 0xc1, 0x93, 0x81, 0x1b, 0xee, 0xb4, 0x1a, 0xea, 0xd0, 0x91, 0x2f, 0xb8,
  0x55, 0xb9, 0xda, 0x85, 0x3f, 0x41, 0xbf, 0xe0, 0x5a, 0x58, 0x80, 0x5f, 0x66, 0x0b, 0xd8, 0x90,
  0x35, 0xd5, 0xc0, 0xa7, 0x33, 0x06, 0x65, 0x69, 0x45, 0x00, 0x94, 0x56, 0x6d, 0x98, 0x9b, 0x76,
  0x97, 0xfc, 0xb2, 0xc2, 0xb0, 0xfe, 0xdb, 0x20, 0xe1, 0xeb, 0xd6, 0xe4, 0xdd, 0x47, 0x4a, 0x1d,
  0x42, 0xed, 0x9e, 0x6e, 0x49, 0x3c, 0xcd, 0x43, 0x27, 0xd2, 0x07, 0xd4, 0xde, 0xc7, 0x67, 0x18,
  0x89, 0xcb, 0x30, 0x1f, 0x8d, 0xc6, 0x8f, 0xaa, 0xc8, 0x74, 0xdc, 0xc9, 0x5d, 0x5c, 0x31, 0xa4,
  0x70, 0x88, 0x61, 0x2c, 0x9f, 0x0d, 0x2b, 0x87, 0x50, 0x82, 0x54, 0x64, 0x26, 0x7d, 0x03, 0x40,
  0x34, 0x4b, 0x1c, 0x73, 0xd1, 0xc4, 0xfd, 0x3b, 0xcc, 0xfb, 0x7f, 0xab, 0xe6, 0x3e, 0x5b, 0xa5,
  0xad, 0x04, 0x23, 0x9c, 0x14, 0x51, 0x22, 0xf0, 0x29, 0x79, 0x71, 0x7e, 0xff, 0x8c, 0x0e, 0xe2,
  0x0c, 0xef, 0xbc, 0x72, 0x75, 0x6f, 0x37, 0xa1, 0xec, 0xd3, 0x8e, 0x62, 0x8b, 0x86, 0x10, 0xe8,
  0x08, 0x77, 0x11, 0xbe, 0x92, 0x4f, 0x24, 0xc5, 0x32, 0x36, 0x9d, 0xcf, 0xf3, 0xa6, 0xbb, 0xac,
  0x5e, 0x6c, 0xa9, 0x13, 0x57, 0x25, 0xb5, 0xe3, 0xbd, 0xa8, 0x3a, 0x01, 0x05, 0x59, 0x2a, 0x46
]

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s/g, '')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16)
  return out
}
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function g(word: number, keyBytes: number[], keyOffset: number): { output: number; kUsed: number[] } {
  let g1 = (word >> 8) & 0xff, g2 = word & 0xff
  const kUsed: number[] = []
  for (let round = 0; round < 4; round++) {
    const k = keyBytes[keyOffset % keyBytes.length]
    kUsed.push(k)
    const g3 = F_TABLE[g2 ^ k] ^ g1
    g1 = g2; g2 = g3; keyOffset++
  }
  return { output: ((g1 << 8) | g2) & 0xffff, kUsed }
}

function gInv(word: number, keyBytes: number[], keyOffset: number): { output: number; kUsed: number[] } {
  let g1 = (word >> 8) & 0xff, g2 = word & 0xff
  const kUsed: number[] = []
  for (let round = 3; round >= 0; round--) {
    const k = keyBytes[(keyOffset + round) % keyBytes.length]
    kUsed.push(k)
    const g3 = F_TABLE[g1 ^ k] ^ g2
    g2 = g1; g1 = g3
  }
  return { output: ((g1 << 8) | g2) & 0xffff, kUsed: kUsed.reverse() }
}

function skipjackEncryptBlock(block: number[], keyBytes: number[], steps: CipherStep[] | null): number[] {
  let [w1, w2, w3, w4] = block
  let keyOffset = 0
  for (let stepGroup = 0; stepGroup < 4; stepGroup++) {
    const rule: 'A' | 'B' = stepGroup % 2 === 0 ? 'A' : 'B'
    for (let round = 0; round < 8; round++) {
      const counter = stepGroup * 8 + round + 1
      const { output: gw1, kUsed } = g(w1, keyBytes, keyOffset)
      keyOffset += 4
      if (rule === 'A') {
        const nw1 = gw1, nw2 = w3, nw3 = w4, nw4 = (gw1 ^ w2 ^ counter) & 0xffff
        ;[w1, w2, w3, w4] = [nw1, nw2, nw3, nw4]
      } else {
        const nw1 = (w4 ^ w1 ^ counter) & 0xffff, nw2 = gw1, nw3 = w1, nw4 = w3
        ;[w1, w2, w3, w4] = [nw1, nw2, nw3, nw4]
      }
      steps?.push({
        index: steps.length, label: `Round ${counter}`, sublabel: `Rule ${rule}`,
        inputState: '', outputState: [w1, w2, w3, w4].map((v) => v.toString(16).padStart(4, '0')).join(''),
        note: `G-permutation keystream bytes [${kUsed.join(',')}]`, isMilestone: round === 7,
      })
    }
  }
  return [w1, w2, w3, w4]
}

// Mirror of skipjackEncryptBlock with rules/counters reversed and g^-1 — implement
// before merging, this is intentionally left unfinished per the F_TABLE caveat above.
function skipjackDecryptBlock(_block: number[], _keyBytes: number[], _steps: CipherStep[] | null): number[] {
  throw new CipherError('INVALID_KEY', 'skipjackDecryptBlock not yet implemented — needs F_TABLE filled and g^-1 written first')
}

function toWords(data: Uint8Array): number[][] {
  const blocks: number[][] = []
  for (let i = 0; i < data.length; i += 8) {
    blocks.push([
      ((data[i] ?? 0) << 8) | (data[i + 1] ?? 0),
      ((data[i + 2] ?? 0) << 8) | (data[i + 3] ?? 0),
      ((data[i + 4] ?? 0) << 8) | (data[i + 5] ?? 0),
      ((data[i + 6] ?? 0) << 8) | (data[i + 7] ?? 0),
    ])
  }
  return blocks
}
function fromWords(blocks: number[][]): Uint8Array {
  const out = new Uint8Array(blocks.length * 8)
  blocks.forEach((b, i) => b.forEach((w, j) => {
    out[i * 8 + j * 2] = (w >> 8) & 0xff
    out[i * 8 + j * 2 + 1] = w & 0xff
  }))
  return out
}

function parseInput(input: string): Uint8Array {
  const bytes = hexToBytes(input)
  if (bytes.length === 0) throw new CipherError('INPUT_REQUIRED', 'Input cannot be empty')
  if (bytes.length > 4096) throw new CipherError('INPUT_TOO_LONG', 'Input exceeds 4096 byte limit')
  const padded = new Uint8Array(Math.ceil(bytes.length / 8) * 8)
  padded.set(bytes)
  return padded
}

function run(input: string, key: string, options: CipherOptions, direction: 'encrypt' | 'decrypt'): CipherResult {
  validateKey(key)
  const start = performance.now()
  const keyBytes = Array.from(hexToBytes(key))
  if (keyBytes.length !== 10) throw new CipherError('INVALID_KEY', 'Skipjack requires a 10-byte (80-bit) key')
  const data = parseInput(input)
  const steps: CipherStep[] = []
  const collect = options.instrument ? steps : null
  const outBlocks = toWords(data).map((b) =>
    direction === 'encrypt' ? skipjackEncryptBlock(b, keyBytes, collect) : skipjackDecryptBlock(b, keyBytes, collect)
  )
  return {
    output: bytesToHex(fromWords(outBlocks)), outputEncoding: 'hex', steps,
    metadata: { name: 'Skipjack', keySize: 80, blockSize: 64, rounds: 32, securityStatus: 'legacy', yearDesigned: 1998, standardBody: 'NSA (declassified)' },
    durationMs: performance.now() - start,
  }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return run(input, key, options, 'encrypt')
}
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return run(input, key, options, 'decrypt')
}

export const TEST_VECTORS: TestVector[] = [
  {
    key: '00998877665544332211',
    input: '33221100ddccbbaa', // Hex input
    expected: '2587cae27a12d300',
    description: 'Official NSA KAT vector (Key: 0099...11, PT: 3322...aa)',
  },
]
