/**
 * Registry-driven cipher worker with priority metadata and throttled progress streaming.
 * The cipher implementations remain unchanged; this file adds protocol-level scheduling
 * and progress reporting around their execution.
 */
import { CipherError } from '../utils/errors'
import type { WorkerRequest, WorkerResponse } from '../../types/worker'
import type { CipherResult } from '../cipher/types'
import { getDispatcher } from './cipherDispatchRegistry'

const workerScope = self as unknown as Worker & typeof globalThis
const cancelledJobs = new Set<string>()
const lastProgressAt = new Map<string, number>()

// Interface representing incoming messages that could be a cancel action
interface CancelMessage {
  type?: string;
  jobId?: string;
  requestId?: string;
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

workerScope.addEventListener('message', async (event: MessageEvent<WorkerRequest | Uint8Array | CancelMessage>) => {
  let rawData = event.data

  if (rawData instanceof Uint8Array) {
    try {
      rawData = JSON.parse(new TextDecoder().decode(rawData)) as WorkerRequest | CancelMessage
    } catch {
      // Fallback if decoding fails
    }
  }

  // Handle cancellation requests
  const cancelCandidate = rawData as CancelMessage
  if (cancelCandidate?.type === 'CANCEL') {
    const id = cancelCandidate.jobId ?? cancelCandidate.requestId
    if (id) cancelledJobs.add(id)
    return
  }

  const requestData = rawData as WorkerRequest
  const requestId = requestData?.requestId ?? 'unknown'
  const jobId = requestData?.jobId ?? requestId
  const startTime = performance.now()

  try {
    if (cancelledJobs.has(jobId)) throw new DOMException('The user aborted the request.', 'AbortError')
    
    const { type, payload } = requestData
    const { cipherId, input, key, options } = payload
    const safeOptions = options || {}
    
    postProgress(jobId, 0, 'Starting cipher', true)

    const dispatcher = await getDispatcher(cipherId)
    postProgress(jobId, 10, 'Loading cipher implementation', true)
    
    if (cancelledJobs.has(jobId)) throw new DOMException('The user aborted the request.', 'AbortError')

    const handler = type === 'encrypt' ? dispatcher.encrypt : dispatcher.decrypt
    postProgress(jobId, 20, 'Executing cryptographic operation', true)
    
    const result = (await handler(input, key, safeOptions)) as CipherResult

    // Trace-aware progress gives the UI useful milestones without flooding postMessage.
    const steps = result.steps ?? []
    if (steps.length) {
      const total = steps.length
      for (let index = 0; index < total; index++) {
        if (cancelledJobs.has(jobId)) throw new DOMException('The user aborted the request.', 'AbortError')
        const step = steps[index]
        postProgress(jobId, 20 + ((index + 1) / total) * 70, step.label || `Trace step ${index + 1}`)
      }
    } else {
      postProgress(jobId, 90, 'Finalizing result', true)
    }
    postProgress(jobId, 100, 'Complete', true)

    const response: WorkerResponse = {
      requestId,
      success: true,
      payload: { result },
      timings: { durationMs: performance.now() - startTime },
    }
    workerScope.postMessage(response)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorCode = error instanceof CipherError ? error.code : undefined
    
    workerScope.postMessage({
      requestId,
      success: false,
      payload: { error: errorMessage, errorCode },
      timings: { durationMs: performance.now() - startTime },
    } satisfies WorkerResponse)
  } finally {
    if (jobId) {
      cancelledJobs.delete(jobId)
      lastProgressAt.delete(jobId)
    }
  }
})
