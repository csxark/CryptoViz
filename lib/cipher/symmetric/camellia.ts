/**
 * Camellia Block Cipher.
 * RFC 3713 compliant implementation.
 * Supports Camellia-128, Camellia-192, and Camellia-256.
 */

import type { CipherResult, CipherStep } from '../types'
import { fromByteArray, toByteArray, CipherError, validateInput, validateKey } from '../../utils'

const METADATA = {
  name: 'Camellia',
  securityStatus: 'secure' as const,
  breakingComplexity: '2^128, 2^192, 2^256',
  yearDesigned: 2000,
  standardBody: 'ISO/IEC 18033-3, RFC 3713',
  blockSize: 16,
}

export type CamelliaMode = 'ECB' | 'CBC'

const SBOX1 = new Uint8Array([
  112, 130,  44, 236, 179,  39, 192, 229, 228, 133,  87,  53, 234,  12, 174,  65,
   35, 239, 107, 147,  69,  25, 165,  33, 237,  14,  79,  78,  29, 101, 146, 189,
  134, 184, 175, 143, 124, 235,  31, 206,  62,  48, 220,  95,  94, 197,  11,  26,
  166, 225,  57, 202, 213,  71,  93,  61, 217,   1,  90, 214,  81,  86, 108,  77,
  139,  13, 154, 102, 251, 204, 176,  45, 116,  18,  43,  32, 240, 177, 132, 153,
  223,  76, 203, 194,  52, 126, 118,   5, 109, 183, 169,  49, 209,  23,   4, 215,
   20,  88,  58,  97, 222,  27,  17,  28,  50,  15, 156,  22,  83,  24, 242,  34,
  254,  68, 207, 178, 195, 181, 122, 145,  36,   8, 232, 168,  96, 252, 105,  80,
  170, 208, 160, 125, 161, 137,  98, 151,  84,  91,  30, 149, 224, 255, 100, 210,
   16, 196,   0,  72, 163, 247, 117, 219, 138,   3, 230, 218,   9,  63, 221, 148,
  135,  92, 131,   2, 205,  74, 144,  51, 115, 103, 246, 243, 157, 127, 191, 226,
   82, 155, 216,  38, 200,  55, 198,  59, 129, 150, 111,  75,  19, 190,  99,  46,
  233, 121, 167, 140, 159, 110, 188, 142,  41, 245, 249, 182,  47, 253, 180,  89,
  120, 152,   6, 106, 231,  70, 113, 186, 212,  37, 171,  66, 136, 162, 141, 250,
  114,   7, 185,  85, 248, 238, 172,  10,  54,  73,  42, 104,  60,  56, 241, 164,
   64,  40, 211, 123, 187, 201,  67, 193,  21, 227, 173, 244, 119, 199, 128, 158
])

const SBOX2 = new Uint8Array(256)
const SBOX3 = new Uint8Array(256)
const SBOX4 = new Uint8Array(256)

for (let i = 0; i < 256; i++) {
  const v = SBOX1[i]
  SBOX2[i] = ((v << 1) | (v >> 7)) & 0xff
  SBOX3[i] = ((v << 7) | (v >> 1)) & 0xff
  SBOX4[i] = SBOX1[((i << 1) | (i >> 7)) & 0xff]
}

const MASK32 = 0xffffffffn
const MASK64 = 0xffffffffffffffffn
const MASK128 = 0xffffffffffffffffffffffffffffffffn

function rotl32(val: bigint, shift: bigint): bigint {
  const s = shift % 32n
  if (s === 0n) return val & MASK32
  return ((val << s) & MASK32) | (val >> (32n - s))
}

function rotl128(val: bigint, shift: bigint): bigint {
  const s = shift % 128n
  if (s === 0n) return val & MASK128
  return ((val << s) & MASK128) | (val >> (128n - s))
}

