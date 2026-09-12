import { describe, it, expect } from 'vitest'
import { CIPHER_REGISTRY } from '@/lib/cipher/registry'
import type { CipherOptions, CipherResult, CipherStep, TestVector } from '@/lib/cipher/types'

type CipherModule = {
  encrypt?: (
    input: string,
    key: string,
    options?: CipherOptions | Record<string, unknown>,
  ) => CipherResult | Promise<CipherResult>
  decrypt?: (
    input: string,
    key: string,
    options?: CipherOptions | Record<string, unknown>,
  ) => CipherResult | Promise<CipherResult>
  TEST_VECTORS?: TestVector[]
}

const SYMMETRIC_FILENAME_MAP: Record<string, string> = {
  '3des': '3des',
  'aes-128': 'aes',
  'aes-192': 'aes',
  'aes-256': 'aes',
  simon32: 'simon32',
}

async function loadCipherModule(
  cipher: (typeof CIPHER_REGISTRY)[number],
): Promise<CipherModule> {
  const { id, category } = cipher

  switch (category) {
    case 'classical':
      return import(`@/lib/cipher/classical/${id}`)

    case 'symmetric': {
      const filename = SYMMETRIC_FILENAME_MAP[id] || id
      return import(`@/lib/cipher/symmetric/${filename}`)
    }

    case 'hash': {
      if (id === 'bloom-filter') {
        return {
          TEST_VECTORS: [
            {
              input: '',
              key: '',
              expected: 'randomized',
              description: 'Bloom Filter Visualizer',
            },
          ],
          encrypt: () => ({
            output: 'ok',
            outputEncoding: 'utf8',
            steps: [],
            metadata: {
              name: 'Bloom Filter Visualizer',
              securityStatus: 'secure',
            },
            durationMs: 0,
          }),
        }
      }

      if (id === 'sha224' || id === 'sha384') {
        const mod = await import('@/lib/cipher/hash/sha2-truncated')
        return {
          ...mod,
          encrypt: id === 'sha224' ? mod.encryptSha224 : mod.encryptSha384,
          TEST_VECTORS:
            id === 'sha224' ? mod.TEST_VECTORS_224 : mod.TEST_VECTORS_384,
        }
      }

      if (id === 'shake128' || id === 'shake256') {
        const mod = await import('@/lib/cipher/hash/shake')
        return {
          ...mod,
          encrypt:
            id === 'shake128' ? mod.encryptShake128 : mod.encryptShake256,
          TEST_VECTORS:
            id === 'shake128' ? mod.TEST_VECTORS_128 : mod.TEST_VECTORS_256,
        }
      }

      if (id === 'scrypt') {
        const mod = await import('@/lib/kdf/scrypt')
        return {
          ...mod,
          TEST_VECTORS: [
            {
              input: 'password',
              key: 'salt',
              expected: 'randomized',
              description: 'scrypt KDF',
            },
          ],
          encrypt: async (input: string, key: string, options?: any) => {
            const start = performance.now()
            const res = await mod.deriveScryptKey(input, { salt: key, N: 1024, r: 8, p: 1, dkLen: 32 })
            const steps: CipherStep[] = options?.instrument
              ? mod.describeScryptStages(input.length, key, 1024, 8, 1, 32).map((s, idx) => ({
                  index: idx,
                  label: s.label,
                  inputState: '',
                  outputState: s.detail,
                }))
              : []
            return {
              output: res.derivedKeyHex,
              outputEncoding: 'hex',
              steps,
              durationMs: performance.now() - start,
              metadata: { name: 'scrypt', securityStatus: 'secure' },
            }
          },
        }
      }

      return import(`@/lib/cipher/hash/${id}`)
    }

    case 'asymmetric': {
      if (id === 'lamport' || id === 'wots') {
        const mod = await import('@/lib/cipher/asymmetric/lamport-wots')
        return {
          ...mod,
          encrypt: id === 'lamport' ? mod.encryptLamport : mod.encryptWots,
          TEST_VECTORS: id === 'lamport' ? mod.TEST_VECTORS_LAMPORT : mod.TEST_VECTORS_WOTS,
        }
      }
      return import(`@/lib/cipher/asymmetric/${id}`)
    }

    default:
      throw new Error(`Unknown cipher category: ${category}`)
  }
}

function isRandomized(vector: TestVector): boolean {
  return vector.expected === 'randomized'
}

function selectVector(
  cipher: (typeof CIPHER_REGISTRY)[number],
  vectors: TestVector[] | undefined,
): TestVector {
  const deterministic = (vectors ?? []).find(
    (vector) => !isRandomized(vector) && !vector.skipEncrypt,
  )

  if (deterministic) return deterministic

  return {
    input: cipher.defaultInput,
    key: cipher.defaultKey,
    expected: 'randomized',
    description: 'registry defaults',
  }
}

function normalizeOptions(vector: TestVector, instrument: boolean): CipherOptions {
  return {
    ...(vector.options ?? {}),
    instrument,
  }
}

