import { renderHook, act } from '@testing-library/react'
import { useCipherWorker, clearCipherWorkerCache } from '@/lib/hooks/useCipherWorker'
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
    expect(worker.terminate).toHaveBeenCalled()
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
    let promise2: Promise<any>
    act(() => {
      promise2 = result.current.runCipher('encrypt', 'caesar', 'hello', '3', { bypassCache: true })
    })

    expect(worker.postMessage).toHaveBeenCalledTimes(2) // Calls worker again
  })

  it('respects the LRU cache limit and evicts the oldest items', async () => {
    const { result } = renderHook(() => useCipherWorker())
    const worker = MockWorker.lastInstance()!

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
    let promiseEvicted: Promise<any>
    act(() => {
      promiseEvicted = result.current.runCipher('encrypt', 'caesar', 'input-0', '3')
    })
    expect(activeWorker.postMessage).toHaveBeenCalledTimes(1) // Evicted and called worker!
  })
})