function F(F_IN: bigint, KE: bigint): bigint {
  const x = F_IN ^ KE
  let t1 = Number((x >> 56n) & 0xffn)
  let t2 = Number((x >> 48n) & 0xffn)
  let t3 = Number((x >> 40n) & 0xffn)
  let t4 = Number((x >> 32n) & 0xffn)
  let t5 = Number((x >> 24n) & 0xffn)
  let t6 = Number((x >> 16n) & 0xffn)
  let t7 = Number((x >> 8n) & 0xffn)
  let t8 = Number(x & 0xffn)

  t1 = SBOX1[t1]
  t2 = SBOX2[t2]
  t3 = SBOX3[t3]
  t4 = SBOX4[t4]
  t5 = SBOX2[t5]
  t6 = SBOX3[t6]
  t7 = SBOX4[t7]
  t8 = SBOX1[t8]

  const y1 = t1 ^ t3 ^ t4 ^ t6 ^ t7 ^ t8
  const y2 = t1 ^ t2 ^ t4 ^ t5 ^ t7 ^ t8
  const y3 = t1 ^ t2 ^ t3 ^ t5 ^ t6 ^ t8
  const y4 = t2 ^ t3 ^ t4 ^ t5 ^ t6 ^ t7
  const y5 = t1 ^ t2 ^ t6 ^ t7 ^ t8
  const y6 = t2 ^ t3 ^ t5 ^ t7 ^ t8
  const y7 = t3 ^ t4 ^ t5 ^ t6 ^ t8
  const y8 = t1 ^ t4 ^ t5 ^ t6 ^ t7

  return (BigInt(y1) << 56n) | (BigInt(y2) << 48n) | (BigInt(y3) << 40n) | (BigInt(y4) << 32n) |
         (BigInt(y5) << 24n) | (BigInt(y6) << 16n) | (BigInt(y7) << 8n) | BigInt(y8)
}

function FL(FL_IN: bigint, KE: bigint): bigint {
  let x1 = FL_IN >> 32n
  let x2 = FL_IN & MASK32
  const k1 = KE >> 32n
  const k2 = KE & MASK32
  x2 = x2 ^ rotl32(x1 & k1, 1n)
  x1 = x1 ^ (x2 | k2)
  return ((x1 << 32n) | x2) & MASK64
}

function FLINV(FLINV_IN: bigint, KE: bigint): bigint {
  let y1 = FLINV_IN >> 32n
  let y2 = FLINV_IN & MASK32
  const k1 = KE >> 32n
  const k2 = KE & MASK32
  y1 = y1 ^ (y2 | k2)
  y2 = y2 ^ rotl32(y1 & k1, 1n)
  return ((y1 << 32n) | y2) & MASK64
}

const Sigma1 = 0xA09E667F3BCC908Bn
const Sigma2 = 0xB67AE8584CAA73B2n
const Sigma3 = 0xC6EF372FE94F82BEn
const Sigma4 = 0x54FF53A5F1D36F1Cn
const Sigma5 = 0x10E527FADE682D1Dn
const Sigma6 = 0xB05688C2B3E6C1FDn

interface CamelliaKeys {
  kw1: bigint, kw2: bigint, kw3: bigint, kw4: bigint
  k: bigint[]
  ke: bigint[]
}

