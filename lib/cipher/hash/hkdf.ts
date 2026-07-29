import { hmac } from '@noble/hashes/hmac.js'
import { sha256, sha512 } from '@noble/hashes/sha2.js'
import { sha1 } from '@noble/hashes/legacy.js'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError, validateInput } from '../../utils/errors'
import type {
  CipherResult,
  CipherStep,
  CipherMetadata,
  CipherOptions,
  TestVector,
} from '../types'

const METADATA: CipherMetadata = {
  name: 'HKDF (HMAC Key Derivation)',
  securityStatus: 'secure',
  yearDesigned: 2010,
  standardBody: 'RFC 5869',
  breakingComplexity: '2^128+ operations (depends on underlying HMAC hash)',
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b',
    key: '000102030405060708090a0b0c',
    expected: '3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865',
    description: 'RFC 5869 Test Case 1 (SHA-256, L=42)',
  },
  {
    input: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeaf',
    key: '606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff',
    expected: '21b1932196f1e1c0afdc495f26c8c83d765be9cb4ce627e8abcf4d5df5e46fb3cf5a660de06f1aef1e2d02bfe63ec927d36a4e926a32993e4736c2243f0f1f703eb36a5f07b17c9ca757a3ba402292c55589',
    description: 'RFC 5869 Test Case 2 (SHA-256, L=82)',
  },
  {
    input: '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b',
    key: '',
    expected: '8da4e775a563c18f715f802a063c5a31b8a11f5c5ee1879ec3454e5f3c738d2d9d201395faa4b61a96c8',
    description: 'RFC 5869 Test Case 3 (SHA-256, Zero-Salt, L=42)',
  },
]

type HashName = 'SHA-256' | 'SHA-512' | 'SHA-1'

function getHashInfo(name: HashName = 'SHA-256') {
  switch (name) {
    case 'SHA-512':
      return { fn: sha512, len: 64, name: 'SHA-512' as const }
    case 'SHA-1':
      return { fn: sha1, len: 20, name: 'SHA-1' as const }
    case 'SHA-256':
    default:
      return { fn: sha256, len: 32, name: 'SHA-256' as const }
  }
}

function parseBytes(val: string): Uint8Array {
  if (!val) return new Uint8Array(0)
  if (/^[0-9a-fA-F]+$/.test(val) && val.length % 2 === 0) {
    return toByteArray(val, 'hex')
  }
  return toByteArray(val, 'utf8')
}

