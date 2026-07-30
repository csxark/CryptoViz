import { describe, it, expect } from 'vitest'
import {
  ENGLISH_IOC,
  RANDOM_IOC,
  MIN_CIPHERTEXT_LETTERS,
  normaliseText,
  encryptVigenere,
  decryptVigenere,
  findRepeatedSequences,
  factorDistances,
  indexOfCoincidence,
  splitIntoCosets,
  averageIoCForKeyLength,
  solveColumn,
  breakVigenere,
} from '@/lib/attacks/vigenereCryptanalysis'

/**
 * A long English sample. Vigenère cryptanalysis is statistical, so the sample
 * has to be long enough that per-coset histograms are meaningful — roughly
 * 40+ letters per coset for a key of length 8.
 */
const ENGLISH_SAMPLE = (
  'It is a truth universally acknowledged that a single man in possession of a good fortune ' +
  'must be in want of a wife. However little known the feelings or views of such a man may be ' +
  'on his first entering a neighbourhood this truth is so well fixed in the minds of the ' +
  'surrounding families that he is considered as the rightful property of some one or other ' +
  'of their daughters. My dear mister bennet said his lady to him one day have you heard that ' +
  'netherfield park is let at last. Mister bennet replied that he had not. But it is returned ' +
  'she for missus long has just been here and she told me all about it. Mister bennet made no ' +
  'answer. Do you not want to know who has taken it cried his wife impatiently. You want to ' +
  'tell me and I have no objection to hearing it. This was invitation enough. Why my dear you ' +
  'must know missus long says that netherfield is taken by a young man of large fortune from ' +
  'the north of england that he came down on monday in a chaise and four to see the place and ' +
  'was so much delighted with it that he agreed with mister morris immediately that he is to ' +
  'take possession before michaelmas and some of his servants are to be in the house by the ' +
  'end of next week. What is his name. Bingley. Is he married or single. Oh single my dear to ' +
  'be sure a single man of large fortune four or five thousand a year. What a fine thing for ' +
  'our girls. How so how can it affect them. My dear mister bennet replied his wife how can ' +
  'you be so tiresome you must know that I am thinking of his marrying one of them.'
).trim()

describe('normaliseText', () => {
  it('strips everything except A–Z and uppercases the rest', () => {
    expect(normaliseText('Hello, World! 123')).toBe('HELLOWORLD')
    expect(normaliseText('a-b_c')).toBe('ABC')
    expect(normaliseText('!!!')).toBe('')
  })
})

describe('encryptVigenere / decryptVigenere', () => {
  it('matches the canonical ATTACKATDAWN / LEMON vector', () => {
    expect(encryptVigenere('ATTACKATDAWN', 'LEMON')).toBe('LXFOPVEFRNHR')
    expect(decryptVigenere('LXFOPVEFRNHR', 'LEMON')).toBe('ATTACKATDAWN')
  })

  it('preserves punctuation and spacing without advancing the key stream', () => {
    const ciphertext = encryptVigenere('ATTACK AT DAWN!', 'LEMON')
    expect(ciphertext).toBe('LXFOPV EF RNHR!')
    expect(decryptVigenere(ciphertext, 'LEMON')).toBe('ATTACK AT DAWN!')
  })

  it('preserves letter case', () => {
    expect(decryptVigenere(encryptVigenere('Attack at Dawn', 'Lemon'), 'LEMON')).toBe(
      'Attack at Dawn'
    )
  })

  it('round-trips arbitrary text for a range of key lengths', () => {
    for (const key of ['A', 'KEY', 'SECRET', 'CRYPTOVIZ', 'LONGERKEYWORD']) {
      expect(decryptVigenere(encryptVigenere(ENGLISH_SAMPLE, key), key)).toBe(ENGLISH_SAMPLE)
    }
  })

  it('throws INVALID_KEY when the key has no letters', () => {
    expect(() => encryptVigenere('HELLO', '123')).toThrowError(/at least one alphabetic/)
    expect(() => decryptVigenere('HELLO', '')).toThrowError(/at least one alphabetic/)
  })
})

