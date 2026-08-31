import { describe, expect, it } from 'vitest'
import {
  CIPHER_WORKER_OPTION_HANDLERS,
  createCipherWorkerOptions,
  createDefaultComparisonPanelState,
  getSupportedDirections,
  normalizeComparisonDirection,
  swapComparisonSelection,
} from '../../lib/utils/cipherComparison'
import { CIPHER_REGISTRY } from '../../lib/cipher/registry'

const getCipher = (id: string) => {
  const cipher = CIPHER_REGISTRY.find((item) => item.id === id)
  if (!cipher) throw new Error(`Missing test cipher: ${id}`)
  return cipher
}

describe('cipher comparison utilities', () => {
  it('prevents decrypt mode for hash functions', () => {
    const sha256 = getCipher('sha256')
    expect(getSupportedDirections(sha256)).toEqual(['encrypt'])
    expect(normalizeComparisonDirection(sha256, 'decrypt')).toBe('encrypt')
  })

  it('prevents decrypt mode for Diffie-Hellman', () => {
    const dh = getCipher('dh')

    expect(getSupportedDirections(dh)).toEqual(['encrypt'])
    expect(normalizeComparisonDirection(dh, 'decrypt')).toBe('encrypt')
  })

  it('allows encrypt and decrypt for compatible ciphers', () => {
    const caesar = getCipher('caesar')
    expect(getSupportedDirections(caesar)).toEqual([
      'encrypt',
      'decrypt',
    ])
    expect(normalizeComparisonDirection(caesar, 'decrypt')).toBe('decrypt')
  })

  it('creates defaults from the cipher registry', () => {
    const aes = getCipher('aes')
    expect(createDefaultComparisonPanelState(aes)).toEqual({
      cipherId: 'aes',
      direction: 'encrypt',
      key: aes.defaultKey,
      options: {
        mode: 'ECB',
        hexInput: true,
      },
    })
  })

  it('swaps selected ciphers', () => {
    expect(
      swapComparisonSelection({
        leftCipherId: 'caesar',
        rightCipherId: 'vigenere',
      }),
    ).toEqual({
      leftCipherId: 'vigenere',
      rightCipherId: 'caesar',
    })
  })

  it('maps registry options into worker options via handler map', () => {
    expect(CIPHER_WORKER_OPTION_HANDLERS.rsa).toBeDefined()
    expect(CIPHER_WORKER_OPTION_HANDLERS.bcrypt).toBeDefined()
    expect(CIPHER_WORKER_OPTION_HANDLERS.des).toBeDefined()
    expect(CIPHER_WORKER_OPTION_HANDLERS['3des']).toBeDefined()
    expect(CIPHER_WORKER_OPTION_HANDLERS.aes).toBeDefined()
    expect(CIPHER_WORKER_OPTION_HANDLERS.dh).toBeDefined()

    expect(
      createCipherWorkerOptions(getCipher('rsa'), {
        demoMode: false,
      }),
    ).toEqual({
      instrument: true,
      mode: 'real',
    })

    expect(
      createCipherWorkerOptions(getCipher('rsa'), {}),
    ).toEqual({
      instrument: true,
      mode: 'demo',
    })

    expect(
      createCipherWorkerOptions(getCipher('bcrypt'), {
        rounds: 8,
      }),
    ).toEqual({
      instrument: true,
      rounds: 8,
    })

    expect(
      createCipherWorkerOptions(getCipher('bcrypt'), {}),
    ).toEqual({
      instrument: true,
      rounds: 4,
    })
  })

  it('creates DES, 3DES, and AES worker options with hexInput options', () => {
    expect(createCipherWorkerOptions(getCipher('des'), {})).toEqual({
      instrument: true,
      hexInput: true,
    })
    expect(
      createCipherWorkerOptions(getCipher('3des'), { hexInput: false }),
    ).toEqual({
      instrument: true,
      hexInput: false,
    })
    expect(createCipherWorkerOptions(getCipher('aes'), {})).toEqual({
      instrument: true,
      hexInput: true,
    })
  })

  it('creates DH worker options with default and custom secret', () => {
    expect(createCipherWorkerOptions(getCipher('dh'), {})).toEqual({
      instrument: true,
      mode: 'demo',
      bobSecret: '15',
    })
    expect(
      createCipherWorkerOptions(getCipher('dh'), { bobSecret: '27' }),
    ).toEqual({
      instrument: true,
      mode: 'demo',
      bobSecret: '27',
    })
  })

  it('returns default options for ciphers without custom option handlers', () => {
    expect(createCipherWorkerOptions(getCipher('caesar'), {})).toEqual({
      instrument: true,
    })
    expect(createCipherWorkerOptions(getCipher('sha256'), {})).toEqual({
      instrument: true,
    })
  })
})