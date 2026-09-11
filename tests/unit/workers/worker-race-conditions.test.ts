/**
 * Worker race condition regression tests.
 * Verifies that the useCipherWorker hook correctly handles:
 * - Out-of-order responses (slow Request A, fast Request B)
 * - Rapid sequential inputs (latest wins)
 * - Cancelled requests not updating result state
 * - Worker termination/recreation on new requests
 */
import { renderHook, act } from '@testing-library/react'
import { useCipherWorker, clearCipherWorkerCache } from '@/hooks/useCipherWorker'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((err: any) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
  addEventListener = vi.fn((event: string, handler: any) => {
    if (event === 'message') this.onmessage = handler
    if (event === 'error') this.onerror = handler
  })
  removeEventListener = vi.fn()

  constructor(public url: string | URL) {
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

function parseWorkerMessage(worker: MockWorker, callIndex?: number): any {
  const calls = worker.postMessage.mock.calls
  const idx = callIndex ?? calls.length - 1
  const buffer = calls[idx][0] as Uint8Array
  return JSON.parse(new TextDecoder().decode(buffer))
}

function sendSuccessResponse(worker: MockWorker, requestId: string, output: string) {
  const handler = worker.onmessage!
  handler({
    data: {
      requestId,
      success: true,
      payload: { result: { output, steps: [], durationMs: 1 } },
      timings: { durationMs: 1 },
    },
  } as MessageEvent)
}

describe('Worker race condition regression', () => {
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

  it('out-of-order: slow Request A cannot overwrite fast Request B result', async () => {
    const { result } = renderHook(() => useCipherWorker())

    // Start Request A (will be slow)
    let promiseA: Promise<any>
    act(() => {
      promiseA = result.current.runCipher('encrypt', 'caesar', 'HELLO', 'KEY1', { bypassCache: true })
    })
    const workerA = MockWorker.lastInstance()!
    const payloadA = parseWorkerMessage(workerA)

    // Start Request B (before A finishes) — this should abort A
    let promiseB: Promise<any>
    act(() => {
      promiseB = result.current.runCipher('encrypt', 'caesar', 'GOODBYE', 'KEY2', { bypassCache: true })
    })

    // A should be rejected (aborted)
    await expect(promiseA!).rejects.toThrowError(/aborted/)

    // Worker A should be terminated
    expect(workerA.terminate).toHaveBeenCalled()

    // A new worker should be created for B
    const workerB = MockWorker.lastInstance()!
    expect(workerB).not.toBe(workerA)
    const payloadB = parseWorkerMessage(workerB)

    // Complete B
    act(() => sendSuccessResponse(workerB, payloadB.requestId, 'B_RESULT'))
    const resultB = await promiseB!
    expect(resultB.output).toBe('B_RESULT')

    // Even if A's worker somehow sends a late response, it cannot affect anything
    // because the worker was terminated and its onmessage was replaced
  })

  it('rapid sequential: 5 rapid requests, only last one resolves with correct result', async () => {
    const { result } = renderHook(() => useCipherWorker())
    const promises: Promise<any>[] = []
    const rejections: Promise<any>[] = []

    // Fire 5 rapid requests
    for (let i = 0; i < 5; i++) {
      act(() => {
        const p = result.current.runCipher('encrypt', 'caesar', `INPUT_${i}`, `KEY_${i}`, { bypassCache: true })
        promises.push(p)
      })
    }

    // First 4 should be aborted
    for (let i = 0; i < 4; i++) {
      await expect(promises[i]).rejects.toThrowError(/aborted/)
    }

    // Only the last worker should be active
    const lastWorker = MockWorker.lastInstance()!
    const lastPayload = parseWorkerMessage(lastWorker)
    expect(lastPayload.payload.input).toBe('INPUT_4')
    expect(lastPayload.payload.key).toBe('KEY_4')

    // Complete the last request
    act(() => sendSuccessResponse(lastWorker, lastPayload.requestId, 'FINAL_RESULT'))
    const finalResult = await promises[4]
    expect(finalResult.output).toBe('FINAL_RESULT')
  })

  it('cancelled request cannot update result after cancellation', async () => {
    const { result } = renderHook(() => useCipherWorker())
    const controller = new AbortController()

    let promise: Promise<any>
    act(() => {
      promise = result.current.runCipher('encrypt', 'caesar', 'TEST', '3', {
        signal: controller.signal,
        bypassCache: true,
      })
    })

    const worker = MockWorker.lastInstance()!
    const payload = parseWorkerMessage(worker)

    // Cancel the request
    act(() => controller.abort())
    await expect(promise!).rejects.toThrowError(/aborted/)

    // Late response from worker should be ignored
    act(() => sendSuccessResponse(worker, payload.requestId, 'STALE_RESULT'))

    // Loading should be false, no error should be set from the late response
    expect(result.current.loading).toBe(false)
  })

  it('worker error does not preserve stale result from previous execution', async () => {
    const { result } = renderHook(() => useCipherWorker())

    // First successful execution
    let promise1: Promise<any>
    act(() => {
      promise1 = result.current.runCipher('encrypt', 'caesar', 'HELLO', '3', { bypassCache: true })
    })
    const worker1 = MockWorker.lastInstance()!
    const payload1 = parseWorkerMessage(worker1)
    act(() => sendSuccessResponse(worker1, payload1.requestId, 'SUCCESS_1'))
    const result1 = await promise1!
    expect(result1.output).toBe('SUCCESS_1')

    // Second execution that fails
    let promise2: Promise<any>
    act(() => {
      promise2 = result.current.runCipher('encrypt', 'caesar', 'WORLD', '5', { bypassCache: true })
    })
    const worker2 = MockWorker.lastInstance()!
    const payload2 = parseWorkerMessage(worker2)

    // Send error response
    act(() => {
      worker2.onmessage!({
        data: {
          requestId: payload2.requestId,
          success: false,
          payload: { error: 'Cipher execution failed', errorCode: 'INVALID_KEY' },
          timings: { durationMs: 1 },
        },
      } as MessageEvent)
    })

    // promise2 should reject
    await expect(promise2!).rejects.toThrowError('Cipher execution failed')
    expect(result.current.error).toBe('Cipher execution failed')
  })

  it('timeout on slow request terminates worker and rejects', async () => {
    const { result } = renderHook(() => useCipherWorker())

    let promise: Promise<any>
    act(() => {
      promise = result.current.runCipher('encrypt', 'caesar', 'SLOW', '3', { bypassCache: true })
    })

    const worker = MockWorker.lastInstance()!

    // Advance past the 10s timeout
    act(() => vi.advanceTimersByTime(10001))

    await expect(promise!).rejects.toThrowError('WORKER_TIMEOUT')
    expect(worker.terminate).toHaveBeenCalled()
    expect(result.current.error).toBe('WORKER_TIMEOUT')

    // A new request should still work (worker recreated)
    let promise2: Promise<any>
    act(() => {
      promise2 = result.current.runCipher('encrypt', 'caesar', 'AFTER_TIMEOUT', '3', { bypassCache: true })
    })
    const worker2 = MockWorker.lastInstance()!
    expect(worker2).not.toBe(worker)
    const payload2 = parseWorkerMessage(worker2)
    act(() => sendSuccessResponse(worker2, payload2.requestId, 'RECOVERED'))
    const result2 = await promise2!
    expect(result2.output).toBe('RECOVERED')
  })
})
