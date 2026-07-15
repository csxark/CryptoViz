import { describe, it, expect, vi } from 'vitest'
import { deriveKey } from '@/lib/kdf/pbkdf2'

// Mock the worker pool so this stays a true unit test — no real Worker/browser
// environment needed. Simulates exactly what cipher.worker.ts's 'pbkdf2' case
// does: calls the real deriveKey() and returns it in the shape pool.execute()
// would resolve with.
vi.mock('@/lib/workers/pool', () => {
  return {
    WorkerPool: class {
      async execute(message: any) {
        const { input, options } = message.payload
        try {
          const result = await deriveKey(input, options)
          return { success: true, payload: { result } }
        } catch (error) {
          return { success: false, payload: { error: (error as Error).message } }
        }
      }
    },
  }
})

const { pbeEncrypt, pbeDecrypt } = await import('@/lib/cipher/pbe')

describe('Password-Based Encryption', () => {
  it('round-trips encrypt/decrypt with the correct password', async () => {
    const { payload } = await pbeEncrypt('Hello, CryptoViz!', 'correct-horse-battery-staple')
    const { plaintext } = await pbeDecrypt(payload, 'correct-horse-battery-staple')
    expect(plaintext).toBe('Hello, CryptoViz!')
  })

  it('fails to decrypt with the wrong password', async () => {
    const { payload } = await pbeEncrypt('secret message', 'right-password')
    await expect(pbeDecrypt(payload, 'wrong-password')).rejects.toThrow()
  })

  it('serializes to the documented metadata shape', async () => {
    const { payload } = await pbeEncrypt('test', 'pw')
    expect(payload).toMatchObject({
      kdf: 'PBKDF2',
      hash: expect.any(String),
      iterations: expect.any(Number),
      salt: expect.any(String),
      iv: expect.any(String),
      ciphertext: expect.any(String),
    })
  })
})