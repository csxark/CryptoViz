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
  /** Legacy error message (string) */
  error?: string

  /** Standardized error code for typed UI feedback */
  errorCode?: import('@/lib/utils/errors').CipherErrorCode
  /** Optional human readable error message */
  errorMessage?: string
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
