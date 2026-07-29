import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'SM3',
  blockSize: 64, // 512 bits
  rounds: 64,
  securityStatus: 'secure',
  yearDesigned: 2010,
  standardBody: 'GB/T 32905-2016 / OSCCA',
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: 'abc',
    key: '',
    expected: '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0',
    description: 'OSCCA / GB/T 32905-2016 standard vector 1',
  },
  {
    input: '',
    key: '',
    expected: '1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b',
    description: 'OSCCA / GB/T 32905-2016 standard vector for empty input',
  },
  {
    input: 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
    key: '',
    expected: 'debe9ff92275b8a138604889c18e5a4d6fdb70e5387e5765293dcba39c0c5732',
    description: 'OSCCA / GB/T 32905-2016 standard vector 2 (56 bytes)',
  },
]

const IV = new Uint32Array([
  0x7380166f, 0x4914b2b9, 0x172442d7, 0xda8a0600,
  0xa96f30bc, 0x163138aa, 0xe38dee4d, 0xb0fb0e4e,
])

function rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0
}

function P0(x: number): number {
  return (x ^ rotl(x, 9) ^ rotl(x, 17)) >>> 0
}

function P1(x: number): number {
  return (x ^ rotl(x, 15) ^ rotl(x, 23)) >>> 0
}

function FF(j: number, x: number, y: number, z: number): number {
  if (j >= 0 && j <= 15) {
    return (x ^ y ^ z) >>> 0
  }
  return ((x & y) | (x & z) | (y & z)) >>> 0
}

function GG(j: number, x: number, y: number, z: number): number {
  if (j >= 0 && j <= 15) {
    return (x ^ y ^ z) >>> 0
  }
  return ((x & y) | (~x & z)) >>> 0
}

function T(j: number): number {
  return j >= 0 && j <= 15 ? 0x79cc4519 : 0x7a6d76e9
}

export function validateHashInput(input: unknown): asserts input is string {
  if (input === null || input === undefined) {
    throw new CipherError('INPUT_REQUIRED', 'Input is required.')
  }
  if (typeof input !== 'string') {
    throw new CipherError('INPUT_REQUIRED', 'Input must be a string.')
  }
  const byteLength = new TextEncoder().encode(input).length
  if (byteLength > 2 * 1024 * 1024) {
    throw new CipherError('INPUT_TOO_LONG', `Input exceeds maximum size of 2MB (got ${byteLength}).`)
  }
}

function padMessage(inputBytes: Uint8Array): Uint8Array {
  const originalLenBits = inputBytes.length * 8
  const padLen = (448 - (originalLenBits + 8) % 512 + 512) % 512
  const paddedLenBytes = (originalLenBits + 8 + padLen + 64) / 8
  const padded = new Uint8Array(paddedLenBytes)
  padded.set(inputBytes, 0)
  padded[inputBytes.length] = 0x80

  const view = new DataView(padded.buffer)
  // Length as 64-bit big endian integer
  const highBits = Math.floor(originalLenBits / 0x100000000)
  const lowBits = originalLenBits % 0x100000000
  view.setUint32(paddedLenBytes - 8, highBits)
  view.setUint32(paddedLenBytes - 4, lowBits)

  return padded
}

function sm3Fast(inputBytes: Uint8Array): string {
  const padded = padMessage(inputBytes)
  const V = new Uint32Array(IV)
  const numBlocks = padded.length / 64

  const W = new Uint32Array(68)
  const W1 = new Uint32Array(64)

  for (let b = 0; b < numBlocks; b++) {
    const blockView = new DataView(padded.buffer, b * 64, 64)
    for (let i = 0; i < 16; i++) {
      W[i] = blockView.getUint32(i * 4)
    }
    for (let j = 16; j < 68; j++) {
      W[j] = (P1(W[j - 16] ^ W[j - 9] ^ rotl(W[j - 3], 15)) ^ rotl(W[j - 13], 7) ^ W[j - 6]) >>> 0
    }
    for (let j = 0; j < 64; j++) {
      W1[j] = (W[j] ^ W[j + 4]) >>> 0
    }

    let a = V[0]
    let bVar = V[1]
    let c = V[2]
    let d = V[3]
    let e = V[4]
    let f = V[5]
    let g = V[6]
    let h = V[7]

    for (let j = 0; j < 64; j++) {
      const ss1 = rotl((rotl(a, 12) + e + rotl(T(j), j % 32)) >>> 0, 7)
      const ss2 = (ss1 ^ rotl(a, 12)) >>> 0
      const tt1 = (FF(j, a, bVar, c) + d + ss2 + W1[j]) >>> 0
      const tt2 = (GG(j, e, f, g) + h + ss1 + W[j]) >>> 0

      d = c
      c = rotl(bVar, 9)
      bVar = a
      a = tt1
      h = g
      g = rotl(f, 19)
      f = e
      e = P0(tt2)
    }

    V[0] = (V[0] ^ a) >>> 0
    V[1] = (V[1] ^ bVar) >>> 0
    V[2] = (V[2] ^ c) >>> 0
    V[3] = (V[3] ^ d) >>> 0
    V[4] = (V[4] ^ e) >>> 0
    V[5] = (V[5] ^ f) >>> 0
    V[6] = (V[6] ^ g) >>> 0
    V[7] = (V[7] ^ h) >>> 0
  }

  return Array.from(V).map(val => val.toString(16).padStart(8, '0')).join('')
}

