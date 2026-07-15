import { describe, it, expect } from 'vitest'
import { deriveKey } from '@/lib/kdf/pbkdf2'

describe('PBKDF2', () => {
  it('derives a consistent key for the same password and salt', async () => {
    // Using a fixed salt + iterations at the safety floor for a deterministic,
    // reproducible check (RFC 6070's own vectors use SHA-1 at low iteration
    // counts, which don't apply cleanly here given the 10k floor + SHA-256/512 only)
    const a = await deriveKey('password', {
      iterations: 10_000,
      hash: 'SHA-256',
      keyLength: 32,
      salt: '73616c74', // "salt" in hex
    })
    const b = await deriveKey('password', {
      iterations: 10_000,
      hash: 'SHA-256',
      keyLength: 32,
      salt: '73616c74',
    })
    expect(a.derivedKeyHex).toBe(b.derivedKeyHex) // same inputs → same output, deterministic
    expect(a.derivedKeyHex).toHaveLength(64) // 32 bytes = 64 hex chars
  })

  it('produces different keys for different salts', async () => {
    const a = await deriveKey('password', { iterations: 10_000, hash: 'SHA-256', keyLength: 32 })
    const b = await deriveKey('password', { iterations: 10_000, hash: 'SHA-256', keyLength: 32 })
    expect(a.derivedKeyHex).not.toBe(b.derivedKeyHex) // different random salts each time
  })

  it('rejects iteration counts below the safety floor', async () => {
    await expect(
      deriveKey('password', { iterations: 100, hash: 'SHA-256', keyLength: 32 })
    ).rejects.toThrow(/iterations must be between/)
  })
})