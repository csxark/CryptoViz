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

export type WorkerMessage =
  | WorkerExecuteMessage
  | WorkerCancelMessage
  | WorkerPingMessage

export type WorkerRequest = WorkerExecuteMessage

export interface WorkerProgressMessage {
  type: 'PROGRESS'
  jobId: string
  percent: number
  currentMilestone: string
}

export interface WorkerTraceStartMessage {
  type: 'TRACE_START'
  requestId: string
  jobId?: string
  totalSteps: number
}

export interface WorkerTraceBatchMessage {
  type: 'TRACE_BATCH'
  requestId: string
  jobId?: string
  offset: number
  stepsBuffer: ArrayBuffer
}

export interface WorkerTraceCompleteMessage {
  type: 'TRACE_COMPLETE'
  requestId: string
  jobId?: string
}

export interface WorkerTraceAckMessage {
  type: 'TRACE_ACK'
  requestId: string
}
export interface WorkerResponsePayload {
  result?: CipherResult
  /** Serialized trace for large results, transferred as an ArrayBuffer. */
  stepsBuffer?: ArrayBuffer
  error?: string
  errorCode?: import('@/lib/utils/errors').CipherErrorCode | 'INVALID_WORKER_MESSAGE'
  errorMessage?: string
  errorDetails?: unknown
  remediation?: string
}
export interface WorkerErrorMessage {
  type: 'ERROR'
  jobId?: string
  payload: {
    message: string
    error?: string
  }
}

export interface WorkerResponseSuccess {
  requestId: string
  jobId?: string
  success: true
  payload: {
    result?: CipherResult
    stepsBuffer?: ArrayBuffer
    error?: never
    errorCode?: never
    errorMessage?: never
    errorDetails?: never
    remediation?: never  }
  timings?: WorkerResponseTimings
}

export interface WorkerResponseFailure {
  requestId: string
  jobId?: string
  success: false
  payload: {
    result?: never
    error?: string
    errorCode?: import('@/lib/utils/errors').CipherErrorCode | 'INVALID_WORKER_MESSAGE'
    errorMessage?: string
    errorDetails?: unknown
    remediation?: string  }
  timings?: WorkerResponseTimings
}

export type WorkerResponse = WorkerResponseSuccess | WorkerResponseFailure

export type WorkerProtocolMessage =
  | WorkerMessage
  | WorkerProgressMessage
  | WorkerTraceStartMessage
  | WorkerTraceBatchMessage
  | WorkerTraceCompleteMessage
  | WorkerTraceAckMessage
  | WorkerErrorMessage
  | WorkerResponse
export interface WorkerResponseTimings {
  durationMs: number
}
