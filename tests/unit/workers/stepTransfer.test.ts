import { describe, expect, it } from 'vitest'
import type { CipherStep } from '@/lib/cipher/types'
import {
  decodeCipherSteps,
  encodeCipherSteps,
  WORKER_STEP_TRANSFER_THRESHOLD,
} from '@/lib/workers/stepTransfer'

const step: CipherStep = {
  index: 0,
  label: 'Round 1',
  inputState: '00',
  outputState: 'ff',
  highlight: [0],
  note: 'Example step',
}

describe('cipher step transfer protocol', () => {
  it('uses the large-trace transfer threshold', () => {
    expect(WORKER_STEP_TRANSFER_THRESHOLD).toBe(100)
  })

  it('round-trips cipher steps through a transferable byte buffer', () => {
    const steps = Array.from({ length: 500 }, (_, index) => ({
      ...step,
      index,
      label: `Round ${index + 1}`,
    }))

    const encoded = encodeCipherSteps(steps)
    expect(encoded).toBeInstanceOf(Uint8Array)
    expect(encoded.byteLength).toBeGreaterThan(0)

    const decoded = decodeCipherSteps(encoded.buffer)
    expect(decoded).toEqual(steps)
  })

  it('rejects malformed transferred payloads', () => {
    const malformed = new TextEncoder().encode('{"steps":{}}')
    expect(() => decodeCipherSteps(malformed)).toThrow(
      'Invalid transferred cipher steps payload.',
    )
  })
})
it("processes trace data in bounded batches", () => {
  const steps = Array.from({ length: 100 }, (_, index) => ({
    ...step,
    index,
    label: `Round ${index + 1}`,
  }));

  const batchSize = 16;
  const batches = [];

  for (let offset = 0; offset < steps.length; offset += batchSize) {
    batches.push(steps.slice(offset, offset + batchSize));
  }

  expect(batches.length).toBe(7);
  expect(Math.max(...batches.map((batch) => batch.length))).toBe(16);
  expect(batches.flat()).toEqual(steps);
});