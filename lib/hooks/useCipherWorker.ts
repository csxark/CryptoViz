/**
 * Custom Hook for executing ciphers in a Web Worker.
 * SSR-safe and handles parallel requests using unique message IDs.
 * @see CLAUDE.md
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { CipherResult } from '../cipher/types'

interface WorkerRequest {
  id: string
  action: 'encrypt' | 'decrypt'
  cipherId: string
  input: string
  key: string
  options?: any
}

interface WorkerResponse {
  id: string
  success: boolean
  result?: CipherResult
  error?: string
}

type WorkerResponseMessage = WorkerResponse | Uint8Array;

export function useCipherWorker() {
  const workerRef = useRef<Worker | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const { id, success, result, error: workerError } = event.data

      const request = activeRequestsRef.current.get(id)

      if (request) {
        if (request.timeoutId) {
          clearTimeout(request.timeoutId)
        }
        if (request.signal && request.onAbort) {
          request.signal.removeEventListener('abort', request.onAbort)
        }

        if (success && result) {
          request.resolve(result)
        } else {
          request.reject(new Error(workerError || 'Unknown worker error'))
        }
        activeRequestsRef.current.delete(id)
      }

      if (activeRequestsRef.current.size === 0) {
        setLoading(false)
      }
    }

    worker.onerror = (err) => {
      console.error('Worker error:', err)
      const errorMsg = 'Web Worker initialization or runtime error.'
      setError(errorMsg)
      terminateWorkerAndRejectAll(new Error(errorMsg))
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
        })

        setLoading(true)
        setError(null)

        try {
          // Strip AbortSignal from options since it's not JSON serializable
          const { signal: _, ...serializableOptions } = options || {}
          const payloadStr = JSON.stringify({
            id,
            action,
            cipherId,
            input,
            key,
            options: serializableOptions,
          })
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