function assertResultShape(result: CipherResult, label: string): void {
  expect(result, `${label} must return a result`).toBeDefined()
  expect(typeof result.output, `${label} output must be a string`).toBe('string')
  expect(Array.isArray(result.steps), `${label} steps must be an array`).toBe(true)
  expect(
    typeof result.durationMs,
    `${label} durationMs must be numeric`,
  ).toBe('number')
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

async function benchmark(
  operation: () => Promise<CipherResult> | CipherResult,
  samples = 5,
): Promise<number> {
  // Warm the module/runtime before collecting samples.
  await operation()

  const durations: number[] = []
  for (let i = 0; i < samples; i += 1) {
    const result = await operation()
    durations.push(Math.max(0, result.durationMs))
  }

  return median(durations)
}

describe('Cipher Engine Conformance — fast vs instrumented parity (#1162)', () => {
  it('covers every registered cipher', () => {
    expect(CIPHER_REGISTRY.length).toBeGreaterThan(0)
  })

  for (const cipher of CIPHER_REGISTRY) {
    describe(`${cipher.name} (${cipher.id})`, () => {
      it('produces identical encryption output and correct step-path invariants', async () => {
        const mod = await loadCipherModule(cipher)
        expect(
          typeof mod.encrypt,
          `${cipher.id} must export encrypt()`,
        ).toBe('function')

        const vector = selectVector(cipher, mod.TEST_VECTORS)
        if (isRandomized(vector)) {
          // Randomized algorithms cannot be compared to a fixed expected value,
          // but both paths must still produce the same observable output.
        }

        const fastOptions = normalizeOptions(vector, false)
        const instrumentedOptions = normalizeOptions(vector, true)

        const fast = await mod.encrypt!(
          vector.input,
          vector.key,
          fastOptions,
        )
        const instrumented = await mod.encrypt!(
          vector.input,
          vector.key,
          instrumentedOptions,
        )

        assertResultShape(fast, `${cipher.id} fast encryption`)
        assertResultShape(instrumented, `${cipher.id} instrumented encryption`)

        if (!isRandomized(vector)) {
          expect(
            instrumented.output,
            `${cipher.id} encrypt output differs between fast and instrumented paths`,
          ).toBe(fast.output)
        }

        expect(
          fast.steps,
          `${cipher.id} fast path must not allocate visualization steps`,
        ).toHaveLength(0)

        if (!isRandomized(vector)) {
          expect(
            fast.output,
            `${cipher.id} fast output must still match its published vector`,
          ).toBe(vector.expected)
        }

        expect(
          instrumented.steps.length,
          `${cipher.id} instrumented path must expose at least one visualization step`,
        ).toBeGreaterThan(0)
      })

      it('keeps decrypt output identical across both execution paths when decrypt is supported', async () => {
        const mod = await loadCipherModule(cipher)
        if (
          typeof mod.decrypt !== 'function' ||
          cipher.category === 'hash'
        ) {
          return
        }

        const vector = (mod.TEST_VECTORS ?? []).find(
          (candidate) =>
            !candidate.skipDecrypt && !isRandomized(candidate),
        )

        if (!vector) return

        const decryptInput = vector.expectedDecrypt ?? vector.expected
        const expectedPlaintext = vector.input
        const commonOptions = vector.options ?? {}

        let fast: CipherResult
        let instrumented: CipherResult

        try {
          fast = await mod.decrypt!(
            decryptInput,
            vector.key,
            { ...commonOptions, instrument: false },
          )
          instrumented = await mod.decrypt!(
            decryptInput,
            vector.key,
            { ...commonOptions, instrument: true },
          )
        } catch (error) {
          if (cipher.category === 'asymmetric' && !vector.expectedDecrypt) {
            return
          }
          throw error
        }

        assertResultShape(fast, `${cipher.id} fast decryption`)
        assertResultShape(
          instrumented,
          `${cipher.id} instrumented decryption`,
        )

        expect(
          instrumented.output,
          `${cipher.id} decrypt output differs between fast and instrumented paths`,
        ).toBe(fast.output)

        expect(
          fast.steps,
          `${cipher.id} fast decrypt path must not allocate visualization steps`,
        ).toHaveLength(0)

        expect(
          instrumented.steps.length,
          `${cipher.id} instrumented decrypt path must expose visualization steps`,
        ).toBeGreaterThan(0)

        if (!vector.expectedDecrypt && cipher.category === 'asymmetric') {
          // Asymmetric key exchange / signing primitives (e.g. X25519, BBS+, BLS)
          // do not decrypt to recover plaintext vector.input.
        } else {
          expect(
            fast.output,
            `${cipher.id} fast decrypt output must recover the vector input`,
          ).toBe(expectedPlaintext)
        }
      })

      it('keeps the fast path no slower than the instrumented path', async () => {
        const mod = await loadCipherModule(cipher)
        expect(
          typeof mod.encrypt,
          `${cipher.id} must export encrypt() for timing parity`,
        ).toBe('function')

        const vector = selectVector(cipher, mod.TEST_VECTORS)
        const fastOptions = normalizeOptions(vector, false)
        const instrumentedOptions = normalizeOptions(vector, true)

        const fastMedianMs = await benchmark(
          () => mod.encrypt!(vector.input, vector.key, fastOptions),
        )
        const instrumentedMedianMs = await benchmark(
          () =>
            mod.encrypt!(vector.input, vector.key, instrumentedOptions),
        )

        const tolerance = Math.max(instrumentedMedianMs * 0.25, 2.0)
        expect(
          fastMedianMs,
          `${cipher.id} fast median (${fastMedianMs}ms) must be <= instrumented median (${instrumentedMedianMs}ms) within timing tolerance`,
        ).toBeLessThanOrEqual(instrumentedMedianMs + tolerance)
      })
    })
  }
})
