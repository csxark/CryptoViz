import type { CipherResult, CipherOptions } from '@/lib/cipher/types'

export type WorkerRequestType = 'encrypt' | 'decrypt'
export type WorkerPriority = 'INTERACTIVE' | 'NORMAL' | 'BACKGROUND'

export interface WorkerRequestPayload {
  type: WorkerRequestType
  cipherId: string
  input: string
  key: string
  options?: CipherOptions
  priority?: WorkerPriority
  jobId?: string
}

export interface WorkerExecuteMessage {
  type: 'EXECUTE'
  requestId: string
  payload: WorkerRequestPayload
  jobId?: string
  priority?: WorkerPriority
}

export interface WorkerCancelMessage {
  type: 'CANCEL'
  jobId: string
  requestId?: string
}

export interface WorkerPingMessage {
  type: 'PING'
  requestId?: string
}

export type WorkerMessage = WorkerExecuteMessage | WorkerCancelMessage | WorkerPingMessage
export type WorkerRequest = WorkerExecuteMessage

export interface WorkerProgressMessage {
  type: 'PROGRESS'
  jobId: string
  percent: number
  currentMilestone: string
}

export interface WorkerResponsePayload {
  result?: CipherResult
  error?: string
  errorCode?: import('@/lib/utils/errors').CipherErrorCode | 'INVALID_WORKER_MESSAGE'
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
