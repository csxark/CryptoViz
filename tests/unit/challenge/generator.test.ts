import { describe, it, expect } from 'vitest'
import { generateChallengeData, type ChallengeDifficulty } from '../../../lib/challenge/generator'

const EASY_CIPHERS = ['atbash', 'rot13', 'caesar']
const MEDIUM_CIPHERS = ['caesar', 'vigenere', 'railfence']
const HARD_CIPHERS = ['vigenere', 'railfence', 'playfair']

describe('Challenge Generator', () => {
  it('defaults to medium difficulty when none is specified', () => {
    const challenge = generateChallengeData()
    expect(challenge.difficulty).toBe('medium')
  })

  it('only selects easy-pool ciphers when difficulty=easy', () => {
    for (let i = 0; i < 50; i++) {
      const challenge = generateChallengeData('easy')
      expect(EASY_CIPHERS).toContain(challenge.cipherId)
      expect(challenge.plaintext.length).toBeLessThanOrEqual(20)
    }
  })

  it('only selects medium-pool ciphers when difficulty=medium', () => {
    for (let i = 0; i < 50; i++) {
      const challenge = generateChallengeData('medium')
      expect(MEDIUM_CIPHERS).toContain(challenge.cipherId)
      expect(challenge.plaintext.length).toBeLessThanOrEqual(50)
    }
  })

  it('only selects hard-pool ciphers when difficulty=hard', () => {
    for (let i = 0; i < 50; i++) {
      const challenge = generateChallengeData('hard')
      expect(HARD_CIPHERS).toContain(challenge.cipherId)
      expect(challenge.plaintext.length).toBeLessThanOrEqual(200)
    }
  })

  it('never selects playfair outside hard difficulty', () => {
    for (let i = 0; i < 100; i++) {
      const easy = generateChallengeData('easy')
      const medium = generateChallengeData('medium')
      expect(easy.cipherId).not.toBe('playfair')
      expect(medium.cipherId).not.toBe('playfair')
    }
  })

  it('provides a non-empty key for keyword ciphers, empty key for self-inverse ciphers', () => {
    for (let i = 0; i < 100; i++) {
      const challenge = generateChallengeData('easy')
      if (challenge.cipherId === 'atbash' || challenge.cipherId === 'rot13') {
        expect(challenge.key).toBe('')
      } else {
        expect(challenge.key.length).toBeGreaterThan(0)
      }
    }
  })

  it('caesar key is always a numeric shift between 1 and 25', () => {
    for (let i = 0; i < 100; i++) {
      const challenge = generateChallengeData('medium')
      if (challenge.cipherId === 'caesar') {
        const shift = parseInt(challenge.key, 10)
        expect(shift).toBeGreaterThanOrEqual(1)
        expect(shift).toBeLessThanOrEqual(25)
      }
    }
  })

  it('railfence key is always a numeric rail count between 2 and 4', () => {
    for (let i = 0; i < 100; i++) {
      const challenge = generateChallengeData('medium')
      if (challenge.cipherId === 'railfence') {
        const rails = parseInt(challenge.key, 10)
        expect(rails).toBeGreaterThanOrEqual(2)
        expect(rails).toBeLessThanOrEqual(4)
      }
    }
  })

  it('always returns a hint for the selected cipher when one exists', () => {
    const difficulties: ChallengeDifficulty[] = ['easy', 'medium', 'hard']
    for (const d of difficulties) {
      const challenge = generateChallengeData(d)
      expect(Array.isArray(challenge.hints)).toBe(true)
      expect(challenge.hints.length).toBeGreaterThan(0)
    }
  })

  it('always generates type=encrypt challenges', () => {
    const challenge = generateChallengeData('hard')
    expect(challenge.type).toBe('encrypt')
  })

  it('does not crash across 200 random generations at every difficulty', () => {
    const difficulties: ChallengeDifficulty[] = ['easy', 'medium', 'hard']
    for (let i = 0; i < 200; i++) {
      const d = difficulties[i % 3]
      expect(() => generateChallengeData(d)).not.toThrow()
    }
  })
})