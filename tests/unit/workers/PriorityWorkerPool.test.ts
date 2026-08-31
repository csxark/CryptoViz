
import { describe, expect, it, vi } from 'vitest'
import { WorkerPool } from '../../../lib/workers/pool'

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  postMessage = vi.fn().mockImplementation((data) => { structuredClone(data); })
  terminate = vi.fn()
}

describe('WorkerPool priority scheduling', () => {
  it('runs interactive work before queued background work', async () => {
    const workers: FakeWorker[] = []
    const pool = new WorkerPool(() => {
      const worker = new FakeWorker()
      workers.push(worker)
      return worker as unknown as Worker
    }, 1)

    const background = pool.execute({ name: 'background' }, undefined, { priority: 'BACKGROUND' })
    const normal = pool.execute({ name: 'normal' }, undefined, { priority: 'NORMAL' })
    const interactive = pool.execute({ name: 'interactive' }, undefined, { priority: 'INTERACTIVE' })

    expect(workers).toHaveLength(2)
    expect(workers[1].postMessage).toHaveBeenCalledWith(expect.objectContaining({ priority: 'INTERACTIVE', jobId: expect.any(String) }))

    workers[1].onmessage?.({ data: { type: 'DONE', payload: { result: 'interactive' } } } as MessageEvent)
    workers[0].onmessage?.({ data: { type: 'DONE', payload: { result: 'background' } } } as MessageEvent)

    await expect(interactive).resolves.toBe('interactive')
    await expect(background).resolves.toBe('background')
    workers[0].onmessage?.({ data: { type: 'DONE', payload: { result: 'normal' } } } as MessageEvent)
    await expect(normal).resolves.toBe('normal')
    pool.terminate()
  })

  it('forwards progress updates to the caller', async () => {
    const worker = new FakeWorker()
    const pool = new WorkerPool(() => worker as unknown as Worker, 1)
    const onProgress = vi.fn()
    const promise = pool.execute({ name: 'heavy' }, undefined, { onProgress })
    worker.onmessage?.({ data: { type: 'PROGRESS', jobId: 'unknown', percent: 42, currentMilestone: 'Halfway' } } as MessageEvent)
    worker.onmessage?.({ data: { type: 'DONE', payload: { result: 7 } } } as MessageEvent)
    await expect(promise).resolves.toBe(7)
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ percent: 42, currentMilestone: 'Halfway' }))
    pool.terminate()
  })

  it('cancels queued jobs without terminating workers', async () => {
    const worker = new FakeWorker()
    const pool = new WorkerPool(() => worker as unknown as Worker, 1)
    const promise = pool.execute({ name: 'queued' }, undefined, { priority: 'BACKGROUND' })
    const controller = new AbortController()
    controller.abort()
    // A pre-aborted signal is rejected before enqueueing.
    const aborted = pool.execute({ name: 'aborted' }, undefined, { priority: 'BACKGROUND', signal: controller.signal })
    await expect(aborted).rejects.toMatchObject({ name: 'AbortError' })
    expect(worker.terminate).not.toHaveBeenCalled()
    worker.onmessage?.({ data: { type: 'DONE', payload: { result: 'queued' } } } as MessageEvent)
    await expect(promise).resolves.toBe('queued')
    pool.terminate()
  })
})
