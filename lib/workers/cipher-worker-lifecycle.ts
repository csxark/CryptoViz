export const WORKER_JOB_STATES = [
  'CREATED',
  'RUNNING',
  'CANCELLING',
  'CANCELLED',
  'COMPLETED',
  'FAILED',
] as const

export type WorkerJobState = (typeof WORKER_JOB_STATES)[number]

export interface WorkerJobRecord {
  jobId: string
  requestId: string
  state: WorkerJobState
  createdAt: number
  startedAt?: number
  terminalAt?: number
}

export type CancelResult = 'CANCELLING' | 'CANCELLED' | 'COMPLETED' | 'FAILED' | 'NOT_FOUND'

const TERMINAL_STATES = new Set<WorkerJobState>(['CANCELLED', 'COMPLETED', 'FAILED'])
const MAX_TERMINAL_IDS = 2048

/**
 * Tracks active worker jobs and a bounded terminal-id history. Active state is
 * removed as soon as a job reaches a terminal state, while terminal IDs remain
 * reserved briefly so a stale/replayed request cannot reuse an identifier.
 */
export class WorkerJobLifecycle {
  private readonly jobs = new Map<string, WorkerJobRecord>()
  private readonly terminalIds = new Map<string, WorkerJobState>()

  create(jobId: string, requestId: string, now = Date.now()): WorkerJobRecord {
    if (!jobId || !requestId) throw new Error('Worker jobId and requestId are required.')
    if (this.jobs.has(jobId) || this.terminalIds.has(jobId)) {
      throw new Error(`Duplicate worker job ID: ${jobId}`)
    }

    const record: WorkerJobRecord = {
      jobId,
      requestId,
      state: 'CREATED',
      createdAt: now,
    }
    this.jobs.set(jobId, record)
    return { ...record }
  }

  start(jobId: string, now = Date.now()): WorkerJobRecord | undefined {
    const record = this.jobs.get(jobId)
    if (!record || record.state !== 'CREATED') return undefined
    record.state = 'RUNNING'
    record.startedAt = now
    return { ...record }
  }

  cancel(jobId: string, now = Date.now()): CancelResult {
    const record = this.jobs.get(jobId)
    if (!record) {
      const terminal = this.terminalIds.get(jobId)
      if (terminal === 'CANCELLED' || terminal === 'COMPLETED' || terminal === 'FAILED') return terminal
      return 'NOT_FOUND'
    }

    if (record.state === 'CREATED' || record.state === 'RUNNING') {
      record.state = 'CANCELLING'
      return 'CANCELLING'
    }
    if (record.state === 'CANCELLING') return 'CANCELLING'
    if (record.state === 'CANCELLED') return 'CANCELLED'
    if (record.state === 'COMPLETED') return 'COMPLETED'
    return 'FAILED'
  }

  complete(jobId: string, now = Date.now()): WorkerJobRecord | undefined {
    const record = this.jobs.get(jobId)
    if (!record || record.state === 'CANCELLING') return undefined
    return this.finish(jobId, 'COMPLETED', now)
  }

  fail(jobId: string, now = Date.now()): WorkerJobRecord | undefined {
    return this.finish(jobId, 'FAILED', now)
  }

  cancelComplete(jobId: string, now = Date.now()): WorkerJobRecord | undefined {
    const record = this.jobs.get(jobId)
    if (!record) return undefined
    if (record.state !== 'CANCELLING') return undefined
    return this.finish(jobId, 'CANCELLED', now)
  }

  get(jobId: string): WorkerJobRecord | undefined {
    const record = this.jobs.get(jobId)
    return record ? { ...record } : undefined
  }

  hasActive(jobId: string): boolean {
    return this.jobs.has(jobId)
  }

  isCancelling(jobId: string): boolean {
    return this.jobs.get(jobId)?.state === 'CANCELLING'
  }

  size(): number {
    return this.jobs.size
  }

  clear(): void {
    this.jobs.clear()
    this.terminalIds.clear()
  }

  private finish(jobId: string, state: WorkerJobState, now: number): WorkerJobRecord | undefined {
    if (!TERMINAL_STATES.has(state)) return undefined
    const record = this.jobs.get(jobId)
    if (!record) return undefined
    record.state = state
    record.terminalAt = now
    this.jobs.delete(jobId)
    this.terminalIds.set(jobId, state)
    while (this.terminalIds.size > MAX_TERMINAL_IDS) {
      const oldest = this.terminalIds.keys().next().value
      if (oldest === undefined) break
      this.terminalIds.delete(oldest)
    }
    return { ...record }
  }
}
