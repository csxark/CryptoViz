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
  options?: Record<string, unknown>
}

interface WorkerResponse {
  id: string
  success: boolean
  result?: CipherResult
  error?: string
}

export function useCipherWorker() {
  const workerRef = useRef<Worker | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Map to track active requests and resolve/reject promises
  const activeRequestsRef = useRef<
    Map<
      string,
      {
        resolve: (value: CipherResult) => void
        reject: (reason: unknown) => void
      }
    >
  >(new Map())

  useEffect(() => {
    // Web Worker is client-side only
    if (typeof window === 'undefined') return

    // Instantiate worker
    const worker = new Worker(
      new URL('../workers/cipher.worker.ts', import.meta.url)
    )

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, success, result, error: workerError } = event.data
      const request = activeRequestsRef.current.get(id)

      if (request) {
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
      setError('Web Worker initialization or runtime error.')
      setLoading(false)
    }

    workerRef.current = worker

    return () => {
      worker.terminate()
    }
  }, [])

  const runCipher = useCallback(
    (
      action: 'encrypt' | 'decrypt',
      cipherId: string,
      input: string,
      key: string,
      options?: Record<string, unknown>
    ): Promise<CipherResult> => {
      return new Promise<CipherResult>((resolve, reject) => {
        if (!workerRef.current) {
          // Re-instantiate if terminated or not initialized yet
          if (typeof window !== 'undefined') {
            const worker = new Worker(
              new URL('../workers/cipher.worker.ts', import.meta.url)
            )
            worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
              const { id, success, result, error: workerError } = event.data
              const req = activeRequestsRef.current.get(id)
              if (req) {
                if (success && result) req.resolve(result)
                else req.reject(new Error(workerError || 'Unknown worker error'))
                activeRequestsRef.current.delete(id)
              }
              if (activeRequestsRef.current.size === 0) setLoading(false)
            }
            worker.onerror = (err) => {
              console.error('Worker error:', err)
              setError('Web Worker initialization or runtime error.')
              setLoading(false)
            }
            workerRef.current = worker
          } else {
            return reject(new Error('Web Worker is not available on SSR.'))
          }
        }

        const id = Math.random().toString(36).substring(2, 11)
        activeRequestsRef.current.set(id, { resolve, reject })

        setLoading(true)
        setError(null)

        workerRef.current.postMessage({
          id,
          action,
          cipherId,
          input,
          key,
          options,
        } as WorkerRequest)
      })
    },
    []
  )

  return {
    runCipher,
    loading,
    error,
  }
}
