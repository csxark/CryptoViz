import { renderHook, act } from '@testing-library/react'
import { useCipherWorker } from '@/lib/hooks/useCipherWorker'
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

    expect(parsedPayload.cipherId).toBe('caesar')
    expect(parsedPayload.input).toBe('hello')
    expect(parsedPayload.key).toBe('3')

    // Simulate worker success
    act(() => {
      worker.onmessage!({
        data: {
          id: parsedPayload.id,
          success: true,
          result: { output: 'khoor', steps: [] }
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
    expect(parsedPayload2.input).toBe('world')

    // Complete the second request successfully
    act(() => {
      secondWorker.onmessage!({
        data: {
          id: parsedPayload2.id,
          success: true,
          result: { output: 'zruog', steps: [] }
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
})
