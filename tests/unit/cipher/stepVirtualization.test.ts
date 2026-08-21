import { describe, expect, it } from 'vitest'
import type { CipherResult, CipherStep } from '../../../lib/cipher/types'
import { createVirtualizedCipherResult } from '../../../lib/cipher/stepVirtualization'

function makeResult(count: number): CipherResult {
  const steps: CipherStep[] = Array.from({ length: count }, (_, index) => ({
    index,
    label: `Step ${index + 1}`,
    inputState: `in-${index}`,
    outputState: `out-${index}`,
    note: `note-${index}`,
    isMilestone: index % 5 === 0,
  }))

  return {
    output: 'done',
    outputEncoding: 'utf8',
    steps,
    metadata: { name: 'Test', securityStatus: 'secure' },
    durationMs: 1,
  }
}

describe('step virtualization', () => {
  it('keeps only a three-step hydration window while preserving metadata', () => {
    const result = createVirtualizedCipherResult(makeResult(20))

    expect(result.steps.length).toBe(20)
    expect(result.stepMetadata).toHaveLength(20)
    expect(result.stepMetadata[5]).toMatchObject({ index: 5, label: 'Step 6' })

    expect(result.steps[10]?.outputState).toBe('out-10')
    expect(result.steps[11]?.outputState).toBe('out-11')
    expect(result.steps[9]?.outputState).toBe('out-9')

    // The lazy array intentionally has no enumerable hydrated entries; consumers
    // must access an index to hydrate it, so React state does not retain 20 objects.
    expect(Object.keys(result.steps)).toHaveLength(0)
  })

  it('serializes back to a complete trace on demand', () => {
    const result = createVirtualizedCipherResult(makeResult(6))
    const serialized = JSON.stringify(result.steps)
    const parsed = JSON.parse(serialized) as CipherStep[]

    expect(parsed).toHaveLength(6)
    expect(parsed[5].outputState).toBe('out-5')
  })
})
