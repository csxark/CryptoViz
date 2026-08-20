import { describe, expect, it, vi } from 'vitest'
import {
  deserializeCustomChallengeSet,
  hashChallengeAnswer,
  normalizeAnswer,
  serializeCustomChallengeSet,
} from '@/lib/challenge/customChallengeSerializer'

function installBase64() {
  vi.stubGlobal('btoa', (value: string) => Buffer.from(value, 'binary').toString('base64'))
  vi.stubGlobal('atob', (value: string) => Buffer.from(value, 'base64').toString('binary'))
}

describe('custom challenge serializer', () => {
  it('normalizes and hashes answers without storing plaintext', async () => {
    installBase64()
    const hash = await hashChallengeAnswer('  meet me at dawn  ')
    expect(normalizeAnswer('  meet me at dawn  ')).toBe('MEET ME AT DAWN')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('round trips a shareable challenge payload', async () => {
    installBase64()
    const answerHash = await hashChallengeAnswer('HELLO')
    const source = {
      version: 1 as const,
      title: 'Classical Ciphers',
      difficulty: 'easy' as const,
      timeLimit: 60 as const,
      questions: [{ id: 'q1', cipherId: 'caesar' as const, ciphertext: 'KHOOR', answerHash, hints: ['Try a shift.'] }],
    }
    const serialized = await serializeCustomChallengeSet(source)
    const restored = await deserializeCustomChallengeSet(serialized)
    expect(restored).toEqual(source)
    expect(serialized).not.toContain('HELLO')
  })

  it('rejects malformed or forged-looking answer hashes', async () => {
    installBase64()
    const answerHash = await hashChallengeAnswer('HELLO')
    const serialized = await serializeCustomChallengeSet({
      version: 1,
      title: 'Test',
      difficulty: 'medium',
      timeLimit: 30,
      questions: [{ id: 'q1', cipherId: 'caesar', ciphertext: 'KHOOR', answerHash, hints: [] }],
    })
    expect(serialized).toMatch(/^[cj][A-Za-z0-9_-]+$/)
  })
})
