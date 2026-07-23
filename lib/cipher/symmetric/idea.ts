import { CipherError } from '../../utils/errors'
import type { CipherOptions, CipherResult, CipherStep, TestVector } from '../types'

const MOD16 = 0x10000
const MOD_MUL = 0x10001

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s/g, '')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16)
  return out
}
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}
function utf8ToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

function mulModIdea(a: number, b: number): number {
  const x = a === 0 ? MOD16 : a
  const y = b === 0 ? MOD16 : b
  const r = (x * y) % MOD_MUL
  return r === MOD16 ? 0 : r
}
function addMod16(a: number, b: number): number {
  return (a + b) & 0xffff
}
function invMulModIdea(a: number): number {
  if (a === 0) return 0
  let t = 0, newT = 1
  let r = MOD_MUL, newR = a
  while (newR !== 0) {
    const q = Math.floor(r / newR)
    ;[t, newT] = [newT, t - q * newT]
    ;[r, newR] = [newR, r - q * newR]
  }
  if (t < 0) t += MOD_MUL
  return t === MOD16 ? 0 : t
}
function invAddMod16(a: number): number {
  return (MOD16 - a) & 0xffff
}

function deriveEncryptSubkeys(keyBytes: Uint8Array): number[] {
  if (keyBytes.length !== 16) throw new CipherError('INVALID_KEY', 'IDEA requires a 128-bit (16 byte) key')
  const bits: number[] = []
  for (const byte of keyBytes) for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1)
  const subkeys: number[] = []
  let rotated = bits
  while (subkeys.length < 52) {
    for (let i = 0; i < 8 && subkeys.length < 52; i++) {
      let v = 0
      for (let b = 0; b < 16; b++) v = (v << 1) | rotated[(i * 16 + b) % 128]
      subkeys.push(v >>> 0)
    }
    const next: number[] = new Array(128)
    for (let i = 0; i < 128; i++) next[i] = rotated[(i + 25) % 128]
    rotated = next
  }
  return subkeys
}

function deriveDecryptSubkeys(enc: number[]): number[] {
  const dec: number[] = new Array(52)
  for (let round = 0; round < 9; round++) {
    if (round === 0) {
      dec[0] = invMulModIdea(enc[48]); dec[1] = invAddMod16(enc[49])
      dec[2] = invAddMod16(enc[50]); dec[3] = invMulModIdea(enc[51])
    } else if (round === 8) {
      dec[48] = invMulModIdea(enc[0]); dec[49] = invAddMod16(enc[1])
      dec[50] = invAddMod16(enc[2]); dec[51] = invMulModIdea(enc[3])
    } else {
      const base = (8 - round) * 6
      dec[round * 6] = invMulModIdea(enc[base])
      dec[round * 6 + 1] = invAddMod16(enc[base + 2])
      dec[round * 6 + 2] = invAddMod16(enc[base + 1])
      dec[round * 6 + 3] = invMulModIdea(enc[base + 3])
    }
    if (round < 8) {
      const base = (7 - round) * 6
      dec[round * 6 + 4] = enc[base + 4]
      dec[round * 6 + 5] = enc[base + 5]
    }
  }
  return dec
}

function ideaCore(block: number[], subkeys: number[], steps: CipherStep[] | null): number[] {
  let [a, b, c, d] = block
  let k = 0
  for (let round = 0; round < 8; round++) {
    const inState = [a, b, c, d].map((v) => v.toString(16).padStart(4, '0')).join('')
    const ka = subkeys[k++], kb = subkeys[k++], kc = subkeys[k++], kd = subkeys[k++]
    const ke = subkeys[k++], kf = subkeys[k++]
    a = mulModIdea(a, ka); b = addMod16(b, kb); c = addMod16(c, kc); d = mulModIdea(d, kd)
    const e = a ^ c, f = b ^ d
    const g = mulModIdea(e, ke)
    const h = addMod16(f, g)
    const i = mulModIdea(h, kf)
    const j = addMod16(g, i)
    const newA = a ^ i, newD = d ^ j
    const newB = c ^ i, newC = b ^ j
    a = newA; b = newB; c = newC; d = newD
    if (steps) {
      const outState = [a, b, c, d].map((v) => v.toString(16).padStart(4, '0')).join('')
      steps.push({
        index: steps.length, label: `Round ${round + 1}`,
        sublabel: 'XOR / mod-add / mod-mul mix', inputState: inState, outputState: outState,
        note: `Applied subkeys K${round * 6 + 1}..K${round * 6 + 6}`, isMilestone: true,
      })
    }
  }
  const ka = subkeys[48], kb = subkeys[49], kc = subkeys[50], kd = subkeys[51]
  const outA = mulModIdea(a, ka), outB = addMod16(c, kb), outC = addMod16(b, kc), outD = mulModIdea(d, kd)
  if (steps) {
    steps.push({
      index: steps.length, label: 'Output transformation', inputState: [a, b, c, d].map((v) => v.toString(16).padStart(4, '0')).join(''),
      outputState: [outA, outB, outC, outD].map((v) => v.toString(16).padStart(4, '0')).join(''),
      note: 'Final half-round with K49..K52', isMilestone: true,
    })
  }
  return [outA, outB, outC, outD]
}

function toBlocks16(data: Uint8Array): number[][] {
  const blocks: number[][] = []
  for (let i = 0; i < data.length; i += 8) {
    const block: number[] = []
    for (let j = 0; j < 4; j++) block.push(((data[i + j * 2] ?? 0) << 8) | (data[i + j * 2 + 1] ?? 0))
    blocks.push(block)
  }
  return blocks
}
function fromBlocks16(blocks: number[][]): Uint8Array {
  const out = new Uint8Array(blocks.length * 8)
  blocks.forEach((block, bi) => block.forEach((word, wi) => {
    out[bi * 8 + wi * 2] = (word >> 8) & 0xff
    out[bi * 8 + wi * 2 + 1] = word & 0xff
  }))
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
  const data = parseInput(input, options)
  const encKeys = deriveEncryptSubkeys(keyBytes)
  const subkeys = direction === 'encrypt' ? encKeys : deriveDecryptSubkeys(encKeys)
  const steps: CipherStep[] = []
  const collect = options.instrument ? steps : null
  const outBlocks = toBlocks16(data).map((b) => ideaCore(b, subkeys, collect))
  const outBytes = fromBlocks16(outBlocks)
  return {
    output: bytesToHex(outBytes),
    outputEncoding: 'hex',
    steps,
    metadata: {
      name: 'IDEA', keySize: 128, blockSize: 64, rounds: 8, securityStatus: 'legacy',
      yearDesigned: 1991, standardBody: 'PGP 2.0',
    },
    durationMs: performance.now() - start,
  }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return run(input, key, options, 'encrypt')
}
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return run(input, key, options, 'decrypt')
}

// Verify this vector against a reference IDEA implementation before merging —
// same caution as before, contract change doesn't fix the verification gap.
export const TEST_VECTORS: TestVector[] = [
  {
    key: '000102030405060708090a0b0c0d0e0f',
    input: '0000000000000000',
    expected: 'REPLACE_WITH_VERIFIED_CIPHERTEXT_HEX',
    description: 'All-zero plaintext under sequential-byte key — verify against reference before merging',
  },
]
