import type { CipherResult, CipherStep } from './types'

export interface StepMetadata {
  index: number
  label: string
  sublabel?: string
  isMilestone?: boolean
}

export interface VirtualizedCipherResult extends CipherResult {
  /** Lightweight descriptors for navigation; full step objects are hydrated on demand. */
  stepMetadata: StepMetadata[]
}

const VIRTUALIZED_STEP_CACHE_SIZE = 3

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

/**
 * Keeps the trace in compact per-step JSON and exposes an Array-compatible lazy
 * view. Only the active step and its two neighbours are retained as objects.
 * Array serialization (e.g. trace export) intentionally hydrates every step.
 */
export function createVirtualizedCipherResult(
  result: CipherResult,
): VirtualizedCipherResult {
  const serializedSteps = result.steps.map((step) => JSON.stringify(step))
  const stepMetadata = result.steps.map(createStepMetadata)
  const cache: StepCache = new Map()

  const touch = (index: number): CipherStep | undefined => {
    if (index < 0 || index >= serializedSteps.length) return undefined

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
      if (typeof oldest !== 'number') break
      cache.delete(oldest)
    }

    return hydrated
  }

  const steps = new Proxy([] as CipherStep[], {
    get(_target, property, receiver) {
      if (property === 'length') return serializedSteps.length
      if (property === 'toJSON') {
        return () => Array.from({ length: serializedSteps.length }, (_, index) => touch(index))
      }

      if (typeof property === 'string' && /^\d+$/.test(property)) {
        return touch(Number(property))
      }

      return Reflect.get(receiver, property)
    },
  })

  return {
    ...result,
    steps,
    stepMetadata,
  }
}

export function getVirtualizedStep(
  result: VirtualizedCipherResult | null,
  index: number,
): CipherStep | undefined {
  return result?.steps[index]
}