export function encrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  validateInput(input)

  const hashName: HashName = (options.hash as HashName) || 'SHA-256'
  const { fn: hashFn, len: hashLen } = getHashInfo(hashName)

  const keyLength = typeof options.keyLength === 'number' ? options.keyLength : 32

  if (keyLength <= 0) {
    throw new CipherError('INVALID_KEY_LENGTH', 'Derived key length L must be a positive integer.')
  }

  const maxAllowedLen = 255 * hashLen
  if (keyLength > maxAllowedLen) {
    throw new CipherError(
      'INVALID_KEY_LENGTH',
      `Derived key length L (${keyLength} bytes) exceeds maximum limit for ${hashName} (${maxAllowedLen} bytes).`
    )
  }

  const ikmBytes = parseBytes(input)
  const saltBytes = key ? parseBytes(key) : new Uint8Array(hashLen)
  const infoStr = typeof options.info === 'string' ? options.info : ''
  const infoBytes = parseBytes(infoStr)

  const start = performance.now()

  // 1. HKDF-Extract: PRK = HMAC-Hash(salt, IKM)
  const prk = hmac(hashFn, saltBytes, ikmBytes)

  // 2. HKDF-Expand: T(i) = HMAC-Hash(PRK, T(i-1) | info | i)
  const N = Math.ceil(keyLength / hashLen)
  const okmBlocks: Uint8Array[] = []
  let prevT = new Uint8Array(0)

  for (let i = 1; i <= N; i++) {
    const blockInput = new Uint8Array(prevT.length + infoBytes.length + 1)
    blockInput.set(prevT, 0)
    blockInput.set(infoBytes, prevT.length)
    blockInput[blockInput.length - 1] = i

    const Ti = hmac(hashFn, prk, blockInput)
    okmBlocks.push(Ti)
    prevT = Ti
  }

  // Concatenate blocks and slice to requested keyLength L
  const fullOkm = new Uint8Array(N * hashLen)
  let offset = 0
  for (const block of okmBlocks) {
    fullOkm.set(block, offset)
    offset += block.length
  }
  const okm = fullOkm.slice(0, keyLength)
  const outputHex = fromByteArray(okm, 'hex')

  if (options.instrument) {
    const steps: CipherStep[] = []

    // Step 0: Input Keying Material & Salt Resolution
    steps.push({
      index: 0,
      label: 'Input & Salt Resolution',
      inputState: fromByteArray(ikmBytes, 'hex'),
      outputState: fromByteArray(saltBytes, 'hex'),
      note: key
        ? `Salt resolved from input (${saltBytes.length} bytes).`
        : `No salt provided. Defaulted to ${hashLen} zero-bytes per RFC 5869.`,
      table: [
        { key: 'Hash Algorithm', value: hashName },
        { key: 'HashLen', value: `${hashLen} bytes` },
        { key: 'IKM Byte Size', value: `${ikmBytes.length} bytes` },
        { key: 'Salt Byte Size', value: `${saltBytes.length} bytes` },
      ],
      isMilestone: true,
    })

    // Step 1: HKDF-Extract Phase
    steps.push({
      index: 1,
      label: 'HKDF-Extract Phase (PRK Generation)',
      inputState: fromByteArray(ikmBytes, 'hex'),
      outputState: fromByteArray(prk, 'hex'),
      note: `Computed PRK = HMAC-${hashName}(Salt, IKM). Resulting Pseudorandom Key is ${prk.length} bytes long.`,
      table: [
        { key: 'Extract Formula', value: `PRK = HMAC-${hashName}(Salt, IKM)` },
        { key: 'PRK (Hex)', value: fromByteArray(prk, 'hex') },
      ],
      isMilestone: true,
    })

    // Step 2: HKDF-Expand Setup
    steps.push({
      index: 2,
      label: 'HKDF-Expand Setup',
      inputState: fromByteArray(prk, 'hex'),
      outputState: fromByteArray(infoBytes, 'hex'),
      note: `Expanding PRK into ${keyLength} bytes of Output Keying Material (OKM) across ${N} block iteration(s).`,
      table: [
        { key: 'PRK Key', value: fromByteArray(prk, 'hex') },
        { key: 'Context Info (info)', value: infoStr || '(empty)' },
        { key: 'Target Length (L)', value: `${keyLength} bytes` },
        { key: 'Blocks Required (N)', value: `${N} block(s) (ceil(${keyLength}/${hashLen}))` },
      ],
      isMilestone: true,
    })

    // Steps 3..N+2: Per-block Expand steps
    let prevBlockBytes: Uint8Array = new Uint8Array(0)
    for (let i = 1; i <= N; i++) {
      const blockInput = new Uint8Array(prevBlockBytes.length + infoBytes.length + 1)
      blockInput.set(prevBlockBytes, 0)
      blockInput.set(infoBytes, prevBlockBytes.length)
      blockInput[blockInput.length - 1] = i

      const Ti = okmBlocks[i - 1]

      steps.push({
        index: i + 2,
        label: `HKDF-Expand Block T(${i})`,
        inputState: fromByteArray(blockInput, 'hex'),
        outputState: fromByteArray(Ti, 'hex'),
        note: `Computed T(${i}) = HMAC-${hashName}(PRK, T(${i - 1}) | info | 0x${i.toString(16).padStart(2, '0')}).`,
        table: [
          { key: 'Block Index', value: `${i} of ${N}` },
          { key: 'Previous T', value: prevBlockBytes.length ? fromByteArray(prevBlockBytes, 'hex') : '(empty string T(0))' },
          { key: 'Counter Byte', value: `0x${i.toString(16).padStart(2, '0')}` },
          { key: `T(${i}) Output`, value: fromByteArray(Ti, 'hex') },
        ],
      })

      prevBlockBytes = Ti
    }

    // Step N+3: OKM Truncation & Output Assembly
    steps.push({
      index: N + 3,
      label: 'OKM Truncation & Output Assembly',
      inputState: fromByteArray(fullOkm, 'hex'),
      outputState: outputHex,
      note: `Concatenated block outputs T(1)..T(${N}) and truncated to requested length L = ${keyLength} bytes.`,
      table: [
        { key: 'Concatenated Length', value: `${fullOkm.length} bytes` },
        { key: 'Final OKM Length', value: `${okm.length} bytes` },
        { key: 'OKM (Hex)', value: outputHex },
      ],
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

  return {
    output: outputHex,
    outputEncoding: 'hex',
    steps: [],
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function decrypt(): CipherResult {
  throw new CipherError(
    'ALGORITHM_UNSUPPORTED',
    'HKDF is a key derivation function and cannot be decrypted directly.'
  )
}
