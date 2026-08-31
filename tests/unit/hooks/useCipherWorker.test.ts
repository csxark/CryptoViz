import { renderHook, act } from '@testing-library/react'
import { useCipherWorker, clearCipherWorkerCache } from '@/hooks/useCipherWorker'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock Worker class
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((err: any) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()

  constructor(public url: string) {
    MockWorker.instances.push(this)
  }

  static instances: MockWorker[] = []
  static lastInstance(): MockWorker | null {
    return MockWorker.instances[MockWorker.instances.length - 1] || null
  }
  static clearInstances() {
    MockWorker.instances = []
  }
}

describe('useCipherWorker', () => {
  beforeEach(() => {
    vi.stubGlobal('Worker', MockWorker)
    MockWorker.clearInstances()
    clearCipherWorkerCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('initializes worker and handles successful message execution', async () => {
    const { result } = renderHook(() => useCipherWorker())
    
    expect(MockWorker.instances.length).toBe(1)
    const worker = MockWorker.lastInstance()!

    // Start running cipher
    let promise: Promise<any>
    act(() => {
      promise = result.current.runCipher('encrypt', 'caesar', 'hello', '3')
    })

    // Expect message to be posted
    expect(worker.postMessage).toHaveBeenCalled()

    // Decode message sent to postMessage
    const firstCallArgs = worker.postMessage.mock.calls[0]
    const sentBuffer = firstCallArgs[0] as Uint8Array
    const decoder = new TextDecoder()
    const parsedPayload = JSON.parse(decoder.decode(sentBuffer))

    expect(parsedPayload.type).toBe('encrypt')
    expect(parsedPayload.payload.cipherId).toBe('caesar')
    expect(parsedPayload.payload.input).toBe('hello')
    expect(parsedPayload.payload.key).toBe('3')

    // Simulate worker success
    act(() => {
      worker.onmessage!({
        data: {
          requestId: parsedPayload.requestId,
          success: true,
          payload: { result: { output: 'khoor', steps: [] } },
          timings: { durationMs: 5 }
        }
      } as MessageEvent)
    })

    const res = await promise!
    expect(res.output).toBe('khoor')
  })

  it('aborts previous request automatically when a new request is started', async () => {
    const { result } = renderHook(() => useCipherWorker())

    let promise1: Promise<any>
    let promise2: Promise<any>

    act(() => {
      promise1 = result.current.runCipher('encrypt', 'caesar', 'hello', '3')
    })

    const firstWorker = MockWorker.lastInstance()!

    // Start a second cipher before the first one completes
    act(() => {
      promise2 = result.current.runCipher('encrypt', 'caesar', 'world', '3')
    })

    // Expect the first promise to reject with AbortError
    await expect(promise1!).rejects.toThrowError(/aborted/)
    
    // The hook should terminate the first worker and spawn a new one
    expect(firstWorker.terminate).toHaveBeenCalled()
    expect(MockWorker.instances.length).toBe(2)

    const secondWorker = MockWorker.lastInstance()!
    const secondCallArgs = secondWorker.postMessage.mock.calls[0]
    const parsedPayload2 = JSON.parse(new TextDecoder().decode(secondCallArgs[0] as Uint8Array))
    expect(parsedPayload2.payload.input).toBe('world')

    // Complete the second request successfully
    act(() => {
      secondWorker.onmessage!({
        data: {
          requestId: parsedPayload2.requestId,
          success: true,
          payload: { result: { output: 'zruog', steps: [] } },
          timings: { durationMs: 8 }
        }
      } as MessageEvent)
    })

    const res2 = await promise2!
    expect(res2.output).toBe('zruog')
  })

  it('handles aborting using an explicit AbortSignal', async () => {
    const { result } = renderHook(() => useCipherWorker())
    const controller = new AbortController()

    let promise: Promise<any>
    act(() => {
      promise = result.current.runCipher('encrypt', 'caesar', 'hello', '3', { signal: controller.signal })
    })

    const worker = MockWorker.lastInstance()!

    // Trigger abort manually
    act(() => {
      controller.abort()
    })

    await expect(promise!).rejects.toThrowError(/aborted/)
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'CANCEL', requestId: expect.any(String), jobId: expect.any(String) })
  })


  it('cancels cooperatively and ignores stale progress after cancellation', async () => {
    const { result } = renderHook(() => useCipherWorker())
    const controller = new AbortController()

    let promise: Promise<any>
    act(() => {
      promise = result.current.runCipher('encrypt', 'caesar', 'hello', '3', { signal: controller.signal })
    })

    const worker = MockWorker.lastInstance()!
    const sent = JSON.parse(new TextDecoder().decode(worker.postMessage.mock.calls[0][0] as Uint8Array))

    act(() => controller.abort())
    await expect(promise!).rejects.toThrowError(/aborted/)

    expect(worker.postMessage).toHaveBeenLastCalledWith({ type: 'CANCEL', requestId: sent.requestId, jobId: sent.jobId })

    act(() => {
      worker.onmessage!({
        data: { type: 'PROGRESS', jobId: sent.jobId, percent: 90, currentMilestone: 'stale' },
      } as MessageEvent)
    })

    expect(result.current.progress).not.toEqual(expect.objectContaining({ currentMilestone: 'stale' }))

    act(() => {
      worker.onmessage!({
        data: {
          requestId: sent.requestId,
          jobId: sent.jobId,
          success: false,
          payload: { error: 'The user aborted the request.', errorCode: 'ABORTED' },
        },
      } as MessageEvent)
    })
  })

  it('triggers WORKER_TIMEOUT error after 10 seconds of inactivity', async () => {
    const { result } = renderHook(() => useCipherWorker())

    let promise: Promise<any>
    act(() => {
      promise = result.current.runCipher('encrypt', 'caesar', 'hello', '3')
    })

    const worker = MockWorker.lastInstance()!

    // Fast-forward 10 seconds
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    await expect(promise!).rejects.toThrowError('WORKER_TIMEOUT')
    expect(worker.terminate).toHaveBeenCalled()
    expect(result.current.error).toBe('WORKER_TIMEOUT')
  })

  it('memoizes/caches cipher results and avoids subsequent worker calls', async () => {
    const { result } = renderHook(() => useCipherWorker())
    const worker = MockWorker.lastInstance()!

    // Run first time (should call worker)
    let promise1: Promise<any>
    act(() => {
      promise1 = result.current.runCipher('encrypt', 'caesar', 'hello', '3')
    })
    expect(worker.postMessage).toHaveBeenCalledTimes(1)

    const firstCallArgs = worker.postMessage.mock.calls[0]
    const parsedPayload = JSON.parse(new TextDecoder().decode(firstCallArgs[0] as Uint8Array))

    act(() => {
      worker.onmessage!({
        data: {
          requestId: parsedPayload.requestId,
          success: true,
          payload: { result: { output: 'khoor', steps: [], durationMs: 4, metadata: { name: 'Caesar', securityStatus: 'broken' } } }
        }
      } as MessageEvent)
    })
    const res1 = await promise1!
    expect(res1.output).toBe('khoor')

    // Run second time with same inputs (should be instant and not call worker again)
    let promise2: Promise<any>
    act(() => {
      promise2 = result.current.runCipher('encrypt', 'caesar', 'hello', '3')
    })

    const res2 = await promise2!
    expect(res2.output).toBe('khoor')
    expect(worker.postMessage).toHaveBeenCalledTimes(1) // Call count remains 1
  })

  it('bypasses the cache when bypassCache is set to true', async () => {
    const { result } = renderHook(() => useCipherWorker())
    const worker = MockWorker.lastInstance()!

    // Run first time (should call worker)
    let promise1: Promise<any>
    act(() => {
      promise1 = result.current.runCipher('encrypt', 'caesar', 'hello', '3')
    })
    const firstCallArgs = worker.postMessage.mock.calls[0]
    const parsedPayload = JSON.parse(new TextDecoder().decode(firstCallArgs[0] as Uint8Array))

    act(() => {
      worker.onmessage!({
        data: {
          requestId: parsedPayload.requestId,
          success: true,
          payload: { result: { output: 'khoor', steps: [], durationMs: 4, metadata: { name: 'Caesar', securityStatus: 'broken' } } }
        }
      } as MessageEvent)
    })
    await promise1!

    // Run second time with bypassCache: true (should call worker again)
    let _promise2: Promise<any>
    act(() => {
      _promise2 = result.current.runCipher('encrypt', 'caesar', 'hello', '3', { bypassCache: true })
    })

    expect(worker.postMessage).toHaveBeenCalledTimes(2) // Calls worker again
  })

  it('respects the LRU cache limit and evicts the oldest items', async () => {
    const { result } = renderHook(() => useCipherWorker())
    const _worker = MockWorker.lastInstance()!

    // Populate the cache with MAX_CACHE_SIZE (200) items
    for (let i = 0; i <= 200; i++) {
      let promise: Promise<any>
      act(() => {
        promise = result.current.runCipher('encrypt', 'caesar', `input-${i}`, '3')
      })

      // The loop will spawn new workers when terminated/recreated, so get the current active worker
      const activeWorker = MockWorker.lastInstance()!
      const calls = activeWorker.postMessage.mock.calls
      const lastCall = calls[calls.length - 1]
      const parsedPayload = JSON.parse(new TextDecoder().decode(lastCall[0] as Uint8Array))

      act(() => {
        activeWorker.onmessage!({
          data: {
            requestId: parsedPayload.requestId,
            success: true,
            payload: { result: { output: `output-${i}`, steps: [], durationMs: 1, metadata: { name: 'Caesar', securityStatus: 'broken' } } }
          }
        } as MessageEvent)
      })
      await promise!
    }

    // Cache size limit is 200. We just inserted 201 items (index 0 to 200).
    // The very first item (index 0) should be evicted.
    // Querying index 1 (second item) should still be cached:
    const activeWorker = MockWorker.lastInstance()!
    activeWorker.postMessage.mockClear()

    let promiseCached: Promise<any>
    act(() => {
      promiseCached = result.current.runCipher('encrypt', 'caesar', 'input-1', '3')
    })
    await promiseCached!
    expect(activeWorker.postMessage).not.toHaveBeenCalled() // Retained in cache!

    // Querying index 0 (first item) should NOT be cached and call worker:
    let _promiseEvicted: Promise<any>
    act(() => {
      _promiseEvicted = result.current.runCipher('encrypt', 'caesar', 'input-0', '3')
    })
    expect(activeWorker.postMessage).toHaveBeenCalledTimes(1) // Evicted and called worker!
  })

  it('handles worker error events and converts to fatalError state cleanly', async () => {
    const { result } = renderHook(() => useCipherWorker())
    const worker = MockWorker.lastInstance()!

    let promise: Promise<any>
    act(() => {
      promise = result.current.runCipher('encrypt', 'caesar', 'test', '3')
    })

    act(() => {
      if (worker.onerror) {
        worker.onerror({ message: 'Script evaluation error in worker module' } as any)
      }
    })

    await expect(promise!).rejects.toThrowError(/Worker initialization error/)
  })

  it('handles worker typed error codes in response payload', async () => {
    const { result } = renderHook(() => useCipherWorker())
    const worker = MockWorker.lastInstance()!

    let promise: Promise<any>
    act(() => {
      promise = result.current.runCipher('encrypt', 'caesar', '', '3')
    })

    const parsed = JSON.parse(new TextDecoder().decode(worker.postMessage.mock.calls[0][0] as Uint8Array))

    act(() => {
      worker.onmessage!({
        data: {
          requestId: parsed.requestId,
          success: false,
          payload: { error: 'Input message is required.', errorCode: 'INPUT_REQUIRED' },
        },
      } as MessageEvent)
    })

    await expect(promise!).rejects.toThrowError('Input message is required.')
    expect(result.current.error).toBe('Input message is required.')
  })

  it('handles progress callback on custom onProgress option', async () => {
    const { result } = renderHook(() => useCipherWorker())
    const onProgress = vi.fn()

    let promise: Promise<any>
    act(() => {
      promise = result.current.runCipher('encrypt', 'caesar', 'hello', '3', { onProgress })
    })

    const worker = MockWorker.lastInstance()!
    const parsed = JSON.parse(new TextDecoder().decode(worker.postMessage.mock.calls[0][0] as Uint8Array))

    act(() => {
      worker.onmessage!({
        data: { type: 'PROGRESS', jobId: parsed.jobId, percent: 50, currentMilestone: 'Hashing block 1' },
      } as MessageEvent)
    })

    expect(onProgress).toHaveBeenCalledWith(50, 'Hashing block 1')
    expect(result.current.progress).toEqual({
      percent: 50,
      currentMilestone: 'Hashing block 1',
      jobId: parsed.jobId,
    })

    act(() => {
      worker.onmessage!({
        data: {
          requestId: parsed.requestId,
          success: true,
          payload: { result: { output: 'khoor', steps: [] } },
        },
      } as MessageEvent)
    })

    await promise!
    expect(result.current.progress).toBeNull()
  })

  it('handles multiple rapid serial requests without leaking active worker handlers', async () => {
    const { result } = renderHook(() => useCipherWorker())

    for (let i = 0; i < 5; i++) {
      let p: Promise<any>
      act(() => {
        p = result.current.runCipher('encrypt', 'caesar', `val-${i}`, '3')
      })

      const w = MockWorker.lastInstance()!
      const calls = w.postMessage.mock.calls
      const sent = JSON.parse(new TextDecoder().decode(calls[calls.length - 1][0] as Uint8Array))

      act(() => {
        w.onmessage!({
          data: {
            requestId: sent.requestId,
            success: true,
            payload: { result: { output: `res-${i}`, steps: [] } },
          },
        } as MessageEvent)
      })

      const out = await p!
      expect(out.output).toBe(`res-${i}`)
    }

    expect(result.current.loading).toBe(false)
  })

  it('sorts object keys in options to produce deterministic cache keys', async () => {
    const { result } = renderHook(() => useCipherWorker())
    const worker = MockWorker.lastInstance()!

    let promise1: Promise<any>
    act(() => {
      promise1 = result.current.runCipher('encrypt', 'caesar', 'data', '3', {
        mode: 'demo',
        rounds: 10,
      })
    })

    const parsed1 = JSON.parse(new TextDecoder().decode(worker.postMessage.mock.calls[0][0] as Uint8Array))

    act(() => {
      worker.onmessage!({
        data: {
          requestId: parsed1.requestId,
          success: true,
          payload: { result: { output: 'demo-out', steps: [] } },
        },
      } as MessageEvent)
    })

    await promise1!

    // Call with inverted option key order
    let promise2: Promise<any>
    act(() => {
      promise2 = result.current.runCipher('encrypt', 'caesar', 'data', '3', {
        rounds: 10,
        mode: 'demo',
      })
    })

    const res2 = await promise2!
    expect(res2.output).toBe('demo-out')
    // Should be a cache hit (calls stay 1)
    expect(worker.postMessage).toHaveBeenCalledTimes(1)
  })

  it('passes worker priority through in payload message', async () => {
    const { result } = renderHook(() => useCipherWorker())
    act(() => {
      result.current.runCipher('encrypt', 'caesar', 'priority-test', '3', { priority: 'HIGH' })
    })

    const worker = MockWorker.lastInstance()!
    const parsed = JSON.parse(new TextDecoder().decode(worker.postMessage.mock.calls[0][0] as Uint8Array))
    expect(parsed.priority).toBe('HIGH')
  })

  it('handles postMessage exceptions gracefully by rejecting promise', async () => {
    const { result } = renderHook(() => useCipherWorker())
    const worker = MockWorker.lastInstance()!
    worker.postMessage.mockImplementationOnce(() => {
      throw new Error('DataCloneError: failed to clone')
    })

    let promise: Promise<any>
    act(() => {
      promise = result.current.runCipher('encrypt', 'caesar', 'err-test', '3')
    })

    await expect(promise!).rejects.toThrowError('DataCloneError: failed to clone')
  })

  it('handles clearCipherWorkerCache to flush memoized entries', async () => {
    const { result } = renderHook(() => useCipherWorker())
    const worker = MockWorker.lastInstance()!

    let promise1: Promise<any>
    act(() => {
      promise1 = result.current.runCipher('encrypt', 'caesar', 'flush-test', '3')
    })

    const parsed = JSON.parse(new TextDecoder().decode(worker.postMessage.mock.calls[0][0] as Uint8Array))
    act(() => {
      worker.onmessage!({
        data: {
          requestId: parsed.requestId,
          success: true,
          payload: { result: { output: 'flushed', steps: [] } },
        },
      } as MessageEvent)
    })
    await promise1!

    clearCipherWorkerCache()

    let promise2: Promise<any>
    act(() => {
      promise2 = result.current.runCipher('encrypt', 'caesar', 'flush-test', '3')
    })

    expect(worker.postMessage).toHaveBeenCalledTimes(2) // Cache flushed!
  })

  it('handles instrumented option with steps decoding in payload result', async () => {
    const { result } = renderHook(() => useCipherWorker())
    const worker = MockWorker.lastInstance()!

    let promise: Promise<any>
    act(() => {
      promise = result.current.runCipher('encrypt', 'caesar', 'instrument-test', '3', { instrument: true })
    })

    const parsed = JSON.parse(new TextDecoder().decode(worker.postMessage.mock.calls[0][0] as Uint8Array))
    expect(parsed.payload.options.instrument).toBe(true)

    act(() => {
      worker.onmessage!({
        data: {
          requestId: parsed.requestId,
          success: true,
          payload: {
            result: {
              output: 'khoor',
              steps: [{ index: 0, label: 'Shift Character 0', inputState: 'i', outputState: 'l' }],
              durationMs: 5,
            },
          },
        },
      } as MessageEvent)
    })

    const res = await promise!
    expect(res.steps).toHaveLength(1)
    expect(res.steps[0].label).toBe('Shift Character 0')
  })

  it('rejects with fatal error immediately when fatal error state is already set', async () => {
    const { result } = renderHook(() => useCipherWorker())
    const worker = MockWorker.lastInstance()!

    // Trigger fatal error
    act(() => {
      if (worker.onerror) {
        worker.onerror({ message: 'Fatal crash' } as any)
      }
    })

    let promise: Promise<any>
    act(() => {
      promise = result.current.runCipher('encrypt', 'caesar', 'after-fatal', '3')
    })

    await expect(promise!).rejects.toThrowError(/Fatal crash/)
  })

  it('handles multiple active requests in map when fast parallel dispatches are triggered', async () => {
    const { result } = renderHook(() => useCipherWorker())

    let p1: Promise<any>
    let p2: Promise<any>

    act(() => {
      p1 = result.current.runCipher('encrypt', 'caesar', 'p1', '3')
    })
    act(() => {
      p2 = result.current.runCipher('encrypt', 'caesar', 'p2', '3')
    })

    await expect(p1!).rejects.toThrowError(/aborted/)

    const w2 = MockWorker.lastInstance()!
    const calls = w2.postMessage.mock.calls
    const parsed = JSON.parse(new TextDecoder().decode(calls[calls.length - 1][0] as Uint8Array))

    act(() => {
      w2.onmessage!({
        data: {
          requestId: parsed.requestId,
          success: true,
          payload: { result: { output: 'p2-out', steps: [] } },
        },
      } as MessageEvent)
    })

    const r2 = await p2!
    expect(r2.output).toBe('p2-out')
  })

  it('handles pre-aborted signal by rejecting immediately without calling worker', async () => {
    const { result } = renderHook(() => useCipherWorker())
    const controller = new AbortController()
    controller.abort()

    const initialWorker = MockWorker.lastInstance()!
    const initialCalls = initialWorker.postMessage.mock.calls.length

    let promise: Promise<any>
    act(() => {
      promise = result.current.runCipher('encrypt', 'caesar', 'pre-aborted', '3', { signal: controller.signal })
    })

    await expect(promise!).rejects.toThrowError(/aborted/)
    expect(initialWorker.postMessage).toHaveBeenCalledTimes(initialCalls)
  })

  it('handles decrypt action type dispatch cleanly to worker', async () => {
    const { result } = renderHook(() => useCipherWorker())
    const worker = MockWorker.lastInstance()!

    let promise: Promise<any>
    act(() => {
      promise = result.current.runCipher('decrypt', 'caesar', 'khoor', '3')
    })

    const parsed = JSON.parse(new TextDecoder().decode(worker.postMessage.mock.calls[0][0] as Uint8Array))
    expect(parsed.type).toBe('decrypt')
    expect(parsed.payload.input).toBe('khoor')

    act(() => {
      worker.onmessage!({
        data: {
          requestId: parsed.requestId,
          success: true,
          payload: { result: { output: 'hello', steps: [] } },
        },
      } as MessageEvent)
    })

    const res = await promise!
    expect(res.output).toBe('hello')
  })
})