describe('indexOfCoincidence', () => {
  it('scores English prose near the expected 0.0667', () => {
    const ioc = indexOfCoincidence(ENGLISH_SAMPLE)
    expect(ioc).toBeGreaterThan(ENGLISH_IOC - 0.012)
    expect(ioc).toBeLessThan(ENGLISH_IOC + 0.012)
  })

  it('scores a uniform letter stream near the random baseline of 0.0385', () => {
    // Deterministic uniform coverage: every letter appears equally often.
    let uniform = ''
    for (let round = 0; round < 200; round++) {
      for (let i = 0; i < 26; i++) uniform += String.fromCharCode(65 + i)
    }
    const ioc = indexOfCoincidence(uniform)
    expect(ioc).toBeGreaterThan(RANDOM_IOC - 0.005)
    expect(ioc).toBeLessThan(RANDOM_IOC + 0.005)
  })

  it('returns 1 for a stream of a single repeated letter', () => {
    expect(indexOfCoincidence('AAAAAAAAAA')).toBeCloseTo(1, 10)
  })

  it('drops toward the random baseline as the Vigenère key lengthens', () => {
    const plainIoC = indexOfCoincidence(ENGLISH_SAMPLE)
    const shortKeyIoC = indexOfCoincidence(encryptVigenere(ENGLISH_SAMPLE, 'AB'))
    const longKeyIoC = indexOfCoincidence(encryptVigenere(ENGLISH_SAMPLE, 'ABCDEFGHIJKLMNOP'))

    expect(plainIoC).toBeGreaterThan(shortKeyIoC)
    expect(shortKeyIoC).toBeGreaterThan(longKeyIoC)
    expect(longKeyIoC).toBeLessThan(0.05)
  })

  it('throws when there are fewer than two letters', () => {
    expect(() => indexOfCoincidence('A')).toThrowError(/at least 2 letters/)
    expect(() => indexOfCoincidence('!!')).toThrowError(/at least 2 letters/)
  })
})

describe('splitIntoCosets', () => {
  it('deals letters round-robin into m buckets', () => {
    expect(splitIntoCosets('ABCDEFGHI', 3)).toEqual(['ADG', 'BEH', 'CFI'])
  })

  it('handles a ciphertext length that is not a multiple of the key length', () => {
    expect(splitIntoCosets('ABCDEFGH', 3)).toEqual(['ADG', 'BEH', 'CF'])
  })

  it('returns the whole text for key length 1', () => {
    expect(splitIntoCosets('ABCDE', 1)).toEqual(['ABCDE'])
  })

  it('throws for a key length below 1', () => {
    expect(() => splitIntoCosets('ABC', 0)).toThrowError(/at least 1/)
  })
})

describe('averageIoCForKeyLength', () => {
  it('peaks at the true key length and at its multiples', () => {
    const ciphertext = encryptVigenere(ENGLISH_SAMPLE, 'CRYPT') // length 5
    const atTrue = averageIoCForKeyLength(normaliseText(ciphertext), 5).averageIoC
    const atMultiple = averageIoCForKeyLength(normaliseText(ciphertext), 10).averageIoC
    const atWrong = averageIoCForKeyLength(normaliseText(ciphertext), 4).averageIoC
    const atOne = averageIoCForKeyLength(normaliseText(ciphertext), 1).averageIoC

    expect(atTrue).toBeGreaterThan(0.058)
    expect(atMultiple).toBeGreaterThan(0.058)
    expect(atTrue).toBeGreaterThan(atWrong)
    expect(atTrue).toBeGreaterThan(atOne)
  })

  it('reports one IoC per coset and the smallest coset size', () => {
    const score = averageIoCForKeyLength(normaliseText(ENGLISH_SAMPLE), 4)
    expect(score.perCoset).toHaveLength(4)
    expect(score.smallestCoset).toBeGreaterThan(0)
  })
})

describe('findRepeatedSequences / factorDistances', () => {
  it('finds a planted repeat and reports the gap between occurrences', () => {
    // 'THE' at offset 0 and offset 12 → distance 12.
    const text = normaliseText('THEQUICKBROWTHEFOXJUMPS')
    const repeats = findRepeatedSequences(text, 3, 3)
    const the = repeats.find((r) => r.sequence === 'THE')

    expect(the).toBeDefined()
    expect(the?.positions).toEqual([0, 12])
    expect(the?.distances).toEqual([12])
  })

  it('records every pairwise distance when an n-gram repeats three times', () => {
    const text = normaliseText('ABCDEFABCDEFABC')
    const repeats = findRepeatedSequences(text, 3, 3)
    const abc = repeats.find((r) => r.sequence === 'ABC')

    expect(abc?.positions).toEqual([0, 6, 12])
    expect(abc?.distances).toEqual([6, 12, 6])
  })

  it('ranks the true key length top when repeats sit at multiples of it', () => {
    const ciphertext = normaliseText(encryptVigenere(ENGLISH_SAMPLE, 'CRYPT'))
    const repeats = findRepeatedSequences(ciphertext, 3, 5)
    const tally = factorDistances(
      repeats.flatMap((r) => r.distances),
      16
    )

    // The correct length (5) should divide a clear majority of the distances.
    const five = tally.find((t) => t.keyLength === 5)
    expect(five).toBeDefined()
    expect(five!.ratio).toBeGreaterThan(0.5)
  })

  it('returns an empty tally when there are no distances to factor', () => {
    const tally = factorDistances([], 8)
    expect(tally).toHaveLength(7)
    expect(tally.every((t) => t.divides === 0 && t.ratio === 0)).toBe(true)
  })

  it('validates its sequence-length bounds', () => {
    expect(() => findRepeatedSequences('ABCDEF', 1, 3)).toThrowError(/at least 2/)
    expect(() => findRepeatedSequences('ABCDEF', 4, 3)).toThrowError(/maxSequenceLength/)
  })
})