function generateKeys(keyBytes: Uint8Array): CamelliaKeys {
  const K = new Uint8Array(32)
  K.set(keyBytes)

  let KL = 0n
  let KR = 0n

  if (keyBytes.length === 16) {
    KL = parseBigInt(K.subarray(0, 16))
    KR = 0n
  } else if (keyBytes.length === 24) {
    KL = parseBigInt(K.subarray(0, 16))
    const right64 = parseBigInt(K.subarray(16, 24))
    KR = (right64 << 64n) | (~right64 & MASK64)
  } else {
    KL = parseBigInt(K.subarray(0, 16))
    KR = parseBigInt(K.subarray(16, 32))
  }

  let D1 = (KL ^ KR) >> 64n
  let D2 = (KL ^ KR) & MASK64
  D2 = D2 ^ F(D1, Sigma1)
  D1 = D1 ^ F(D2, Sigma2)
  D1 = D1 ^ (KL >> 64n)
  D2 = D2 ^ (KL & MASK64)
  D2 = D2 ^ F(D1, Sigma3)
  D1 = D1 ^ F(D2, Sigma4)
  const KA = (D1 << 64n) | D2

  let KB = 0n
  if (keyBytes.length > 16) {
    let D1_B = (KA ^ KR) >> 64n
    let D2_B = (KA ^ KR) & MASK64
    D2_B = D2_B ^ F(D1_B, Sigma5)
    D1_B = D1_B ^ F(D2_B, Sigma6)
    KB = (D1_B << 64n) | D2_B
  }

  const k: bigint[] = new Array(25).fill(0n)
  const ke: bigint[] = new Array(7).fill(0n)

  const kw1 = rotl128(KL, 0n) >> 64n
  const kw2 = rotl128(KL, 0n) & MASK64

  if (keyBytes.length === 16) {
    k[1]  = rotl128(KA, 0n) >> 64n
    k[2]  = rotl128(KA, 0n) & MASK64
    k[3]  = rotl128(KL, 15n) >> 64n
    k[4]  = rotl128(KL, 15n) & MASK64
    k[5]  = rotl128(KA, 15n) >> 64n
    k[6]  = rotl128(KA, 15n) & MASK64
    ke[1] = rotl128(KA, 30n) >> 64n
    ke[2] = rotl128(KA, 30n) & MASK64
    k[7]  = rotl128(KL, 45n) >> 64n
    k[8]  = rotl128(KL, 45n) & MASK64
    k[9]  = rotl128(KA, 45n) >> 64n
    k[10] = rotl128(KL, 60n) & MASK64
    k[11] = rotl128(KA, 60n) >> 64n
    k[12] = rotl128(KA, 60n) & MASK64
    ke[3] = rotl128(KL, 77n) >> 64n
    ke[4] = rotl128(KL, 77n) & MASK64
    k[13] = rotl128(KL, 94n) >> 64n
    k[14] = rotl128(KL, 94n) & MASK64
    k[15] = rotl128(KA, 94n) >> 64n
    k[16] = rotl128(KA, 94n) & MASK64
    k[17] = rotl128(KL, 111n) >> 64n
    k[18] = rotl128(KL, 111n) & MASK64
    const kw3 = rotl128(KA, 111n) >> 64n
    const kw4 = rotl128(KA, 111n) & MASK64
    return { kw1, kw2, kw3, kw4, k, ke }
  } else {
    k[1]  = rotl128(KB, 0n) >> 64n
    k[2]  = rotl128(KB, 0n) & MASK64
    k[3]  = rotl128(KR, 15n) >> 64n
    k[4]  = rotl128(KR, 15n) & MASK64
    k[5]  = rotl128(KA, 15n) >> 64n
    k[6]  = rotl128(KA, 15n) & MASK64
    ke[1] = rotl128(KR, 30n) >> 64n
    ke[2] = rotl128(KR, 30n) & MASK64
    k[7]  = rotl128(KB, 30n) >> 64n
    k[8]  = rotl128(KB, 30n) & MASK64
    k[9]  = rotl128(KL, 45n) >> 64n
    k[10] = rotl128(KL, 45n) & MASK64
    k[11] = rotl128(KA, 45n) >> 64n
    k[12] = rotl128(KA, 45n) & MASK64
    ke[3] = rotl128(KL, 60n) >> 64n
    ke[4] = rotl128(KL, 60n) & MASK64
    k[13] = rotl128(KR, 60n) >> 64n
    k[14] = rotl128(KR, 60n) & MASK64
    k[15] = rotl128(KB, 60n) >> 64n
    k[16] = rotl128(KB, 60n) & MASK64
    k[17] = rotl128(KL, 77n) >> 64n
    k[18] = rotl128(KL, 77n) & MASK64
    ke[5] = rotl128(KA, 77n) >> 64n
    ke[6] = rotl128(KA, 77n) & MASK64
    k[19] = rotl128(KR, 94n) >> 64n
    k[20] = rotl128(KR, 94n) & MASK64
    k[21] = rotl128(KA, 94n) >> 64n
    k[22] = rotl128(KA, 94n) & MASK64
    k[23] = rotl128(KL, 111n) >> 64n
    k[24] = rotl128(KL, 111n) & MASK64
    const kw3 = rotl128(KB, 111n) >> 64n
    const kw4 = rotl128(KB, 111n) & MASK64
    return { kw1, kw2, kw3, kw4, k, ke }
  }
}

