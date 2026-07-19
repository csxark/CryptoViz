import type { CipherResult, CipherStep, CipherMetadata } from '../types'
import { CipherError } from '../../utils/errors'

// ─── Constants ────────────────────────────────────────────────────────────────

const K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6] as const

const INIT_H = [
  0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0,
] as const

const METADATA: CipherMetadata = {
  name: 'SHA-1',
  securityStatus: 'broken',
  yearDesigned: 1993,
  standardBody: 'NIST FIPS 180-1 / RFC 3174',
  breakingComplexity: '2^63.1 (SHAttered collision attack, CWI/Google 2017)',
}

// ─── Bit Helpers ──────────────────────────────────────────────────────────────

function rotl32(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0
}

function u32(n: number): number {
  return n >>> 0
}

function toHex32(n: number): string {
  return u32(n).toString(16).padStart(8, '0')
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── Padding ──────────────────────────────────────────────────────────────────

function preprocess(input: Uint8Array): Uint8Array {
  const bitLen = input.length * 8
  const paddedLen = Math.ceil((input.length + 9) / 64) * 64
  const padded = new Uint8Array(paddedLen)
  padded.set(input)
  padded[input.length] = 0x80
  const dv = new DataView(padded.buffer)
  dv.setUint32(paddedLen - 8, Math.floor(bitLen / 2 ** 32), false)
  dv.setUint32(paddedLen - 4, bitLen >>> 0, false)
  return padded
}

// ─── Block Compression ────────────────────────────────────────────────────────

function compressBlock(
  blockBytes: Uint8Array,
  H: number[],
  instrument: boolean,
  steps: CipherStep[],
  blockIdx: number,
): void {
  const W = new Array<number>(80)
  const dv = new DataView(blockBytes.buffer, blockBytes.byteOffset, 64)

  for (let i = 0; i < 16; i++) W[i] = dv.getUint32(i * 4, false)
  for (let i = 16; i < 80; i++) {
    W[i] = rotl32(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1)
  }

  if (instrument && blockIdx === 0) {
    steps.push({
      index: steps.length,
      label: `Block 1 — Message schedule W[0..15]`,
      sublabel: 'First 16 words direct from block',
      inputState: bytesToHex(blockBytes.slice(0, 32)) + '...',
      outputState: W.slice(0, 16).map(toHex32).join(' '),
      note: 'W[0..15] taken directly from the 512-bit block. W[16..79] derived via ROTL¹(W[i-3]⊕W[i-8]⊕W[i-14]⊕W[i-16]).',
      isMilestone: true,
    })
  }

  let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4]

  const roundGroupLabels = ['Ch (b∧c)|(¬b∧d)', 'Parity b⊕c⊕d', 'Maj (b∧c)|(b∧d)|(c∧d)', 'Parity b⊕c⊕d']

  for (let i = 0; i < 80; i++) {
    let f: number, kIdx: number
    if (i < 20) { f = u32((b & c) | (~b & d)); kIdx = 0 }
    else if (i < 40) { f = u32(b ^ c ^ d); kIdx = 1 }
    else if (i < 60) { f = u32((b & c) | (b & d) | (c & d)); kIdx = 2 }
    else { f = u32(b ^ c ^ d); kIdx = 3 }

    const temp = u32(rotl32(a, 5) + f + e + K[kIdx] + W[i])
    e = d; d = c; c = rotl32(b, 30); b = a; a = temp

    if (instrument) {
      const isMilestone = i === 19 || i === 39 || i === 59 || i === 79
      steps.push({
        index: steps.length,
        label: `Block ${blockIdx + 1} — Round ${i + 1} / 80`,
        sublabel: roundGroupLabels[kIdx],
        inputState: `W[${i}]=${toHex32(W[i])} K=${toHex32(K[kIdx])}`,
        outputState: `a=${toHex32(a)} e=${toHex32(e)}`,
        note: `ROTL⁵(a)+${roundGroupLabels[kIdx]}+e+K${kIdx}+W[${i}] = ${toHex32(temp)}`,
        isMilestone,
        table: isMilestone
          ? [
              { key: 'a', value: toHex32(a) },
              { key: 'b', value: toHex32(b) },
              { key: 'c', value: toHex32(c) },
              { key: 'd', value: toHex32(d) },
              { key: 'e', value: toHex32(e) },
            ]
          : undefined,
      })
    }
  }

  H[0] = u32(H[0] + a)
  H[1] = u32(H[1] + b)
  H[2] = u32(H[2] + c)
  H[3] = u32(H[3] + d)
  H[4] = u32(H[4] + e)
}

// ─── Core Engine ──────────────────────────────────────────────────────────────

