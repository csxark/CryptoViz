/**
 * Custom Hook for executing ciphers in a Web Worker.
 * SSR-safe and handles parallel requests using unique message IDs.
 * @see CLAUDE.md
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { CipherResult } from '../cipher/types'
import type { WorkerRequest, WorkerResponse } from '../../types/worker'

const MAX_CACHE_SIZE = 200
const resultCache = new Map<string, CipherResult>()

export function clearCipherWorkerCache() {
  resultCache.clear()
}

function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys)
  }
  const sortedKeys = Object.keys(obj).sort()
  const result: any = {}
  for (const k of sortedKeys) {
    result[k] = sortObjectKeys(obj[k])
  }
  return result
}

function getCacheKey(
  action: 'encrypt' | 'decrypt',
  cipherId: string,
  input: string,
  key: string,
  options?: any
): string {
  const { signal: _, bypassCache: __, ...cacheableOptions } = options || {}
  return JSON.stringify({
    action,
    cipherId,
    input,
    key,
    options: sortObjectKeys(cacheableOptions),
  })
}

function cacheResult(key: string, result: CipherResult) {
  if (resultCache.has(key)) {
    resultCache.delete(key)
  } else if (resultCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = resultCache.keys().next().value
    if (oldestKey !== undefined) {
      resultCache.delete(oldestKey)
    }
  }
  resultCache.set(key, result)
}

export function useCipherWorker() {
  const workerRef = useRef<Worker | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fatalError, setFatalError] = useState<Error | null>(null)

  if (fatalError) {
    throw fatalError
  }

  // Map to track active requests, resolve/reject callbacks, abort signals, and timeouts
  const activeRequestsRef = useRef<
    Map<
      string,
      {
        resolve: (value: CipherResult) => void
        reject: (reason: any) => void
        signal?: AbortSignal
        onAbort?: () => void
        timeoutId?: NodeJS.Timeout
        cacheKey?: string
      }
    >
  >(new Map())

  // Helper to terminate the worker and reject all pending requests
  const terminateWorkerAndRejectAll = useCallback((reason: Error) => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    for (const [, req] of activeRequestsRef.current.entries()) {
      try {
        if (req.timeoutId) clearTimeout(req.timeoutId)
        if (req.signal && req.onAbort) {
          req.signal.removeEventListener('abort', req.onAbort)
        }
        req.reject(reason)
      } catch {
        // Ignore secondary errors during teardown
      }
    }
    activeRequestsRef.current.clear()
    setLoading(false)
  }, [])

  // Helper to create and initialize the web worker
  const createWorker = useCallback(() => {
    if (typeof window === 'undefined') return null

    const worker = new Worker(
      new URL('../workers/cipher.worker.ts', import.meta.url)
    )

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { requestId, success, payload } = event.data

      const request = activeRequestsRef.current.get(requestId)

      if (request) {
        if (request.timeoutId) {
          clearTimeout(request.timeoutId)
        }
        if (request.signal && request.onAbort) {
          request.signal.removeEventListener('abort', request.onAbort)
        }

        if (success && payload.result) {
          if (request.cacheKey) {
            cacheResult(request.cacheKey, payload.result)
          }
          request.resolve(payload.result)
        } else {
          request.reject(new Error(payload.error || 'Unknown worker error'))
        }
        activeRequestsRef.current.delete(requestId)
      }

      if (activeRequestsRef.current.size === 0) {
        setLoading(false)
      }
    }

    worker.onerror = (err) => {
      console.error('Worker error:', err)
      const errorMsg = 'Web Worker initialization or runtime error.'
      const errObj = new Error(errorMsg)
      setError(errorMsg)
      setFatalError(errObj)
      terminateWorkerAndRejectAll(errObj)
    }

    return worker
  }, [terminateWorkerAndRejectAll])

  useEffect(() => {
    workerRef.current = createWorker()

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [createWorker])

  const runCipher = useCallback(
    (
      action: 'encrypt' | 'decrypt',
      cipherId: string,
      input: string,
      key: string,
      options?: any
    ): Promise<CipherResult> => {
      const cacheKey = getCacheKey(action, cipherId, input, key, options)
      if (!options?.bypassCache && resultCache.has(cacheKey)) {
        return Promise.resolve(resultCache.get(cacheKey)!)
      }

      return new Promise<CipherResult>((resolve, reject) => {
        // Automatically cancel any previous running request to prevent overlap
        if (activeRequestsRef.current.size > 0) {
          terminateWorkerAndRejectAll(new DOMException('The user aborted a request.', 'AbortError'))
        }

        if (!workerRef.current) {
          workerRef.current = createWorker()
          if (!workerRef.current) {
            return reject(new Error('Web Worker is not available on SSR.'))
          }
        }

        const id = Math.random().toString(36).substring(2, 11)
        
        let onAbort: (() => void) | undefined
        const signal = options?.signal as AbortSignal | undefined

        if (signal) {
          if (signal.aborted) {
            return reject(new DOMException('The user aborted a request.', 'AbortError'))
          }

          onAbort = () => {
            terminateWorkerAndRejectAll(new DOMException('The user aborted a request.', 'AbortError'))
          }
          signal.addEventListener('abort', onAbort)
        }

        // 10-second timeout budget
        const timeoutId = setTimeout(() => {
          setError('WORKER_TIMEOUT')
          terminateWorkerAndRejectAll(new Error('WORKER_TIMEOUT'))
        }, 10000)

        activeRequestsRef.current.set(id, {
          resolve,
          reject,
          signal,
          onAbort,
          timeoutId,
          cacheKey,
        })

        setLoading(true)
        setError(null)

        try {
          // Strip AbortSignal from options since it's not JSON serializable
          const { signal: _, ...serializableOptions } = options || {}
          const requestMessage: WorkerRequest = {
            type: action,
            requestId: id,
            payload: {
              cipherId,
              input,
              key,
              options: serializableOptions,
            },
          }
          const payloadStr = JSON.stringify(requestMessage)
          const encoder = new TextEncoder()
          const payloadBuffer = encoder.encode(payloadStr)

          workerRef.current.postMessage(payloadBuffer, [payloadBuffer.buffer])
        } catch (err: unknown) {
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
          if (signal && onAbort) {
            signal.removeEventListener('abort', onAbort)
          }
          activeRequestsRef.current.delete(id)
          if (activeRequestsRef.current.size === 0) setLoading(false)
          const message = err instanceof Error ? err.message : String(err)
          setError(message)
          reject(new Error(message))
        }
      })
    },
    [createWorker, terminateWorkerAndRejectAll]
  )

  return {
    runCipher,
    loading,
    error,
  }
}