describe('solveColumn', () => {
  it('recovers the shift of a Caesar-enciphered English coset', () => {
    const coset = normaliseText(ENGLISH_SAMPLE).slice(0, 300)
    for (const shift of [0, 1, 7, 13, 25]) {
      const shifted = Array.from(coset)
        .map((ch) => String.fromCharCode(((ch.charCodeAt(0) - 65 + shift) % 26) + 65))
        .join('')

      const solution = solveColumn(shifted, 0)
      expect(solution.shift).toBe(shift)
      expect(solution.keyLetter).toBe(String.fromCharCode(65 + shift))
    }
  })

  it('scores all 26 shifts and reports a non-negative confidence margin', () => {
    const solution = solveColumn(normaliseText(ENGLISH_SAMPLE).slice(0, 200), 3)
    expect(solution.chiSquaredByShift).toHaveLength(26)
    expect(solution.column).toBe(3)
    expect(solution.confidence).toBeGreaterThanOrEqual(0)
  })

  it('throws INPUT_REQUIRED for a coset with no letters', () => {
    expect(() => solveColumn('12345', 0)).toThrowError(/no letters to analyse/)
  })
})

describe('breakVigenere', () => {
  it('recovers the exact key and plaintext for key lengths 3 through 8', () => {
    const keys = ['KEY', 'FISH', 'CRYPT', 'SECRET', 'CIPHERS', 'VIGENERE']

    for (const key of keys) {
      const ciphertext = encryptVigenere(ENGLISH_SAMPLE, key)
      const result = breakVigenere(ciphertext)

      expect(result.electedKeyLength).toBe(key.length)
      expect(result.recoveredKey).toBe(key)
      expect(result.decryptedPlaintext).toBe(ENGLISH_SAMPLE)
    }
  })

  it('handles a key with repeated letters', () => {
    const ciphertext = encryptVigenere(ENGLISH_SAMPLE, 'BOOKKEEPER')
    const result = breakVigenere(ciphertext)

    expect(result.recoveredKey).toBe('BOOKKEEPER')
    expect(result.decryptedPlaintext).toBe(ENGLISH_SAMPLE)
  })

  it('treats a Caesar cipher as the degenerate key length of 1', () => {
    const ciphertext = encryptVigenere(ENGLISH_SAMPLE, 'D')
    const result = breakVigenere(ciphertext)

    expect(result.electedKeyLength).toBe(1)
    expect(result.recoveredKey).toBe('D')
  })

  it('exposes every intermediate stage for the visualizer', () => {
    const result = breakVigenere(encryptVigenere(ENGLISH_SAMPLE, 'CRYPT'))

    expect(result.iocScores.length).toBeGreaterThan(0)
    expect(result.iocScores[0].keyLength).toBe(1)
    expect(result.columns).toHaveLength(5)
    expect(result.columns.map((c) => c.column)).toEqual([0, 1, 2, 3, 4])
    expect(result.steps.some((s) => s.stage === 'kasiski')).toBe(true)
    expect(result.steps.some((s) => s.stage === 'ioc')).toBe(true)
    expect(result.steps.some((s) => s.stage === 'column')).toBe(true)
    expect(result.steps.some((s) => s.stage === 'result')).toBe(true)
    expect(result.normalisedCiphertext).toMatch(/^[A-Z]+$/)
  })

  it('respects the maxKeyLength option', () => {
    const result = breakVigenere(encryptVigenere(ENGLISH_SAMPLE, 'CRYPT'), { maxKeyLength: 4 })
    expect(result.electedKeyLength).toBeLessThanOrEqual(4)
    expect(result.iocScores.every((s) => s.keyLength <= 4)).toBe(true)
  })

  it('reports high confidence on a long sample', () => {
    const result = breakVigenere(encryptVigenere(ENGLISH_SAMPLE, 'CRYPT'))
    expect(result.overallConfidence).toBeGreaterThan(0.1)
    expect(result.warnings).toHaveLength(0)
  })

  it('throws INPUT_REQUIRED when the ciphertext has no letters', () => {
    expect(() => breakVigenere('12345 !!! ???')).toThrowError(/at least one alphabetic/)
  })

  it('throws when the ciphertext is too short to analyse', () => {
    const short = 'A'.repeat(MIN_CIPHERTEXT_LETTERS - 1)
    expect(() => breakVigenere(short)).toThrowError(/unreliable/)
  })

  it('preserves the original punctuation in the recovered plaintext', () => {
    const plaintext =
      'Meet me at the old bridge, at midnight! Bring the documents; do not be followed. ' +
      'The password is written on the reverse of the ticket you were handed this morning. ' +
      'If anyone asks, you were never here and we have never spoken about any of this at all.'
    const result = breakVigenere(encryptVigenere(plaintext, 'NIGHT'))

    expect(result.recoveredKey).toBe('NIGHT')
    expect(result.decryptedPlaintext).toBe(plaintext)
  })
})
