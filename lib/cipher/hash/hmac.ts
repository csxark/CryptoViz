import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import { CipherError, validateInput, validateKey } from '../../utils/errors'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'HMAC-SHA256',
  blockSize: 64, // 512 bits
  securityStatus: 'secure',
  yearDesigned: 1996,
  standardBody: 'RFC 2104 / FIPS 198',
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: 'Hi There',
    key: '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b',
    expected: 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
    description: 'RFC 4231 Test Case 1',
  },
  {
    input: 'what do ya want for nothing?',
    key: 'Jefe',
    expected: '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    description: 'RFC 4231 Test Case 2',
  },
]

function parseKey(key: string): Uint8Array {
  // Auto-detect hex key if it is valid hex and even length
  if (/^[0-9a-fA-F]+$/.test(key) && key.length % 2 === 0) {
    return toByteArray(key, 'hex')
  }
  return toByteArray(key, 'utf8')
}

export function encrypt(
  input: string,
  key: string,
  options: CipherOptions = {}
): CipherResult {
  validateInput(input)
  validateKey(key)

  const msgBytes = toByteArray(input, options.encoding || 'utf8')
  const keyBytes = parseKey(key)

  const start = performance.now()

  if (options.instrument) {
    const steps: CipherStep[] = []
    
    // Step 1: Key padding / hashing
    const KPrime = new Uint8Array(64)
    let keyPrepNote = ''
    if (keyBytes.length > 64) {
      const hashedKey = sha256(keyBytes)
      KPrime.set(hashedKey, 0)
      keyPrepNote = 'Key is longer than block size (64 bytes). Hashed key with SHA-256 and padded with zeros.'
    } else {
      KPrime.set(keyBytes, 0)
      keyPrepNote = `Key length is <= 64 bytes. Padded key with zeros to block size (64 bytes).`
    }

    steps.push({
      index: 0,
      label: 'Key Preparation',
      inputState: fromByteArray(keyBytes, 'hex'),
      outputState: fromByteArray(KPrime, 'hex'),
      note: keyPrepNote,
      isMilestone: true,
    })

    // Step 2: Inner Key XOR ipad
    const ipad = new Uint8Array(64)
    const innerKey = new Uint8Array(64)
    for (let i = 0; i < 64; i++) {
      ipad[i] = 0x36
      innerKey[i] = KPrime[i] ^ 0x36
    }

    steps.push({
      index: 1,
      label: 'Inner Key (K\' XOR ipad)',
      inputState: fromByteArray(KPrime, 'hex'),
      outputState: fromByteArray(innerKey, 'hex'),
      note: 'XORed prepared key with ipad byte value (0x36 repeated 64 times).',
    })

    // Step 3: Inner Hash H(innerKey || message)
    const innerInput = new Uint8Array(64 + msgBytes.length)
    innerInput.set(innerKey, 0)
    innerInput.set(msgBytes, 64)
    const innerHash = sha256(innerInput)

    steps.push({
      index: 2,
      label: 'Inner SHA-256 Hash',
      inputState: fromByteArray(innerInput, 'hex'),
      outputState: fromByteArray(innerHash, 'hex'),
      note: 'Computed SHA-256 hash of inner key concatenated with input message.',
      isMilestone: true,
    })

    // Step 4: Outer Key XOR opad
    const opad = new Uint8Array(64)
    const outerKey = new Uint8Array(64)
    for (let i = 0; i < 64; i++) {
      opad[i] = 0x5c
      outerKey[i] = KPrime[i] ^ 0x5c
    }

    steps.push({
      index: 3,
      label: 'Outer Key (K\' XOR opad)',
      inputState: fromByteArray(KPrime, 'hex'),
      outputState: fromByteArray(outerKey, 'hex'),
      note: 'XORed prepared key with opad byte value (0x5c repeated 64 times).',
    })

    // Step 5: Final Outer Hash H(outerKey || innerHash)
    const outerInput = new Uint8Array(64 + 32)
    outerInput.set(outerKey, 0)
    outerInput.set(innerHash, 64)
    const outputBytes = sha256(outerInput)
    const outputHex = fromByteArray(outputBytes, 'hex')

    steps.push({
      index: 4,
      label: 'Outer SHA-256 Hash (Final HMAC)',
      inputState: fromByteArray(outerInput, 'hex'),
      outputState: outputHex,
      note: 'Computed final SHA-256 hash of outer key concatenated with inner hash result.',
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

  // Fast path
  const outputBytes = hmac(sha256, keyBytes, msgBytes)
  const output = fromByteArray(outputBytes, 'hex')

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
  key: string,
  options: CipherOptions = {}
): CipherResult {
  throw new CipherError(
    'ALGORITHM_UNSUPPORTED',
    'HMAC is a one-way message authentication code and cannot be decrypted.'
  )
}
