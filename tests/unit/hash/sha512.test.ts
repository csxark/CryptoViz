import { describe, it, expect } from 'vitest'
import nodeCrypto from 'node:crypto'
import { sha512 as nobleSha512 } from '@noble/hashes/sha2.js'
import { encrypt, decrypt, TEST_VECTORS } from '../../../lib/cipher/hash/sha512'
import { CipherError } from '../../../lib/utils/errors'
import { fromByteArray } from '../../../lib/utils/encoding'

describe('SHA-512 Forensic Verification (FIPS 180-4)', () => {
  const oracleSha512 = (input: string | Uint8Array): string => {
    return nodeCrypto.createHash('sha512').update(input).digest('hex')
  }

  const nobleOracle = (input: string): string => {
    const bytes = new TextEncoder().encode(input)
    return fromByteArray(nobleSha512(bytes), 'hex')
  }

  describe('[Authoritative-KAT] FIPS 180-4 Standard Vectors', () => {
    it('passes standard published test vectors on both fast and instrumented paths', () => {
      for (const vector of TEST_VECTORS) {
        const fast = encrypt(vector.input, vector.key, { instrument: false })
        const instrumented = encrypt(vector.input, vector.key, { instrument: true })

        expect(fast.output).toBe(vector.expected)
        expect(instrumented.output).toBe(vector.expected)
        expect(instrumented.output).toBe(fast.output)
        expect(fast.output).toBe(oracleSha512(vector.input))
        expect(fast.output).toBe(nobleOracle(vector.input))
      }
    })
  })

  describe('[Differential-Oracle] Boundary Message Lengths & Block Transitions', () => {
    // SHA-512 has 1024-bit (128-byte) blocks with 128-bit (16-byte) length field.
    // Critical padding thresholds:
    // Single block max payload: 128 - 1 (0x80) - 16 (len) = 111 bytes.
    // 112 bytes overflows to second block!
    const boundaryInputs: { label: string; input: string }[] = [
      { label: 'empty message (0 bytes)', input: '' },
      { label: 'single char "a" (1 byte)', input: 'a' },
      { label: 'standard "abc" (3 bytes)', input: 'abc' },
      { label: '55-byte message', input: 'a'.repeat(55) },
      { label: '56-byte message (SHA-256 boundary)', input: 'b'.repeat(56) },
      { label: '63-byte message', input: 'c'.repeat(63) },
      { label: '64-byte message (half block)', input: 'd'.repeat(64) },
      { label: '65-byte message', input: 'e'.repeat(65) },
      { label: '111-byte message (exact single-block padding limit)', input: 'f'.repeat(111) },
      { label: '112-byte message (triggers two-block padding overflow)', input: 'g'.repeat(112) },
      { label: '113-byte message (two blocks)', input: 'h'.repeat(113) },
      { label: '127-byte message', input: 'i'.repeat(127) },
      { label: '128-byte message (exact one block)', input: 'j'.repeat(128) },
      { label: '129-byte message', input: 'k'.repeat(129) },
      { label: '239-byte message (exact two-block padding limit)', input: 'l'.repeat(239) },
      { label: '240-byte message (triggers three-block padding overflow)', input: 'm'.repeat(240) },
      { label: '256-byte message (exact two blocks)', input: 'n'.repeat(256) },
    ]

    for (const { label, input } of boundaryInputs) {
      it(`verifies fast and instrumented paths match node:crypto oracle for ${label}`, () => {
        const expected = oracleSha512(input)
        const nobleExpected = nobleOracle(input)
        expect(expected).toBe(nobleExpected)

        const fast = encrypt(input, '', { instrument: false })
        const instrumented = encrypt(input, '', { instrument: true })

        expect(fast.output).toBe(expected)
        expect(instrumented.output).toBe(expected)
        expect(fast.output).toBe(instrumented.output)
      })
    }
  })

  describe('[Differential-Oracle] Long Deterministic & Multi-Block Inputs', () => {
    it('verifies multi-kilobyte repeating pattern input across multiple blocks', () => {
      // 10,000 characters patterned
      const pattern = 'abcdefghijklmnopqrstuvwxyz0123456789'
      const longInput = pattern.repeat(280) // 10,080 bytes (~78 blocks)
      const expected = oracleSha512(longInput)

      const fast = encrypt(longInput, '', { instrument: false })
      const instrumented = encrypt(longInput, '', { instrument: true })

      expect(fast.output).toBe(expected)
      expect(instrumented.output).toBe(expected)
      expect(fast.output).toBe(instrumented.output)
    })
  })

  describe('[Property-Invariant] Deterministic Randomized Inputs & Invariants', () => {
    it('matches node:crypto for pseudo-random deterministic lengths', () => {
      // Seeded deterministic pseudo-random generator (LCG)
      let seed = 0x12345678
      const nextRand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed
      }

      for (let trial = 0; trial < 25; trial++) {
        const len = nextRand() % 350 // lengths from 0 to 349 bytes
        const chars: string[] = []
        for (let i = 0; i < len; i++) {
          chars.push(String.fromCharCode(32 + (nextRand() % 95)))
        }
        const text = chars.join('')
        const expected = oracleSha512(text)

        const fast = encrypt(text, '', { instrument: false })
        const instrumented = encrypt(text, '', { instrument: true })

        expect(fast.output, `Trial ${trial} (length ${len}) fast output mismatch`).toBe(expected)
        expect(instrumented.output, `Trial ${trial} (length ${len}) instrumented output mismatch`).toBe(expected)
        expect(fast.output).toBe(instrumented.output)
      }
    })
  })

  describe('Visualization State & Error Handling', () => {
    it('throws CipherError on decrypt because SHA-512 is a one-way function', () => {
      expect(() => decrypt('ddaf35a193617abacc417349ae20413112e6fa4e89a97e')).toThrowError(CipherError)
    })

    it('generates correct step sequence and milestones in instrumented mode', () => {
      const result = encrypt('abc', '', { instrument: true })
      expect(result.steps.length).toBe(89)
      expect(result.steps[0].label).toBe('Preprocessing - padding')
      expect(result.steps[1].label).toBe('Message schedule W[0..15]')
      expect(result.steps[6].label).toBe('Initialize working variables')
      expect(result.steps[87].label).toBe('Add to hash state')
      expect(result.steps[88].label).toBe('Final hash output')
      expect(result.steps[88].outputState).toBe(result.output)
    })

    it('does not allocate visualization steps in fast mode', () => {
      const result = encrypt('abc', '', { instrument: false })
      expect(result.steps).toHaveLength(0)
    })
  })
})
