/**
 * Registry-driven cipher worker with explicit job lifecycle management.
 * Cancellation is cooperative: jobs move to CANCELLING and are only released
 * after the running operation observes that state or the worker timeout wins.
 */
import { CipherError } from '../utils/errors'
import type { CipherErrorCode } from '../utils/errors'
import type { WorkerRequest} from '../../types/worker'
import type { WorkerExecuteMessage, WorkerMessage, WorkerResponse } from '../../types/worker'
import { validateWorkerMessage } from './cipher-worker-protocol'
import type { CipherResult } from '../cipher/types'
import { getDispatcher } from './cipherDispatchRegistry'
import { WorkerJobLifecycle } from './cipher-worker-lifecycle'

const workerScope = self as unknown as Worker & typeof globalThis
export const MAX_WORKER_JOB_MS = 30_000

const lifecycle = new WorkerJobLifecycle()
const lastProgressAt = new Map<string, number>()

interface CancelMessage {
  type: 'CANCEL'
  jobId: string
  requestId?: string
}

interface ParsedWorkerRequest extends WorkerRequest {
  jobId: string
}

function postProgress(jobId: string, percent: number, currentMilestone: string, force = false) {
  const now = performance.now()
  const last = lastProgressAt.get(jobId) ?? -Infinity
  if (!force && now - last < 50) return
  lastProgressAt.set(jobId, now)
  workerScope.postMessage({
    type: 'PROGRESS',
    jobId,
    percent: Math.max(0, Math.min(100, Math.round(percent))),
    currentMilestone,
  })
}

