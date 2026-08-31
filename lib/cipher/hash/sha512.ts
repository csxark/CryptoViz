import { sha512 } from '@noble/hashes/sha2.js'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError } from '../../utils/errors'
import { validateHashInput } from './sha256'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'SHA-512',
  blockSize: 128, // 1024 bits
  rounds: 80,
  securityStatus: 'secure',
  yearDesigned: 2001,
  standardBody: 'NIST',
}

/**
 * TEST VECTORS cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: 'abc',
    key: '',
    expected: 'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
    description: 'NIST standard vector 1',
  },
  {
    input: '',
    key: '',
    expected: 'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e',
    description: 'NIST standard vector for empty input',
  },
]

const K_512 = [
  0x428a2f98d728ae22n, 0x7137449123ef65cdn, 0xb5c0fbcfec4d3b2fn, 0xe9b5dba58189dbbcn,
  0x3956c25bf348b538n, 0x59f111f1b605d019n, 0x923f82a4af194f9bn, 0xab1c5ed5da6d8118n,
  0xd807aa98a3030242n, 0x12835b0145706fben, 0x243185be4ee4b28cn, 0x550c7dc3d5ffb4e2n,
  0x72be5d74f27b896fn, 0x80deb1fe3b1696b1n, 0x9bdc06a725c71235n, 0xc19bf174cf692694n,
  0xe49b69c19ef14ad2n, 0xefbe4786384f25e3n, 0x0fc19dc68b8cd5b5n, 0x240ca1cc77ac9c65n,
  0x2de92c6f592b0275n, 0x4a7484aa6ea6e483n, 0x5cb0a9dcbd41fbd4n, 0x76f988da831153b5n,
  0x983e5152ee66dfabn, 0xa831c66d2db43210n, 0xb00327c898fb213fn, 0xbf597fc7beef0ee4n,
  0xc6e00bf33da88fc2n, 0xd5a79147930aa725n, 0x06ca6351e003826fn, 0x142929670a0e6e70n,
  0x27b70a8546d22ffcn, 0x2e1b21385c26c926n, 0x4d2c6dfc5ac42aedn, 0x53380d139d95b3dfn,
  0x650a73548baf63den, 0x766a0abb3c77b2a8n, 0x81c2c92e47edaee6n, 0x92722c851482353bn,
  0xa2bfe8a14cf10364n, 0xa81a664bbc423001n, 0xc24b8b70d0f89791n, 0xc76c51a30654be30n,
  0xd192e819d6ef5218n, 0xd69906245565a910n, 0xf40e358557712023n, 0x106aa07032bbd1b8n,
  0x19a4c116b8d2d0c8n, 0x1e376c085141ab53n, 0x2748774cdf8eeb99n, 0x34b0bcb5e19b48a8n,
  0x391c0cb3c5c95a63n, 0x4ed8aa4ae3418acbn, 0x5b9cca4f7763e373n, 0x682e6ff3d6b2b8a3n,
  0x748f82ee5defb2fcn, 0x78a5636f43172f60n, 0x84c87814a1f0ab72n, 0x8cc702081a6439ecn,
  0x90befffa23631e28n, 0xa4506cebde82bde9n, 0xbef9a3f7b2c67915n, 0xc67178f240f90e9cn,
  0xca273e923e104e76n, 0xd199c8286a5a759n, 0xd43034914c6e917dn, 0xd81335b248a335f6n,
  0xdd391f6c44950346n, 0xf367c067858c894en, 0x0a6f5349e59d9972n, 0x11463e27301c4a5cn,
  0x1629837a77e5d263n, 0x1a99602e1b12f716n, 0x290132b4f654b9d0n, 0x33c37357c32e9202n,
  0x40030588691501c5n, 0x473729e7943d0e2dn, 0x5727409f0631677cn, 0x596350f5556277b9n,
  0x61250785055b410cn, 0x6d97c63b4b568019n, 0x759f23714b62f186n, 0x7617b0a793a3889fn,
  0x785d0642940026e6n, 0x8056464522a16d56n, 0x84501a3517865c36n, 0x8d2c88461750b3f8n,
  0x9037c809623832d8n, 0x9449f8745c43d78cn, 0x99c75464169542a1n, 0xa8a8c08832a242f2n,
  0xb11e741753176f57n, 0xc4a8a25a3d75c61an, 0xcbf023a105c31754n, 0xd65a6f23f6634c56n,
  0xd84d436894c77209n, 0xde155f948f93630fn, 0x1289196d034268e3n, 0x6a6d6e68d0442385n,
  0x6c467b6067b5797fn, 0x702953258c7041a7n, 0x7119e8432367a72dn, 0x741639f7535b430cn,
  0x7719602505541671n, 0x78475253818e6e58n, 0x7a829e1f57520448n, 0x7c79e64e526487e6n,
  0x7d509f692a8325a7n, 0x7f8337775f0f3536n, 0x8292c31e9a031976n, 0x86e08210137d3567n,
  0x8758837e28b813b1n, 0x8a13a86071728117n, 0x90a5d20473a213e8n, 0x985a9756b5090407n,
  0x9ab787031359c256n, 0x9ed21d1208a0d421n, 0xc000e34b97a22781n,
]

const H_INIT_512 = [
  0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n,
  0x510e527fade682d1n, 0x9b05688c2b3e6c1fn, 0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n,
]

const MASK64 = (1n << 64n) - 1n

function rotr64(x: bigint, n: bigint): bigint {
  return (((x >> n) | (x << (64n - n))) & MASK64)
}

function sigma0_64(x: bigint): bigint {
  return rotr64(x, 1n) ^ rotr64(x, 8n) ^ (x >> 7n)
}

function sigma1_64(x: bigint): bigint {
  return rotr64(x, 19n) ^ rotr64(x, 61n) ^ (x >> 6n)
}

function SIGMA0_64(x: bigint): bigint {
  return rotr64(x, 28n) ^ rotr64(x, 34n) ^ rotr64(x, 39n)
}

function SIGMA1_64(x: bigint): bigint {
  return rotr64(x, 14n) ^ rotr64(x, 18n) ^ rotr64(x, 41n)
}

function Ch64(x: bigint, y: bigint, z: bigint): bigint {
  return (x & y) ^ (~x & z)
}

function Maj64(x: bigint, y: bigint, z: bigint): bigint {
  return (x & y) ^ (x & z) ^ (y & z)
}

function sha512Fast(inputBytes: Uint8Array): string {
  const hashBytes = sha512(inputBytes)
  return fromByteArray(hashBytes, 'hex')
}

function sha512Instrumented(inputBytes: Uint8Array): CipherResult {
  const start = performance.now()
  const steps: CipherStep[] = []

  // Preprocessing / padding for 1024-bit block size
  const originalLenBits = BigInt(inputBytes.length * 8)
  
  // pad with '1' bit, then zeros until 896 mod 1024 bits
  // then append 128-bit big-endian length
  const modBits = (originalLenBits + 8n) % 1024n
  const padLenBits = (896n - modBits + 1024n) % 1024n
  const paddedLenBytes = Number((originalLenBits + 8n + padLenBits + 128n) / 8n)
  
  const padded = new Uint8Array(paddedLenBytes)
  padded.set(inputBytes, 0)
  padded[inputBytes.length] = 0x80

  const view = new DataView(padded.buffer)
  // Set 128-bit length (big-endian) at the end
  const low64 = originalLenBits & MASK64
  const high64 = (originalLenBits >> 64n) & MASK64
  view.setBigUint64(paddedLenBytes - 8, low64, false)
  view.setBigUint64(paddedLenBytes - 16, high64, false)

  steps.push({
    index: 0,
    label: 'Preprocessing - padding',
    inputState: fromByteArray(inputBytes, 'hex'),
    outputState: fromByteArray(padded, 'hex'),
    table: [
      { key: 'Original length', value: `${inputBytes.length} bytes` },
      { key: 'Padded length', value: `${paddedLenBytes} bytes` },
    ],
    note: 'Appended bit 1 (0x80), zero-padded until length = 896 mod 1024 bits, and appended original length as 128-bit big-endian integer.',
    isMilestone: true,
  })

  // Initialize state
  const H = [...H_INIT_512]

  const numBlocks = padded.length / 128

  for (let b = 0; b < numBlocks; b++) {
    const block = padded.slice(b * 128, (b + 1) * 128)
    const isFirstBlock = b === 0

    const W = new BigUint64Array(80)
    const blockView = new DataView(block.buffer)
    for (let i = 0; i < 16; i++) {
      W[i] = blockView.getBigUint64(i * 8, false)
    }
    for (let i = 16; i < 80; i++) {
      W[i] = (sigma1_64(W[i - 2]) + W[i - 7] + sigma0_64(W[i - 15]) + W[i - 16]) & MASK64
    }

    if (isFirstBlock) {
      // Step 1: W[0..15]
      const wRows4x4 = Array.from({ length: 4 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => {
          const val = W[r * 4 + c]
          return '0x' + val.toString(16).padStart(16, '0')
        })
      )
      steps.push({
        index: steps.length,
        label: 'Message schedule W[0..15]',
        inputState: fromByteArray(block, 'hex'),
        outputState: '',
        matrix: wRows4x4,
        note: 'Extracted first 16 64-bit words directly from block 1.',
      })

      // Step 2-5: W[16..31], W[32..47], W[48..63], W[64..79]
      for (let wGroup = 1; wGroup <= 4; wGroup++) {
        const startIdx = wGroup * 16
        const endIdx = startIdx + 15
        steps.push({
          index: steps.length,
          label: `Message schedule W[${startIdx}..${endIdx}]`,
          inputState: '',
          outputState: '',
          note: `Expanded 64-bit message schedule words using 64-bit sigma functions.`,
        })
      }

      // Initialize working vars
      let [a, bVar, c, d, e, f, g, h] = H
      steps.push({
        index: steps.length,
        label: 'Initialize working variables',
        inputState: '',
        outputState: '',
        table: [
          { key: 'a', value: '0x' + a.toString(16).padStart(16, '0') },
          { key: 'b', value: '0x' + bVar.toString(16).padStart(16, '0') },
          { key: 'c', value: '0x' + c.toString(16).padStart(16, '0') },
          { key: 'd', value: '0x' + d.toString(16).padStart(16, '0') },
          { key: 'e', value: '0x' + e.toString(16).padStart(16, '0') },
          { key: 'f', value: '0x' + f.toString(16).padStart(16, '0') },
          { key: 'g', value: '0x' + g.toString(16).padStart(16, '0') },
          { key: 'h', value: '0x' + h.toString(16).padStart(16, '0') },
        ],
        note: 'Set 64-bit working variables to current hash state.',
        isMilestone: true,
      })

      // 80 compression rounds
      for (let i = 0; i < 80; i++) {
        const T1 = (h + SIGMA1_64(e) + Ch64(e, f, g) + K_512[i] + W[i]) & MASK64
        const T2 = (SIGMA0_64(a) + Maj64(a, bVar, c)) & MASK64

        h = g
        g = f
        f = e
        e = (d + T1) & MASK64
        d = c
        c = bVar
        bVar = a
        a = (T1 + T2) & MASK64

        steps.push({
          index: steps.length,
          label: `Round ${i}`,
          inputState: '',
          outputState: '',
          table: [
            { key: `W[${i}]`, value: '0x' + W[i].toString(16).padStart(16, '0') },
            { key: `K[${i}]`, value: '0x' + K_512[i].toString(16).padStart(16, '0') },
            { key: 'T1', value: '0x' + T1.toString(16).padStart(16, '0') },
            { key: 'T2', value: '0x' + T2.toString(16).padStart(16, '0') },
            { key: 'new a', value: '0x' + a.toString(16).padStart(16, '0') },
            { key: 'new e', value: '0x' + e.toString(16).padStart(16, '0') },
          ],
          note: `Completed SHA-512 compression round ${i}.`,
        })
      }

      H[0] = (H[0] + a) & MASK64
      H[1] = (H[1] + bVar) & MASK64
      H[2] = (H[2] + c) & MASK64
      H[3] = (H[3] + d) & MASK64
      H[4] = (H[4] + e) & MASK64
      H[5] = (H[5] + f) & MASK64
      H[6] = (H[6] + g) & MASK64
      H[7] = (H[7] + h) & MASK64

      steps.push({
        index: steps.length,
        label: 'Add to hash state',
        inputState: '',
        outputState: '',
        note: 'Added compressed working variables back to the hash state (modulo 2^64).',
        isMilestone: true,
      })
    } else {
      let [a, bVar, c, d, e, f, g, h] = H
      for (let i = 0; i < 80; i++) {
        const T1 = (h + SIGMA1_64(e) + Ch64(e, f, g) + K_512[i] + W[i]) & MASK64
        const T2 = (SIGMA0_64(a) + Maj64(a, bVar, c)) & MASK64
        h = g
        g = f
        f = e
        e = (d + T1) & MASK64
        d = c
        c = bVar
        bVar = a
        a = (T1 + T2) & MASK64
      }
      H[0] = (H[0] + a) & MASK64
      H[1] = (H[1] + bVar) & MASK64
      H[2] = (H[2] + c) & MASK64
      H[3] = (H[3] + d) & MASK64
      H[4] = (H[4] + e) & MASK64
      H[5] = (H[5] + f) & MASK64
      H[6] = (H[6] + g) & MASK64
      H[7] = (H[7] + h) & MASK64
    }
  }

  const outputHex = H.map(val => val.toString(16).padStart(16, '0')).join('')

  steps.push({
    index: steps.length,
    label: 'Final hash output',
    inputState: '',
    outputState: outputHex,
    note: 'Concatenated H0 through H7 to yield the final 512-bit message digest.',
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

/**
 * Encrypt cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(
  input: string,
  _key: string = '',
  options: CipherOptions = {}
): CipherResult {
  validateHashInput(input)
  const inputBytes = toByteArray(input, options.encoding || 'utf8')

  if (options.instrument) {
    return sha512Instrumented(inputBytes)
  }

  const start = performance.now()
  const output = sha512Fast(inputBytes)
  return {
    output,
    outputEncoding: 'hex',
    steps: [],
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

/**
 * Decrypt cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decrypt(
  input: string,
  _key: string = '',
  _options: CipherOptions = {}
): CipherResult {
  throw new CipherError(
    'ALGORITHM_UNSUPPORTED',
    'One-way cryptographic hash functions do not support decryption.'
  )
}
