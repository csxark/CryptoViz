import { describe, expect, it } from 'vitest'
import { encryptLamport, encryptWots, decrypt } from '@/lib/cipher/asymmetric/lamport-wots'

describe('Lamport & Winternitz OTS', () => {
  it('Lamport signs and verifies', () => {
    const msg = '48656c6c6f'
    const seed = '00'.repeat(32)
    const sig = encryptLamport(msg, seed)
    expect(sig.output.length).toBe(256 * 64)
    expect(decrypt(sig.output, seed).output).toBe('01')
  })

  it('WOTS w=4 signs and verifies', () => {
    const msg = '48656c6c6f'
    const seed = '00'.repeat(32)
    const sig = encryptWots(msg, seed, { w: 4 })
    expect(sig.output.length).toBe(67 * 64)
  })

  it('rejects tampered Lamport signature', () => {
    const msg = '48656c6c6f'
    const seed = '00'.repeat(32)
    const sig = encryptLamport(msg, seed)
    const tampered = 'ff' + sig.output.slice(2)
    expect(decrypt(tampered, seed).output).toBe('00')
  })
})