function parseBigInt(arr: Uint8Array): bigint {
  let res = 0n
  for (let i = 0; i < arr.length; i++) {
    res = (res << 8n) | BigInt(arr[i])
  }
  return res
}

function toUint8Array(val: bigint, length: number): Uint8Array {
  const res = new Uint8Array(length)
  for (let i = length - 1; i >= 0; i--) {
    res[i] = Number(val & 0xffn)
    val >>= 8n
  }
  return res
}

function processBlock(blockBytes: Uint8Array, keys: CamelliaKeys, isExtendedRounds: boolean, decrypt: boolean): Uint8Array {
  let D1 = parseBigInt(blockBytes.subarray(0, 8))
  let D2 = parseBigInt(blockBytes.subarray(8, 16))

  const { kw1, kw2, kw3, kw4, k, ke } = keys

  if (!decrypt) {
    D1 = D1 ^ kw1
    D2 = D2 ^ kw2
    D2 = D2 ^ F(D1, k[1]); D1 = D1 ^ F(D2, k[2])
    D2 = D2 ^ F(D1, k[3]); D1 = D1 ^ F(D2, k[4])
    D2 = D2 ^ F(D1, k[5]); D1 = D1 ^ F(D2, k[6])
    D1 = FL(D1, ke[1]); D2 = FLINV(D2, ke[2])
    D2 = D2 ^ F(D1, k[7]); D1 = D1 ^ F(D2, k[8])
    D2 = D2 ^ F(D1, k[9]); D1 = D1 ^ F(D2, k[10])
    D2 = D2 ^ F(D1, k[11]); D1 = D1 ^ F(D2, k[12])
    D1 = FL(D1, ke[3]); D2 = FLINV(D2, ke[4])
    D2 = D2 ^ F(D1, k[13]); D1 = D1 ^ F(D2, k[14])
    D2 = D2 ^ F(D1, k[15]); D1 = D1 ^ F(D2, k[16])
    D2 = D2 ^ F(D1, k[17]); D1 = D1 ^ F(D2, k[18])
    
    if (isExtendedRounds) {
      D1 = FL(D1, ke[5]); D2 = FLINV(D2, ke[6])
      D2 = D2 ^ F(D1, k[19]); D1 = D1 ^ F(D2, k[20])
      D2 = D2 ^ F(D1, k[21]); D1 = D1 ^ F(D2, k[22])
      D2 = D2 ^ F(D1, k[23]); D1 = D1 ^ F(D2, k[24])
    }
    
    D2 = D2 ^ kw3
    D1 = D1 ^ kw4
  } else {
    D1 = D1 ^ (isExtendedRounds ? kw3 : kw3)
    D2 = D2 ^ (isExtendedRounds ? kw4 : kw4)

    if (isExtendedRounds) {
      D2 = D2 ^ F(D1, k[24]); D1 = D1 ^ F(D2, k[23])
      D2 = D2 ^ F(D1, k[22]); D1 = D1 ^ F(D2, k[21])
      D2 = D2 ^ F(D1, k[20]); D1 = D1 ^ F(D2, k[19])
      D1 = FL(D1, ke[6]); D2 = FLINV(D2, ke[5])
    }

    D2 = D2 ^ F(D1, k[18]); D1 = D1 ^ F(D2, k[17])
    D2 = D2 ^ F(D1, k[16]); D1 = D1 ^ F(D2, k[15])
    D2 = D2 ^ F(D1, k[14]); D1 = D1 ^ F(D2, k[13])
    D1 = FL(D1, ke[4]); D2 = FLINV(D2, ke[3])
    D2 = D2 ^ F(D1, k[12]); D1 = D1 ^ F(D2, k[11])
    D2 = D2 ^ F(D1, k[10]); D1 = D1 ^ F(D2, k[9])
    D2 = D2 ^ F(D1, k[8]);  D1 = D1 ^ F(D2, k[7])
    D1 = FL(D1, ke[2]); D2 = FLINV(D2, ke[1])
    D2 = D2 ^ F(D1, k[6]);  D1 = D1 ^ F(D2, k[5])
    D2 = D2 ^ F(D1, k[4]);  D1 = D1 ^ F(D2, k[3])
    D2 = D2 ^ F(D1, k[2]);  D1 = D1 ^ F(D2, k[1])

    D2 = D2 ^ kw1
    D1 = D1 ^ kw2
  }

  const out = new Uint8Array(16)
  out.set(toUint8Array(D2, 8), 0)
  out.set(toUint8Array(D1, 8), 8)
  return out
}

