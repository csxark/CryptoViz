import type { CipherResult, CipherStep } from './types'

/**
 * Step Metadata cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export interface StepMetadata {
  index: number
  label: string
  sublabel?: string
  isMilestone?: boolean
}

/**
 * Virtualized Cipher Result cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export interface VirtualizedCipherResult extends Omit<CipherResult, "steps"> {
  /** Lazy step collection. Only a small number of full step objects are retained. */
  steps: CipherStep[]
  stepMetadata: StepMetadata[]
}

const VIRTUALIZED_STEP_CACHE_SIZE = 32

type StepCache = Map<number, CipherStep>

function createStepMetadata(step: CipherStep, index: number): StepMetadata {
  return {
    index,
    label: step.label,
    ...(step.sublabel ? { sublabel: step.sublabel } : {}),
    ...(step.isMilestone ? { isMilestone: true } : {}),
  }
}

function hydrateStep(serialized: string): CipherStep {
  return JSON.parse(serialized) as CipherStep
}

export function createVirtualizedCipherResult(
  result: CipherResult,
): VirtualizedCipherResult {
  const { steps: sourceSteps, ...resultWithoutSteps } = result

  const serializedSteps = sourceSteps.map((step) => JSON.stringify(step))
  const stepMetadata = sourceSteps.map(createStepMetadata)
  const cache: StepCache = new Map()

  const touch = (index: number): CipherStep | undefined => {
    if (index < 0 || index >= serializedSteps.length) {
      return undefined
    }

    const cached = cache.get(index)

    if (cached) {
      cache.delete(index)
      cache.set(index, cached)
      return cached
    }

    const hydrated = hydrateStep(serializedSteps[index])

    cache.set(index, hydrated)

    while (cache.size > VIRTUALIZED_STEP_CACHE_SIZE) {
      const oldest = cache.keys().next().value

      if (typeof oldest !== "number") {
        break
      }

      cache.delete(oldest)
    }

    return hydrated
  }

  const steps = new Proxy([] as CipherStep[], {
    get(_target, property, receiver) {
      if (property === "length") {
        return serializedSteps.length
      }

      if (property === "toJSON") {
        return () =>
          Array.from(
            { length: serializedSteps.length },
            (_, index) => touch(index),
          )
      }

      if (
        typeof property === "string" &&
        /^\d+$/.test(property)
      ) {
        return touch(Number(property))
      }

      return Reflect.get(_target, property, receiver)
    },

    has(_target, property) {
      if (
        typeof property === "string" &&
        /^\d+$/.test(property)
      ) {
        return Number(property) < serializedSteps.length
      }

      return Reflect.has(_target, property)
    },
  })

  return {
    ...resultWithoutSteps,
    steps,
    stepMetadata,
  }
}
/**
 * Get Virtualized Step cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function getVirtualizedStep(
  result: VirtualizedCipherResult | null,
  index: number,
): CipherStep | undefined {
  return result?.steps[index]
}