function postLifecycleError(requestId: string, jobId: string, code: CipherErrorCode, message: string) {
  workerScope.postMessage({
    requestId,
    success: false,
    payload: { error: message, errorCode: code },
    jobId,
  } satisfies WorkerResponse & { jobId: string })
}
workerScope.addEventListener('message', async (event: MessageEvent<unknown>) => {
  let rawData: unknown = event.data

function parseIncoming(data: unknown): WorkerRequest | CancelMessage | null {
  let value = data
  if (value instanceof Uint8Array) {
    try {
      value = JSON.parse(new TextDecoder().decode(value))
    } catch {
      return null
      rawData = JSON.parse(new TextDecoder().decode(rawData)) as unknown
    } catch {
      // Validation below returns a structured protocol error.
    }
  }
  if (!value || typeof value !== 'object') return null
  return value as WorkerRequest | CancelMessage
}

function isCancelMessage(value: unknown): value is CancelMessage {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return candidate.type === 'CANCEL'
}

workerScope.addEventListener('message', async (event: MessageEvent<WorkerRequest | Uint8Array | CancelMessage>) => {
  const rawData = parseIncoming(event.data)

  if (!rawData) {
    postLifecycleError('unknown', 'unknown', 'INVALID_WORKER_MESSAGE', 'Worker message could not be decoded.')
    return
  }

  if (isCancelMessage(rawData)) {
    const { jobId, requestId } = rawData
    if (typeof jobId !== 'string' || !jobId) {
      postLifecycleError(requestId ?? 'unknown', jobId ?? 'unknown', 'INVALID_CANCEL_MESSAGE', 'Cancellation requires a valid jobId.')
      return
    }

    const result = lifecycle.cancel(jobId)
    if (result === 'CANCELLING') {
      postProgress(jobId, 0, 'Cancellation requested', true)
    } else if (result === 'COMPLETED') {
      postLifecycleError(requestId ?? lifecycle.get(jobId)?.requestId ?? 'unknown', jobId, 'JOB_ALREADY_COMPLETED', 'The job has already completed and cannot be cancelled.')
    } else if (result === 'FAILED') {
      postLifecycleError(requestId ?? lifecycle.get(jobId)?.requestId ?? 'unknown', jobId, 'JOB_ALREADY_TERMINAL', 'The job has already failed and cannot be cancelled.')
    } else if (result === 'CANCELLED') {
      postLifecycleError(requestId ?? 'unknown', jobId, 'JOB_ALREADY_CANCELLED', 'The job has already been cancelled.')
    } else if (result === 'NOT_FOUND') {
      postLifecycleError(requestId ?? 'unknown', jobId, 'JOB_NOT_FOUND', 'The requested job does not exist or has expired.')
    }
    return
  }

  const requestData = rawData as ParsedWorkerRequest
  const requestId = requestData?.requestId
  const jobId = requestData?.jobId ?? requestId

  if (typeof requestId !== 'string' || !requestId || typeof jobId !== 'string' || !jobId) {
    postLifecycleError(requestId ?? 'unknown', jobId ?? 'unknown', 'INVALID_WORKER_MESSAGE', 'Worker requests require unique requestId and jobId values.')
    return
  }

  try {
    lifecycle.create(jobId, requestId)
  } catch (error) {
    postLifecycleError(requestId, jobId, 'DUPLICATE_JOB_ID', error instanceof Error ? error.message : 'Duplicate worker job ID.')
    return
  }

  lifecycle.start(jobId)
  const validation = validateWorkerMessage(rawData)
  if (!validation.success) {
    workerScope.postMessage({
      requestId: validation.requestId,
      success: false,
      payload: {
        error: validation.error,
        errorCode: 'INVALID_WORKER_MESSAGE',
        errorMessage: validation.error,
      },
    } satisfies WorkerResponse)
    return
  }

  const message: WorkerMessage = validation.value

  if (message.type === 'PING') {
    workerScope.postMessage({ type: 'PONG', requestId: message.requestId ?? 'unknown' })
    return
  }

  if (message.type === 'CANCEL') {
    cancelledJobs.add(message.jobId)
    return
  }

  const requestData: WorkerExecuteMessage = message
  const requestId = requestData.requestId
  const jobId = requestData.jobId ?? requestData.payload.jobId ?? requestId
  const startTime = performance.now()
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let terminal = false

  const failJob = (code: CipherErrorCode, message: string) => {
    if (terminal) return
    terminal = true
    lifecycle.fail(jobId)
    postLifecycleError(requestId, jobId, code, message)
  }

  const cancelJob = () => {
    if (terminal) return
    terminal = true
    lifecycle.cancelComplete(jobId)
    workerScope.postMessage({
      requestId,
      success: false,
      payload: { error: 'The user aborted the request.', errorCode: 'ABORTED' },
      jobId,
      timings: { durationMs: performance.now() - startTime },
    } satisfies WorkerResponse & { jobId: string })
  }

  try {
    timeoutId = setTimeout(() => {
      lifecycle.cancel(jobId)
      failJob('WORKER_TIMEOUT', `Worker job exceeded the ${MAX_WORKER_JOB_MS / 1000}-second execution limit.`)
    }, MAX_WORKER_JOB_MS)

    if (lifecycle.isCancelling(jobId)) {
      cancelJob()
      return
    }

    const { type, payload } = requestData
    if (type !== 'encrypt' && type !== 'decrypt' || !payload || typeof payload !== 'object') {
      failJob('INVALID_WORKER_MESSAGE', 'Worker request type and payload are invalid.')
      return
    }

    const { cipherId, input, key, options } = payload
    if (typeof cipherId !== 'string' || !cipherId || typeof input !== 'string' || typeof key !== 'string') {
      failJob('INVALID_WORKER_MESSAGE', 'Worker payload contains invalid cipherId, input, or key.')
      return
    }
    if (cancelledJobs.has(jobId)) throw new DOMException('The user aborted the request.', 'AbortError')

    const { payload } = requestData
    const { type, cipherId, input, key, options } = payload
    const safeOptions = options || {}

    postProgress(jobId, 0, 'Starting cipher', true)

    postProgress(jobId, 0, 'Starting cipher', true)
    const dispatcher = await getDispatcher(cipherId)
    postProgress(jobId, 10, 'Loading cipher implementation', true)

    if (lifecycle.isCancelling(jobId)) {
      cancelJob()
      return
    }

    const handler = type === 'encrypt' ? dispatcher.encrypt : dispatcher.decrypt
    postProgress(jobId, 20, 'Executing cryptographic operation', true)
    const result = (await handler(input, key, options || {})) as CipherResult

    if (lifecycle.isCancelling(jobId)) {
      cancelJob()
      return
    }
    if (cancelledJobs.has(jobId)) throw new DOMException('The user aborted the request.', 'AbortError')

    const handler = type === 'encrypt' ? dispatcher.encrypt : dispatcher.decrypt
    postProgress(jobId, 20, 'Executing cryptographic operation', true)

    const result = (await handler(input, key, safeOptions)) as CipherResult

    const steps = result.steps ?? []
    if (steps.length) {
      const total = steps.length
      for (let index = 0; index < total; index++) {
        if (lifecycle.isCancelling(jobId)) {
          cancelJob()
          return
        }
        const step = steps[index]
        postProgress(jobId, 20 + ((index + 1) / total) * 70, step.label || `Trace step ${index + 1}`)
      }
    } else {
      postProgress(jobId, 90, 'Finalizing result', true)
    }

    if (lifecycle.isCancelling(jobId)) {
      cancelJob()
      return
    }

    terminal = true
    lifecycle.complete(jobId)
    postProgress(jobId, 100, 'Complete', true)
    const response: WorkerResponse & { jobId: string } = {
      requestId,
      success: true,
      payload: { result },
      timings: { durationMs: performance.now() - startTime },
      jobId,
    }
    workerScope.postMessage(response)
  } catch (error: unknown) {
    if (lifecycle.isCancelling(jobId)) {
      cancelJob()
      return
    }
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorCode = error instanceof CipherError ? error.code : 'WORKER_EXECUTION_FAILED'
    failJob(errorCode, errorMessage)
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
    const errorCode = error instanceof CipherError ? error.code : undefined

    workerScope.postMessage({
      requestId,
      success: false,
      payload: { error: errorMessage, errorCode },
      timings: { durationMs: performance.now() - startTime },
    } satisfies WorkerResponse)
  } finally {
    cancelledJobs.delete(jobId)
    lastProgressAt.delete(jobId)
  }
})
