
import type { CipherResult, CipherOptions } from '@/lib/cipher/types'
import type { WorkerRequest, WorkerResponse } from '@/types/worker'

export interface PipelineWorkerRequest {
  cipherId: string
  input: string
  key: string
  type: 'encrypt' | 'decrypt'
  options?: CipherOptions
  signal?: AbortSignal
}
export async function runCipherInWorker(request: PipelineWorkerRequest): Promise<CipherResult> {
  if (typeof window === 'undefined') throw new Error('Pipeline execution requires a browser worker.')
  const worker = new Worker(new URL('../workers/cipher.worker.ts', import.meta.url), { type:'module' })
  const requestId = crypto.randomUUID()
  return new Promise((resolve, reject) => {
    let settled = false
    const cleanup = () => {
      request.signal?.removeEventListener('abort', onAbort)
      worker.terminate()
    }
    const fail = (error: unknown) => {
      if (settled) return
      settled = true; cleanup(); reject(error instanceof Error ? error : new Error(String(error)))
    }
    const onAbort = () => fail(new DOMException('Pipeline execution cancelled', 'AbortError'))
    if (request.signal?.aborted) return onAbort()
    request.signal?.addEventListener('abort', onAbort, { once:true })
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data
      if (response.requestId !== requestId) return
      if (!response.success) return fail(new Error(response.payload.errorMessage || response.payload.error || 'Cipher worker failed'))
      settled = true; cleanup()
      resolve(response.payload.result as CipherResult)
    }
    worker.onerror = (event) => fail(new Error(event.message || 'Cipher worker failed'))
    const payload: WorkerRequest = {
      type: 'EXECUTE',
      requestId,
      payload: { type: request.type, cipherId: request.cipherId, input: request.input, key: request.key, options: request.options }
    }
    worker.postMessage(payload)
  })
}
