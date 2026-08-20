
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CipherResult } from '@/lib/cipher/types'
import type { WorkerRequest, WorkerResponse } from '@/types/worker'
import type { WorkerPriority } from '@/lib/workers/pool'

const MAX_CACHE_SIZE = 200
const resultCache = new Map<string, CipherResult>()
export interface CipherWorkerProgress {
  percent: number
  currentMilestone: string
  jobId: string
}
export interface RunCipherOptions {
  signal?: AbortSignal
  bypassCache?: boolean
  priority?: WorkerPriority
  onProgress?: (percent: number, message: string) => void
}
function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sortObjectKeys)
  return Object.fromEntries(Object.keys(obj).sort().map(k => [k, sortObjectKeys(obj[k])]))
}
function getCacheKey(action: 'encrypt' | 'decrypt', cipherId: string, input: string, key: string, options?: RunCipherOptions) {
  const { signal: _, bypassCache: __, onProgress: ___, priority: ____, ...cacheableOptions } = options || {}
  return JSON.stringify({ action, cipherId, input, key, options: sortObjectKeys(cacheableOptions) })
}
function cacheResult(key: string, result: CipherResult) {
  if (resultCache.has(key)) resultCache.delete(key)
  else if (resultCache.size >= MAX_CACHE_SIZE) {
    const oldest = resultCache.keys().next().value
    if (oldest !== undefined) resultCache.delete(oldest)
  }
  resultCache.set(key, result)
}
export function clearCipherWorkerCache() { resultCache.clear() }

export function useCipherWorker() {
  const workerRef = useRef<Worker | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<CipherWorkerProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fatalError, setFatalError] = useState<Error | null>(null)
  const activeRequestsRef = useRef(new Map<string, {
    resolve: (value: CipherResult) => void
    reject: (reason: any) => void
    signal?: AbortSignal
    onAbort?: () => void
    timeoutId?: ReturnType<typeof setTimeout>
    cacheKey?: string
    onProgress?: (percent: number, message: string) => void
  }>())

  const terminateWorkerAndRejectAll = useCallback((reason: Error) => {
    workerRef.current?.terminate()
    workerRef.current = null
    for (const req of activeRequestsRef.current.values()) {
      if (req.timeoutId) clearTimeout(req.timeoutId)
      if (req.signal && req.onAbort) req.signal.removeEventListener('abort', req.onAbort)
      req.reject(reason)
    }
    activeRequestsRef.current.clear()
    setLoading(false)
  }, [])

  const createWorker = useCallback(() => {
    if (typeof window === 'undefined') return null
    const worker = new Worker(new URL('../lib/workers/cipher.worker.ts', import.meta.url))
    worker.onmessage = (event: MessageEvent<WorkerResponse | any>) => {
      const data = event.data
      if (data?.type === 'PROGRESS') {
        const p = {
          percent: Math.max(0, Math.min(100, Number(data.percent))),
          currentMilestone: String(data.currentMilestone ?? ''),
          jobId: String(data.jobId ?? ''),
        }
        setProgress(p)
        activeRequestsRef.current.get(p.jobId)?.onProgress?.(p.percent, p.currentMilestone)
        return
      }
      const requestId = data.requestId
      const request = activeRequestsRef.current.get(requestId)
      if (!request) return
      if (request.timeoutId) clearTimeout(request.timeoutId)
      if (request.signal && request.onAbort) request.signal.removeEventListener('abort', request.onAbort)
      if (data.success && data.payload?.result) {
        if (request.cacheKey) cacheResult(request.cacheKey, data.payload.result)
        request.resolve(data.payload.result)
      } else {
        request.reject(new Error(data.payload?.error || 'Unknown worker error'))
      }
      activeRequestsRef.current.delete(requestId)
      if (activeRequestsRef.current.size === 0) {
        setLoading(false)
        setProgress(null)
      }
    }
    worker.onerror = (event) => {
      const errorObject = new Error(event.message || 'Web Worker initialization or runtime error.')
      setError(errorObject.message)
      setFatalError(errorObject)
      terminateWorkerAndRejectAll(errorObject)
    }
    return worker
  }, [terminateWorkerAndRejectAll])

  useEffect(() => {
    workerRef.current = createWorker()
    return () => workerRef.current?.terminate()
  }, [createWorker])

  const runCipher = useCallback((
    action: 'encrypt' | 'decrypt',
    cipherId: string,
    input: string,
    key: string,
    options?: RunCipherOptions,
  ): Promise<CipherResult> => {
    const cacheKey = getCacheKey(action, cipherId, input, key, options)
    if (!options?.bypassCache && resultCache.has(cacheKey)) return Promise.resolve(resultCache.get(cacheKey)!)
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        workerRef.current = createWorker()
        if (!workerRef.current) return reject(new Error('Web Worker is not available on SSR.'))
      }
      const id = crypto.randomUUID()
      const signal = options?.signal
      if (signal?.aborted) return reject(new DOMException('The user aborted the request.', 'AbortError'))
      let onAbort: (() => void) | undefined
      onAbort = () => {
        clearTimeout(timeoutId)
        workerRef.current?.postMessage({ type: 'CANCEL', requestId: id, jobId: id })
        activeRequestsRef.current.delete(id)
        setLoading(activeRequestsRef.current.size > 0)
        reject(new DOMException('The user aborted the request.', 'AbortError'))
      }
      if (signal) signal.addEventListener('abort', onAbort, { once: true })
      const timeoutId = setTimeout(() => {
        setError('WORKER_TIMEOUT')
        terminateWorkerAndRejectAll(new Error('WORKER_TIMEOUT'))
      }, 30000)
      activeRequestsRef.current.set(id, {
        resolve, reject, signal, onAbort, timeoutId, cacheKey, onProgress: options?.onProgress,
      })
      setLoading(true)
      setError(null)
      setProgress({ percent: 0, currentMilestone: 'Queued', jobId: id })
      const requestMessage: WorkerRequest = {
        type: action,
        requestId: id,
        jobId: id,
        priority: options?.priority ?? 'NORMAL',
        payload: { cipherId, input, key, options: { ...(options as any), signal: undefined, priority: undefined, onProgress: undefined } },
      }
      try {
        const payloadBuffer = new TextEncoder().encode(JSON.stringify(requestMessage))
        workerRef.current.postMessage(payloadBuffer, [payloadBuffer.buffer])
      } catch (err) {
        clearTimeout(timeoutId)
        activeRequestsRef.current.delete(id)
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    })
  }, [createWorker, terminateWorkerAndRejectAll])

  if (fatalError) throw fatalError
  return { runCipher, loading, error, progress }
}