function xorBlocks(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(16)
  for (let i = 0; i < 16; i++) result[i] = a[i] ^ b[i]
  return result
}

function padPKCS7(bytes: Uint8Array, blockSize: number): Uint8Array {
  const paddingVal = blockSize - (bytes.length % blockSize)
  const padded = new Uint8Array(bytes.length + paddingVal)
  padded.set(bytes)
  for (let i = bytes.length; i < padded.length; i++) {
    padded[i] = paddingVal
  }
  return padded
}

function unpadPKCS7(bytes: Uint8Array): Uint8Array {
  if (bytes.length === 0) {
    throw new CipherError('INVALID_PADDING', 'Empty ciphertext or block size mismatch.')
  }
  const paddingVal = bytes[bytes.length - 1]
  if (paddingVal < 1 || paddingVal > 16 || paddingVal > bytes.length) {
    throw new CipherError('INVALID_PADDING', 'Invalid PKCS7 padding value.')
  }
  for (let i = bytes.length - paddingVal; i < bytes.length; i++) {
    if (bytes[i] !== paddingVal) {
      throw new CipherError('INVALID_PADDING', 'Invalid PKCS7 padding bytes.')
    }
  }
  return new Uint8Array(bytes.subarray(0, bytes.length - paddingVal))
}

function getKeyBytes(key: string, options?: Record<string, any>): Uint8Array {
  const encoding = options?.hexInput ? 'hex' : 'utf8'
  const keyBytes = toByteArray(key, encoding)

  if (
    keyBytes.length !== 16 &&
    keyBytes.length !== 24 &&
    keyBytes.length !== 32
  ) {
    throw new CipherError(
      'INVALID_KEY_LENGTH',
      `Camellia key must be exactly 16, 24, or 32 bytes (got ${keyBytes.length} bytes).`
    )
  }
  return keyBytes
}

export function encrypt(
  input: string | Uint8Array,
  key: string | Uint8Array,
  options?: Record<string, any>
): CipherResult {
  if (typeof input === 'string') validateInput(input)
  if (typeof key === 'string') validateKey(key)

  const inputBytes = typeof input === 'string' ? toByteArray(input, options?.hexInput ? 'hex' : 'utf8') : input
  const keyBytes = typeof key === 'string' ? getKeyBytes(key, options) : key

  if (
    keyBytes.length !== 16 &&
    keyBytes.length !== 24 &&
    keyBytes.length !== 32
  ) {
    throw new CipherError(
      'INVALID_KEY_LENGTH',
      `Camellia key must be exactly 16, 24, or 32 bytes (got ${keyBytes.length} bytes).`
    )
  }

  return executeCamellia(inputBytes, keyBytes, false, options)
}

