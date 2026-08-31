
import type { CryptoWorkerRequest, CryptoWorkerResponse } from './crypto.worker'
import type { WorkerPriority } from './pool'
import { generateRsaWizard, type RsaWizardInput } from '../asymmetric/rsaKeyGenerationWizard'
import { encrypt, type AesMode } from '../cipher/symmetric/aes'
export interface CryptoWorkerProgress {
  percent: number
  currentMilestone: string
  jobId: string
}
export interface CryptoWorkerRunOptions {
  priority?: WorkerPriority
  signal?: AbortSignal
  onProgress?: (percent: number, message: string) => void
}

type Resolvers = {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
  onProgress?: (percent: number, message: string) => void
  signal?: AbortSignal
  onAbort?: () => void
}

class CryptoWorkerClient {
  private worker: Worker | null = null
  private pendingRequests = new Map<string, Resolvers>()

  private isWorkerSupported(): boolean {
    return typeof window !== 'undefined' && typeof Worker !== 'undefined'
  }

  private runSync(
    operation: Extract<CryptoWorkerRequest, { operation: string }>['operation'],
    payload: unknown,
  ): unknown {
    if (operation === 'rsaWizard') {
      return generateRsaWizard(payload as RsaWizardInput)
    }
    if (operation === 'batchModesLab') {
      const { text, flipped, key, iv, modes } = payload as {
        text: string
        flipped: string
        key: string
        iv: string
        modes: AesMode[]
      }
      const ciphertextHex = (mode: AesMode, data: string) => {
        const options = mode === 'ECB' ? { mode } : { mode, iv }
        const out = encrypt(data, key, options).output
        return mode === 'ECB' ? out : out.slice(32)
      }
      const hexToBytes = (hex: string) => {
        const pairs: string[] = []
        for (let i = 0; i < hex.length; i += 2) pairs.push(hex.slice(i, i + 2))
        return pairs
      }
      return modes.map((mode) => {
        const original = hexToBytes(ciphertextHex(mode, text))
        const changed = hexToBytes(ciphertextHex(mode, flipped))
        const diff = original.map((b: string, i: number) => b !== changed[i])
        const changedCount = diff.filter(Boolean).length
        return { modeId: mode, changed, diff, changedCount, total: changed.length }
      })
    }
    throw new Error(`Unknown operation: ${operation}`)
  }

  private initWorker() {
    if (!this.worker && this.isWorkerSupported()) {
      this.worker = new Worker(new URL('./crypto.worker.ts', import.meta.url), { type: 'module' })
      this.worker.onmessage = (event: MessageEvent<CryptoWorkerResponse | CryptoWorkerProgress>) => {
        const data = event.data
        if ('jobId' in data && 'percent' in data && 'currentMilestone' in data) {
          const request = this.pendingRequests.get(data.jobId)
          request?.onProgress?.(
            Math.max(0, Math.min(100, Number(data.percent))),
            String(data.currentMilestone ?? ''),
          )
          return
        }
        if ('id' in data) {
          const id = data.id
          const resolvers = this.pendingRequests.get(id)
          if (!resolvers) return
          this.pendingRequests.delete(id)
          if (resolvers.signal && resolvers.onAbort) {
            resolvers.signal.removeEventListener('abort', resolvers.onAbort)
          }
          if (data.success) resolvers.resolve(data.result)
          else resolvers.reject(new Error(data.error))
        }
      }
    }
  }

  public async runCryptoOperation<T>(
    operation: Extract<CryptoWorkerRequest, { operation: string }>['operation'],
    payload: unknown,
    options?: CryptoWorkerRunOptions,
  ): Promise<T> {
    this.initWorker()
    return new Promise<T>((resolve, reject) => {
      const id = crypto.randomUUID()
      const priority = options?.priority ?? 'NORMAL'
      const onAbort = () => {
        this.worker?.postMessage({ type: 'CANCEL', jobId: id })
        this.pendingRequests.delete(id)
        reject(new DOMException('The user aborted the request.', 'AbortError'))
      }
      this.pendingRequests.set(id, {
        resolve: (value) => resolve(value as T), reject, onProgress: options?.onProgress,
        signal: options?.signal, onAbort,
      })
      if (options?.signal?.aborted) {
        onAbort()
        return
      }
      options?.signal?.addEventListener('abort', onAbort, { once: true })
      if (this.worker) {
        this.worker.postMessage({ id, operation, payload, jobId: id, priority })
      } else {
        options?.signal?.removeEventListener('abort', onAbort)
        this.pendingRequests.delete(id)
        try {
          resolve(this.runSync(operation, payload) as T)
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Crypto operation failed'))
        }
      }    })
  }

  public terminate() {
    this.worker?.terminate()
    this.worker = null
    for (const { reject, signal, onAbort } of this.pendingRequests.values()) {
      if (signal && onAbort) signal.removeEventListener('abort', onAbort)
      reject(new Error('Worker terminated'))
    }
    this.pendingRequests.clear()
  }
}
export const cryptoWorkerClient = new CryptoWorkerClient()