function sha1core(
  input: Uint8Array,
  instrument: boolean,
): { digest: Uint8Array; steps: CipherStep[] } {
  const steps: CipherStep[] = []
  const padded = preprocess(input)
  const numBlocks = padded.length / 64
  const H = [...INIT_H]

  if (instrument) {
    steps.push({
      index: 0,
      label: 'Preprocessing — Padding',
      inputState: `${input.length} byte(s)`,
      outputState: `${padded.length} bytes / ${numBlocks} block(s)`,
      note: 'Appended 0x80, zero-padded to 448 mod 512 bits, then appended original length as 64-bit big-endian.',
      isMilestone: true,
      table: [
        { key: 'Original length', value: `${input.length} byte(s)` },
        { key: 'Padded length', value: `${padded.length} bytes` },
        { key: 'Blocks', value: `${numBlocks}` },
      ],
    })
    steps.push({
      index: 1,
      label: 'Initialize hash state (H0–H4)',
      inputState: '',
      outputState: H.map(toHex32).join(' '),
      note: 'Five 32-bit initial values derived from fractional parts of sqrt of the first 5 primes (2,3,5,7,11).',
      isMilestone: true,
      table: H.map((h, i) => ({ key: `H${i}`, value: toHex32(h) })),
    })
  }

  for (let b = 0; b < numBlocks; b++) {
    compressBlock(padded.slice(b * 64, b * 64 + 64), H, instrument, steps, b)
    if (instrument) {
      steps.push({
        index: steps.length,
        label: `Block ${b + 1} — Update hash state`,
        inputState: '',
        outputState: H.map(toHex32).join(' '),
        note: `Added block ${b + 1} compressed values into H0–H4 (mod 2³²). ${b + 1 < numBlocks ? `${numBlocks - b - 1} block(s) remaining.` : 'Final block processed.'}`,
        isMilestone: true,
        table: H.map((h, i) => ({ key: `H${i}`, value: toHex32(h) })),
      })
    }
  }

  const digest = new Uint8Array(20)
  const dv = new DataView(digest.buffer)
  H.forEach((h, i) => dv.setUint32(i * 4, h, false))

  if (instrument) {
    steps.push({
      index: steps.length,
      label: '⚠️ SHA-1 Digest (BROKEN)',
      inputState: '',
      outputState: bytesToHex(digest),
      note: '⚠️ SHA-1 is BROKEN. The SHAttered attack (Google/CWI, 2017) produced the first practical SHA-1 collision in ~2^63 operations. SHA-1 must NOT be used for any security-critical purpose (TLS certificates, code signing, digital signatures). Use SHA-256 or SHA-3 instead.',
      isMilestone: true,
    })
  }

  return { digest, steps }
}

// ─── Input Validation ─────────────────────────────────────────────────────────

function validate(input: string): Uint8Array {
  if (input === undefined || input === null || input === '') {
    throw new CipherError('INPUT_REQUIRED', 'Input message is required.')
  }
  const bytes = new TextEncoder().encode(input)
  if (bytes.length > 4096) {
    throw new CipherError('INPUT_TOO_LONG', 'Input exceeds maximum allowed size of 4096 bytes.')
  }
  return bytes
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function encrypt(
  input: string,
  _key: string,
  options: { instrument?: boolean } = {},
): CipherResult {
  const t0 = performance.now()
  const bytes = validate(input)
  const { digest, steps } = sha1core(bytes, options.instrument === true)
  const output = bytesToHex(digest)
  return {
    output,
    outputEncoding: 'hex',
    steps,
    metadata: { ...METADATA, keySize: undefined, blockSize: 512, rounds: 80 },
    durationMs: performance.now() - t0,
  }
}

// SHA-1 is a one-way hash — decrypt is not meaningful; expose same function
// so the worker contract is satisfied (returns hash of input)
export function decrypt(): CipherResult {
  return {
    output: 'SHA-1 is a one-way hash function. Decryption is not defined.',
    outputEncoding: 'utf8' as const,
    steps: [],
    metadata: { ...METADATA, blockSize: 512, rounds: 80 },
    durationMs: 0,
  }
}

// ─── Test Vectors ─────────────────────────────────────────────────────────────

export const TEST_VECTORS = [
  {
    input: 'abc',
    key: '',
    expected: 'a9993e364706816aba3e25717850c26c9cd0d89d',
    description: 'FIPS 180-1 / RFC 3174 vector 1',
  },
  {
    input: '',
    key: '',
    expected: 'da39a3ee5e6b4b0d3255bfef95601890afd80709',
    description: 'Empty string (FIPS 180-4)',
  },
  {
    input: 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
    key: '',
    expected: '84983e441c3bd26ebaae4aa1f95129e5e54670f1',
    description: 'FIPS 180-1 vector 2 (two-block input)',
  },
  {
    input: 'The quick brown fox jumps over the lazy dog',
    key: '',
    expected: '2fd4e1c67a2d28fced849ee1bb76e7391b93eb12',
    description: 'Common test sentence',
  },
] as const