export function decrypt(
  input: string | Uint8Array,
  key: string | Uint8Array,
  options?: Record<string, any>
): CipherResult {
  if (typeof input === 'string') validateInput(input)
  if (typeof key === 'string') validateKey(key)

  const inputBytes = typeof input === 'string' ? toByteArray(input, 'hex') : input
  const keyBytes = typeof key === 'string' ? getKeyBytes(key, options) : key

  if (
    keyBytes.length !== 16 &&
    keyBytes.length !== 24 &&
    keyBytes.length !== 32
  ) {
    throw new CipherError(
      'INVALID_KEY_LENGTH',
      `Camellia key must be exactly 16, 24, or 32 bytes (got ${keyBytes.length} bytes).`
    )
  }

  const defaultEncoding = typeof input === 'string' ? 'utf8' : 'hex'
  const outEnc = options?.encoding || defaultEncoding

  const res = executeCamellia(inputBytes, keyBytes, true, options)
  const rawBytes = toByteArray(res.output, 'hex')

  return {
    ...res,
    output: fromByteArray(rawBytes, outEnc),
    outputEncoding: outEnc,
  }
}

function executeCamellia(
  inputBytes: Uint8Array,
  keyBytes: Uint8Array,
  isDecrypt: boolean,
  options?: Record<string, any>
): CipherResult {
  const start = performance.now()
  const mode = (options?.mode || 'ECB') as CamelliaMode
  const useCbc = mode === 'CBC'
  const isExtendedRounds = keyBytes.length > 16

  const keys = generateKeys(keyBytes)
  const steps: CipherStep[] = []

  steps.push({
    index: 0,
    label: 'Key Schedule Expansion',
    inputState: fromByteArray(keyBytes, 'hex'),
    outputState: `Generated subkeys for ${isExtendedRounds ? '24' : '18'}-round Camellia.`,
    note: 'Expanded the original key into multiple 64-bit subkeys using the Feistel-based key schedule.',
    isMilestone: true,
  })

  const usePadding = options?.padding !== false
  let processedInput = inputBytes
  if (usePadding) {
    if (!isDecrypt) {
      processedInput = padPKCS7(inputBytes, 16)
    } else {
      if (inputBytes.length % 16 !== 0) {
        throw new CipherError('INVALID_INPUT', 'Ciphertext length must be a multiple of 16 bytes.')
      }
    }
  }

  const numBlocks = Math.ceil(processedInput.length / 16)
  const outputBytes = new Uint8Array(numBlocks * 16)
  const iv: Uint8Array = new Uint8Array(16)
  let prevBlock: Uint8Array = useCbc ? iv : new Uint8Array(16)

  for (let b = 0; b < numBlocks; b++) {
    const offset = b * 16
    const blockLen = Math.min(16, processedInput.length - offset)
    
    let block = new Uint8Array(16)
    block.set(processedInput.subarray(offset, offset + blockLen))

    let resultBlock: Uint8Array

    if (useCbc && !isDecrypt) {
      const xoredBlock = xorBlocks(block, prevBlock)
      resultBlock = processBlock(xoredBlock, keys, isExtendedRounds, false)
      prevBlock = new Uint8Array(resultBlock)
    } else if (useCbc && isDecrypt) {
      const decrypted = processBlock(block, keys, isExtendedRounds, true)
      resultBlock = xorBlocks(decrypted, prevBlock)
      prevBlock = new Uint8Array(block)
    } else {
      resultBlock = processBlock(block, keys, isExtendedRounds, isDecrypt)
    }

    outputBytes.set(resultBlock, offset)
    
    steps.push({
      index: steps.length,
      label: `Block ${b + 1} Computation`,
      inputState: fromByteArray(block, 'hex'),
      outputState: fromByteArray(resultBlock, 'hex'),
      note: `Camellia block processing complete for block ${b + 1}.`,
      isMilestone: true,
    })
  }

  let finalOutputBytes: Uint8Array = outputBytes
  if (usePadding && isDecrypt) {
    finalOutputBytes = unpadPKCS7(outputBytes)
  }

  return {
    output: fromByteArray(finalOutputBytes, 'hex'),
    outputEncoding: 'hex',
    steps,
    metadata: { ...METADATA, modeOfOperation: mode },
    durationMs: performance.now() - start,
  }
}