function sm3Instrumented(inputBytes: Uint8Array): CipherResult {
  const start = performance.now()
  const steps: CipherStep[] = []

  const padded = padMessage(inputBytes)
  steps.push({
    index: 0,
    label: 'Preprocessing - padding',
    inputState: fromByteArray(inputBytes, 'hex'),
    outputState: fromByteArray(padded, 'hex'),
    table: [
      { key: 'Original length', value: `${inputBytes.length} bytes (${inputBytes.length * 8} bits)` },
      { key: 'Padded length', value: `${padded.length} bytes (${padded.length * 8} bits)` },
    ],
    note: 'Appended bit 1 (0x80), zero-padded until length ≡ 448 mod 512 bits, and appended 64-bit big-endian message length.',
    isMilestone: true,
  })

  const V = new Uint32Array(IV)
  steps.push({
    index: steps.length,
    label: 'Initialize IV state',
    inputState: '',
    outputState: Array.from(V).map(val => val.toString(16).padStart(8, '0')).join(''),
    table: Array.from(V).map((val, idx) => ({
      key: `V[${idx}] (H${idx})`,
      value: '0x' + val.toString(16).padStart(8, '0'),
    })),
    note: 'Loaded standard 256-bit initial vector (IV) registers H0..H7.',
    isMilestone: true,
  })

  const numBlocks = padded.length / 64
  const W = new Uint32Array(68)
  const W1 = new Uint32Array(64)

  for (let b = 0; b < numBlocks; b++) {
    const blockView = new DataView(padded.buffer, b * 64, 64)
    for (let i = 0; i < 16; i++) {
      W[i] = blockView.getUint32(i * 4)
    }
    for (let j = 16; j < 68; j++) {
      W[j] = (P1(W[j - 16] ^ W[j - 9] ^ rotl(W[j - 3], 15)) ^ rotl(W[j - 13], 7) ^ W[j - 6]) >>> 0
    }
    for (let j = 0; j < 64; j++) {
      W1[j] = (W[j] ^ W[j + 4]) >>> 0
    }

    if (b === 0) {
      // Record message schedule W[0..15]
      const wRows4x4 = Array.from({ length: 4 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => {
          const val = W[r * 4 + c]
          return '0x' + val.toString(16).padStart(8, '0')
        })
      )
      steps.push({
        index: steps.length,
        label: 'Message schedule W[0..15]',
        inputState: fromByteArray(padded.slice(0, 64), 'hex'),
        outputState: '',
        matrix: wRows4x4,
        note: 'Extracted first 16 words directly from block 1.',
      })

      // Record message schedule expansion
      steps.push({
        index: steps.length,
        label: 'Message schedule expansion W[16..67]',
        inputState: '',
        outputState: '',
        note: 'Expanded W[16..67] using permutation P1 and bitwise rotations.',
      })

      steps.push({
        index: steps.length,
        label: 'Message schedule XOR W\'[0..63]',
        inputState: '',
        outputState: '',
        note: 'Computed W\'[j] = W[j] XOR W[j+4] for j = 0..63.',
      })

      // Initialize working variables
      let a = V[0]
      let bVar = V[1]
      let c = V[2]
      let d = V[3]
      let e = V[4]
      let f = V[5]
      let g = V[6]
      let h = V[7]

      steps.push({
        index: steps.length,
        label: 'Initialize working variables',
        inputState: '',
        outputState: '',
        table: [
          { key: 'A', value: '0x' + a.toString(16).padStart(8, '0') },
          { key: 'B', value: '0x' + bVar.toString(16).padStart(8, '0') },
          { key: 'C', value: '0x' + c.toString(16).padStart(8, '0') },
          { key: 'D', value: '0x' + d.toString(16).padStart(8, '0') },
          { key: 'E', value: '0x' + e.toString(16).padStart(8, '0') },
          { key: 'F', value: '0x' + f.toString(16).padStart(8, '0') },
          { key: 'G', value: '0x' + g.toString(16).padStart(8, '0') },
          { key: 'H', value: '0x' + h.toString(16).padStart(8, '0') },
        ],
        note: 'Set working variables A..H to current IV hash state.',
        isMilestone: true,
      })

      // 64 compression rounds
      for (let j = 0; j < 64; j++) {
        const ss1 = rotl((rotl(a, 12) + e + rotl(T(j), j % 32)) >>> 0, 7)
        const ss2 = (ss1 ^ rotl(a, 12)) >>> 0
        const tt1 = (FF(j, a, bVar, c) + d + ss2 + W1[j]) >>> 0
        const tt2 = (GG(j, e, f, g) + h + ss1 + W[j]) >>> 0

        d = c
        c = rotl(bVar, 9)
        bVar = a
        a = tt1
        h = g
        g = rotl(f, 19)
        f = e
        e = P0(tt2)

        steps.push({
          index: steps.length,
          label: `Round ${j}`,
          inputState: '',
          outputState: '',
          table: [
            { key: `W[${j}]`, value: '0x' + W[j].toString(16).padStart(8, '0') },
            { key: `W'[${j}]`, value: '0x' + W1[j].toString(16).padStart(8, '0') },
            { key: 'SS1', value: '0x' + ss1.toString(16).padStart(8, '0') },
            { key: 'SS2', value: '0x' + ss2.toString(16).padStart(8, '0') },
            { key: 'TT1 (new A)', value: '0x' + a.toString(16).padStart(8, '0') },
            { key: 'P0(TT2) (new E)', value: '0x' + e.toString(16).padStart(8, '0') },
          ],
          note: `Completed SM3 compression round ${j} (${j < 16 ? 'Rounds 0-15 XOR functions' : 'Rounds 16-63 majority/choice functions'}).`,
        })
      }

      // Block update: V^(i+1) = V^(i) XOR (A,B,C,D,E,F,G,H)
      V[0] = (V[0] ^ a) >>> 0
      V[1] = (V[1] ^ bVar) >>> 0
      V[2] = (V[2] ^ c) >>> 0
      V[3] = (V[3] ^ d) >>> 0
      V[4] = (V[4] ^ e) >>> 0
      V[5] = (V[5] ^ f) >>> 0
      V[6] = (V[6] ^ g) >>> 0
      V[7] = (V[7] ^ h) >>> 0

      steps.push({
        index: steps.length,
        label: 'Update hash state (Bitwise XOR)',
        inputState: '',
        outputState: Array.from(V).map(val => val.toString(16).padStart(8, '0')).join(''),
        note: 'XORed compressed working variables A..H with the previous hash state V.',
        isMilestone: true,
      })
    } else {
      let a = V[0]
      let bVar = V[1]
      let c = V[2]
      let d = V[3]
      let e = V[4]
      let f = V[5]
      let g = V[6]
      let h = V[7]

      for (let j = 0; j < 64; j++) {
        const ss1 = rotl((rotl(a, 12) + e + rotl(T(j), j % 32)) >>> 0, 7)
        const ss2 = (ss1 ^ rotl(a, 12)) >>> 0
        const tt1 = (FF(j, a, bVar, c) + d + ss2 + W1[j]) >>> 0
        const tt2 = (GG(j, e, f, g) + h + ss1 + W[j]) >>> 0

        d = c
        c = rotl(bVar, 9)
        bVar = a
        a = tt1
        h = g
        g = rotl(f, 19)
        f = e
        e = P0(tt2)
      }

      V[0] = (V[0] ^ a) >>> 0
      V[1] = (V[1] ^ bVar) >>> 0
      V[2] = (V[2] ^ c) >>> 0
      V[3] = (V[3] ^ d) >>> 0
      V[4] = (V[4] ^ e) >>> 0
      V[5] = (V[5] ^ f) >>> 0
      V[6] = (V[6] ^ g) >>> 0
      V[7] = (V[7] ^ h) >>> 0
    }
  }

  const outputHex = Array.from(V).map(val => val.toString(16).padStart(8, '0')).join('')

  steps.push({
    index: steps.length,
    label: 'Final hash output',
    inputState: '',
    outputState: outputHex,
    note: 'Concatenated state registers V0..V7 to form the final 256-bit SM3 digest.',
    isMilestone: true,
  })

  return {
    output: outputHex,
    outputEncoding: 'hex',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function encrypt(
  input: string,
  key: string = '',
  options: CipherOptions = {}
): CipherResult {
  validateHashInput(input)
  const inputBytes = toByteArray(input, options.encoding || 'utf8')

  if (options.instrument) {
    return sm3Instrumented(inputBytes)
  }

  const start = performance.now()
  const output = sm3Fast(inputBytes)
  return {
    output,
    outputEncoding: 'hex',
    steps: [],
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function decrypt(
  input: string,
  key: string = '',
  options: CipherOptions = {}
): CipherResult {
  throw new CipherError(
    'ALGORITHM_UNSUPPORTED',
    'One-way cryptographic hash functions do not support decryption.'
  )
}
