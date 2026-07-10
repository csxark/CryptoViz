import type { CipherResult } from '@/lib/cipher/types'

export type WorkerRequestType = 'encrypt' | 'decrypt'

export interface WorkerRequestPayload {
  cipherId: string
  input: string
  key: string
  options?: any
}

export interface WorkerRequest {
  type: WorkerRequestType
  requestId: string
  payload: WorkerRequestPayload
}

export interface WorkerResponsePayload {
  result?: CipherResult
  error?: string
}

export interface WorkerResponseTimings {
  durationMs: number
}

export interface WorkerResponse {
  requestId: string
  success: boolean
  payload: WorkerResponsePayload
  timings?: WorkerResponseTimings
}
