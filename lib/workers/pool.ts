import type { WorkerPriority } from '../../types/worker'

export { type WorkerPriority } from '../../types/worker'

export const WORKER_PRIORITY: Record<WorkerPriority, number> = {
  INTERACTIVE: 0,
  NORMAL: 1,
  BACKGROUND: 2,
}

export type ProgressPayload = {
  percent: number
  currentMilestone: string
  jobId?: string
}
export type ProgressCallback = (payload: ProgressPayload) => void
export type TaskCallback = (error: Error | null, result?: unknown) => void

export interface PoolTask {
  jobId: string
  message: unknown
  transfer?: Transferable[]
  callback: TaskCallback
  onProgress?: ProgressCallback
  priority: WorkerPriority
  signal?: AbortSignal
  sequence: number
}

export interface WorkerPoolExecuteOptions {
  priority?: WorkerPriority
  signal?: AbortSignal
  onProgress?: ProgressCallback
}

function abortError() {
  return new DOMException('The user aborted the request.', 'AbortError')
}

export class WorkerPool {
  private workers: Worker[] = []
  private idleWorkers: Worker[] = []
  private taskQueue: PoolTask[] = []
  private activeTasks = new Map<Worker, PoolTask>()
  private sequence = 0
  private interactiveWorker: Worker | null = null

  private fallbackMode = false;
  private fallbackWorker: Worker | null = null;

  constructor(
    private workerFactory: () => Worker,
    private poolSize: number = typeof navigator !== 'undefined'
      ? (navigator.hardwareConcurrency || 4)
      : 4,
    private fallbackExecutor?: (message: unknown, onProgress?: ProgressCallback) => Promise<unknown> | unknown
  ) {
    this.poolSize = Math.max(1, this.poolSize)
  }

  public execute(
    message: unknown,
    transfer?: Transferable[],
    onProgressOrOptions?: ProgressCallback | WorkerPoolExecuteOptions,
  ): Promise<unknown> {
    const options: WorkerPoolExecuteOptions =
      typeof onProgressOrOptions === 'function'
        ? { onProgress: onProgressOrOptions }
        : (onProgressOrOptions ?? {})

    const priority = options.priority ?? 'NORMAL'
    const jobId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `job-${Date.now()}-${++this.sequence}`

    return new Promise((resolve, reject) => {
      const task: PoolTask = {
        jobId,
        message,
        transfer,
        onProgress: options.onProgress,
        priority,
        signal: options.signal,
        sequence: this.sequence++,
        callback: (error, result) => {
          if (error) reject(error)
          else resolve(result)
        },
      }

      if (options.signal?.aborted) {
        reject(abortError())
        return
      }

      if (options.signal) {
        const onAbort = () => {
          const queuedIndex = this.taskQueue.indexOf(task)
          if (queuedIndex >= 0) {
            this.taskQueue.splice(queuedIndex, 1)
            reject(abortError())
          }
        }
        options.signal.addEventListener('abort', onAbort, { once: true })
      }

      if (priority === 'INTERACTIVE') {
        if (!this.interactiveWorker) {
          this.interactiveWorker = this.createWorker()
          this.runTask(this.interactiveWorker, task)
        } else if (!this.activeTasks.has(this.interactiveWorker)) {
          this.runTask(this.interactiveWorker, task)
        } else {
          this.enqueue(task)
        }
        return
      }

      const worker = this.idleWorkers.pop()
      if (worker) {
        this.runTask(worker, task)
      } else if (this.workers.length < this.poolSize) {
        this.runTask(this.createWorker(), task)
      } else {
        this.enqueue(task)
      }
    })
  }

  private enqueue(task: PoolTask) {
    this.taskQueue.push(task)
    this.taskQueue.sort(
      (a, b) =>
        WORKER_PRIORITY[a.priority] - WORKER_PRIORITY[b.priority] ||
        a.sequence - b.sequence,
    )
  }

  private createWorker(): Worker {
    if (this.fallbackMode && this.fallbackExecutor) {
      return this.createFallbackWorker();
    }

    try {
      if (this.fallbackMode) {
        throw new DOMException('Sandbox', 'SecurityError');
      }
      const worker = this.workerFactory()
      this.workers.push(worker)
      this.setupWorker(worker)
      return worker
    } catch (error: any) {
      if ((error?.name === 'SecurityError' || error?.message?.includes('sandbox')) && this.fallbackExecutor) {
        this.fallbackMode = true;
        return this.createFallbackWorker();
      }
      throw error;
    }
  }

