export interface Pbkdf2Params {
  iterations: number
  keyLength: number // bytes, e.g. 32 for AES-256
  hash: 'SHA-256' | 'SHA-512'
  salt?: string // hex; generated if omitted
}

export interface Pbkdf2Result {
  derivedKeyHex: string
  saltHex: string
  params: Omit<Pbkdf2Params, 'salt'>
}

const MIN_ITERATIONS = 10_000 // OWASP floor for PBKDF2-SHA256 as of 2023 guidance
const MAX_ITERATIONS = 5_000_000 // sanity ceiling — prevents UI from hanging the browser

function validateParams(params: Pbkdf2Params): void {
  if (params.iterations < MIN_ITERATIONS || params.iterations > MAX_ITERATIONS) {
    throw new Error(`iterations must be between ${MIN_ITERATIONS} and ${MAX_ITERATIONS}`)
  }
  if (![16, 24, 32].includes(params.keyLength)) {
    throw new Error('keyLength must be 16, 24, or 32 bytes (AES-128/192/256)')
  }
  if (params.salt) {
    if (!/^[0-9a-fA-F]+$/.test(params.salt)) {
      throw new Error('salt must be a hex string')
    }
    if (params.salt.length % 2 !== 0) {
      throw new Error('salt must have an even number of hex characters')
    }
  }
}
  
export async function deriveKey(
  password: string,
  params: Pbkdf2Params
): Promise<Pbkdf2Result> {
  validateParams(params)

  const salt = params.salt
    ? hexToBytes(params.salt)
    : crypto.getRandomValues(new Uint8Array(16))

  const saltBuffer = salt instanceof Uint8Array ? salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer : salt

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: params.iterations,
      hash: params.hash,
    },
    passwordKey,
    params.keyLength * 8
  )

  return {
    derivedKeyHex: bytesToHex(new Uint8Array(derivedBits)),
    saltHex: bytesToHex(salt),
    params: { iterations: params.iterations, keyLength: params.keyLength, hash: params.hash },
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}