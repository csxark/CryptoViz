import { encrypt as aesEncrypt, decrypt as aesDecrypt } from './symmetric/aes'
import { CipherError } from '../utils/errors'
import type { WorkerRequest } from '../../types/worker'
import { sharedCipherPool } from '../workers/sharedPool'

export interface PbePayload {
  algorithm: 'AES-256-CBC'
  kdf: 'PBKDF2'
  hash: 'SHA-256' | 'SHA-512'
  iterations: number
  salt: string
  iv: string
  ciphertext: string
}

export interface PbeEncryptOptions {
  iterations?: number
  hash?: 'SHA-256' | 'SHA-512'
  keyLength?: 16 | 24 | 32
}

const DEFAULT_ITERATIONS = 100_000
const DEFAULT_HASH: 'SHA-256' | 'SHA-512' = 'SHA-256'
const DEFAULT_KEY_LENGTH = 32 // AES-256

// Reuse a single pool instance — same pattern the rest of the app should
// already be using for cipher.worker.ts (check CipherLayout.tsx for the
// existing pool instantiation and reuse that instance instead of creating
// a second one here, to avoid spinning up double the worker threads).

async function deriveKeyViaWorker(
  password: string,
  params: { iterations: number; hash: 'SHA-256' | 'SHA-512'; keyLength: number; salt?: string }
): Promise<{ derivedKeyHex: string; saltHex: string }> {
  const message: WorkerRequest = {
    type: 'encrypt', // arbitrary — pbkdf2 case ignores encrypt/decrypt distinction
    requestId: crypto.randomUUID(),
    payload: {
      cipherId: 'pbkdf2',
      input: password,
      key: '', // unused for KDF
      options: params,
    },
  }

  const response = await sharedCipherPool.execute(message)
  // cipher.worker.ts's response has no `type` field, so pool.ts's fallback
  // branch delivers the raw worker payload here.
  if (response.success === false) {
    throw new CipherError('KDF_ERROR', response.payload.error)
  }
  return response.payload.result
}

export async function pbeEncrypt(
  plaintext: string,
  password: string,
  options: PbeEncryptOptions = {}
): Promise<{ payload: PbePayload; derivedKeyHex: string }> {
  if (!password) {
    throw new CipherError('INVALID_INPUT', 'Password must not be empty.')
  }

  const kdfParams = {
    iterations: options.iterations ?? DEFAULT_ITERATIONS,
    hash: options.hash ?? DEFAULT_HASH,
    keyLength: options.keyLength ?? DEFAULT_KEY_LENGTH,
  }

  const { derivedKeyHex, saltHex } = await deriveKeyViaWorker(password, kdfParams)

  const result = aesEncrypt(plaintext, derivedKeyHex, { mode: 'CBC' })
  const ivHex = result.output.slice(0, 32)
  const ciphertextOnly = result.output.slice(32)

  const payload: PbePayload = {
    algorithm: 'AES-256-CBC',
    kdf: 'PBKDF2',
    hash: kdfParams.hash,
    iterations: kdfParams.iterations,
    salt: saltHex,
    iv: ivHex,
    ciphertext: ciphertextOnly,
  }

  return { payload, derivedKeyHex }
}

export async function pbeDecrypt(
  payload: PbePayload,
  password: string
): Promise<{ plaintext: string; derivedKeyHex: string }> {
  if (payload.kdf !== 'PBKDF2') {
    throw new CipherError('UNSUPPORTED_KDF', `Unsupported KDF: ${payload.kdf}`)
  }

  const { derivedKeyHex } = await deriveKeyViaWorker(password, {
    iterations: payload.iterations,
    hash: payload.hash,
    keyLength: 32,
    salt: payload.salt,
  })

  const fullCiphertext = payload.iv + payload.ciphertext
  const result = aesDecrypt(fullCiphertext, derivedKeyHex, { mode: 'CBC' })

  return { plaintext: result.output, derivedKeyHex }
}