  private createFallbackWorker(): Worker {
    
    // Create a pseudo-Worker that executes inline
    const worker = {
      postMessage: async (message: any) => {
        // Run asynchronously to simulate worker message passing
        setTimeout(async () => {
          try {
            const result = await this.fallbackExecutor!(message, (progressPayload) => {
              worker.onmessage?.({
                data: {
                  type: 'PROGRESS',
                  payload: progressPayload
                }
              } as MessageEvent);
            });
            worker.onmessage?.({
              data: {
                type: "DONE",
                payload: result
              }
            } as MessageEvent);
          } catch (err: any) {
            worker.onmessage?.({
              data: {
                type: "ERROR",
                payload: { message: err?.message || String(err) }
              }
            } as MessageEvent);
          }
        }, 0);
      },
      terminate: () => {},
      onmessage: null as any,
      onerror: null as any,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true
    } as unknown as Worker;
    
    this.fallbackWorker = worker;
    this.workers.push(worker);
    this.setupWorker(worker);
    return worker;
  }

  private setupWorker(worker: Worker) {
    worker.onmessage = (event: MessageEvent) => {
      const task = this.activeTasks.get(worker)
      if (!task) return
      const data = event.data ?? {}
      const type = String(data.type ?? '').toUpperCase()
      const payload = data.payload ?? data

      if (
        type === 'PROGRESS' ||
        type === 'PROGRESS_UPDATE' ||
        data.type === 'progress'
      ) {
        task.onProgress?.({
          percent: Math.max(
            0,
            Math.min(100, Number(payload.percent ?? 0)),
          ),
          currentMilestone: String(
            payload.currentMilestone ?? payload.message ?? '',
          ),
          jobId: String(payload.jobId ?? task.jobId),
        })
        return
      }

      if (type === 'DONE' || type === 'done') {
        task.callback(null, payload?.result ?? payload)
        this.finishTask(worker)
        return
      }

      if (type === 'ERROR' || type === 'error') {
        task.callback(
          new Error(
            payload?.message || payload?.error || 'Worker error',
          ),
        )
        this.finishTask(worker)
        return
      }

      if ('success' in data && ('requestId' in data || 'id' in data)) {
        if (data.success) {
          task.callback(
            null,
            data.payload?.result ?? data.result ?? data.payload,
          )
        } else {
          task.callback(
            new Error(
              data.payload?.error ??
                data.error ??
                'Worker error',
            ),
          )
        }
        this.finishTask(worker)
        return
      }

      task.callback(null, data)
      this.finishTask(worker)
    }

    worker.onerror = (event) => {
      const task = this.activeTasks.get(worker)
      if (task) task.callback(new Error(event.message || 'Worker error'))
      this.finishTask(worker)
    }
  }

  private runTask(worker: Worker, task: PoolTask) {
    this.activeTasks.set(worker, task)
    try {
      const message =
        task.message && typeof task.message === 'object'
          ? {
              ...(task.message as Record<string, unknown>),
              jobId: task.jobId,
              priority: task.priority,
            }
          : task.message
      if (task.transfer?.length) worker.postMessage(message, task.transfer)
      else worker.postMessage(message)
    } catch (error) {
      this.activeTasks.delete(worker)
      task.callback(
        error instanceof Error ? error : new Error(String(error)),
      )
      this.makeWorkerAvailable(worker)
    }
  }

  private finishTask(worker: Worker) {
    this.activeTasks.delete(worker)
    this.makeWorkerAvailable(worker)
  }

  private makeWorkerAvailable(worker: Worker) {
    if (worker === this.interactiveWorker) {
      const nextInteractive = this.taskQueue.find(
        (task) => task.priority === 'INTERACTIVE',
      )
      if (nextInteractive) {
        this.taskQueue.splice(this.taskQueue.indexOf(nextInteractive), 1)
        this.runTask(worker, nextInteractive)
      }
      return
    }

    const nextTask = this.taskQueue.shift()
    if (nextTask) {
      if (nextTask.signal?.aborted) {
        nextTask.callback(abortError())
        this.makeWorkerAvailable(worker)
      } else {
        this.runTask(worker, nextTask)
      }
    } else if (!this.idleWorkers.includes(worker)) {
      this.idleWorkers.push(worker)
    }
  }

  public cancelQueued(priority?: WorkerPriority) {
    const retained: PoolTask[] = []
    for (const task of this.taskQueue) {
      if (!priority || task.priority === priority) task.callback(abortError())
      else retained.push(task)
    }
    this.taskQueue = retained
  }

  public terminate() {
    for (const worker of this.workers) worker.terminate()
    this.workers = []
    this.idleWorkers = []
    this.taskQueue = []
    this.activeTasks.clear()
    this.interactiveWorker = null
  }
}
