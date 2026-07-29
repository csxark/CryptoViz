import { encrypt as hkdfEncrypt } from '../cipher/hash/hkdf'

export interface HkdfParams {
  ikm: string
  salt?: string
  info?: string
  keyLength: number
  hash: 'SHA-256' | 'SHA-512' | 'SHA-1'
}

export interface HkdfResult {
  derivedKeyHex: string
  params: HkdfParams
}

export function deriveHkdfKey(params: HkdfParams): HkdfResult {
  const result = hkdfEncrypt(params.ikm, params.salt || '', {
    info: params.info || '',
    keyLength: params.keyLength,
    hash: params.hash,
  })

  return {
    derivedKeyHex: result.output,
    params,
  }
}
