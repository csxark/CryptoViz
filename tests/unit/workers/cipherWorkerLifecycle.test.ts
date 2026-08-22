import { describe, expect, it } from 'vitest'
import { WorkerJobLifecycle } from '@/lib/workers/cipher-worker-lifecycle'

describe('WorkerJobLifecycle', () => {
  it('enforces unique job IDs', () => {
    const lifecycle = new WorkerJobLifecycle()
    lifecycle.create('job-1', 'request-1')
    expect(() => lifecycle.create('job-1', 'request-2')).toThrow(/Duplicate worker job ID/)
  })

  it('transitions CREATED -> RUNNING -> COMPLETED and removes active state', () => {
    const lifecycle = new WorkerJobLifecycle()
    lifecycle.create('job-1', 'request-1')
    lifecycle.start('job-1')
    const completed = lifecycle.complete('job-1')

    expect(completed?.state).toBe('COMPLETED')
    expect(lifecycle.get('job-1')).toBeUndefined()
    expect(lifecycle.cancel('job-1')).toBe('COMPLETED')
  })

  it('makes cancellation idempotent and race-safe', () => {
    const lifecycle = new WorkerJobLifecycle()
    lifecycle.create('job-1', 'request-1')
    lifecycle.start('job-1')

    expect(lifecycle.cancel('job-1')).toBe('CANCELLING')
    expect(lifecycle.cancel('job-1')).toBe('CANCELLING')
    expect(lifecycle.complete('job-1')).toBeUndefined()
    expect(lifecycle.cancelComplete('job-1')?.state).toBe('CANCELLED')
    expect(lifecycle.cancel('job-1')).toBe('CANCELLED')
  })

  it('finishes a cancelling job as CANCELLED and cleans active state', () => {
    const lifecycle = new WorkerJobLifecycle()
    lifecycle.create('job-1', 'request-1')
    lifecycle.start('job-1')
    lifecycle.cancel('job-1')

    const cancelled = lifecycle.cancelComplete('job-1')
    expect(cancelled?.state).toBe('CANCELLED')
    expect(lifecycle.hasActive('job-1')).toBe(false)
    expect(lifecycle.cancel('job-1')).toBe('CANCELLED')
  })

  it('bounds terminal ID history to prevent unbounded retention', () => {
    const lifecycle = new WorkerJobLifecycle()
    for (let index = 0; index < 2050; index += 1) {
      const id = `job-${index}`
      lifecycle.create(id, `request-${index}`)
      lifecycle.complete(id)
    }

    expect(lifecycle.size()).toBe(0)
    expect(lifecycle.cancel('job-2049')).toBe('COMPLETED')
    expect(lifecycle.cancel('job-0')).toBe('NOT_FOUND')
  })
})
