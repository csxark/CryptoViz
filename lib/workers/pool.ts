export type TaskCallback = (error: Error | null, result?: any) => void;
export type ProgressCallback = (payload: any) => void;

export interface PoolTask {
  message: any;
  transfer?: Transferable[];
  callback: TaskCallback;
  onProgress?: ProgressCallback;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private idleWorkers: Worker[] = [];
  private taskQueue: PoolTask[] = [];
  private activeTasks = new Map<Worker, PoolTask>();

  constructor(
    private workerFactory: () => Worker,
    private poolSize: number = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4
  ) {}

  public execute(message: any, transfer?: Transferable[], onProgress?: ProgressCallback): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: PoolTask = {
        message,
        transfer,
        onProgress,
        callback: (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      };

      if (this.idleWorkers.length > 0) {
        const worker = this.idleWorkers.pop()!;
        this.runTask(worker, task);
      } else if (this.workers.length < this.poolSize) {
        const worker = this.workerFactory();
        this.setupWorker(worker);
        this.workers.push(worker);
        this.runTask(worker, task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  private setupWorker(worker: Worker) {
    worker.onmessage = (e) => {
      const task = this.activeTasks.get(worker);
      if (task) {
        const { type, payload } = e.data;
        if (type === 'progress' && task.onProgress) {
          task.onProgress(payload);
        } else if (type === 'done') {
          task.callback(null, payload);
          this.activeTasks.delete(worker);
          this.makeWorkerIdle(worker);
        } else if (type === 'error') {
          task.callback(new Error(payload?.message || 'Worker error'));
          this.activeTasks.delete(worker);
          this.makeWorkerIdle(worker);
        } else if (type === undefined) {
          // Fallback for simple workers that don't send type/payload
          task.callback(null, e.data);
          this.activeTasks.delete(worker);
          this.makeWorkerIdle(worker);
        }
      }
    };

    worker.onerror = (e) => {
      const task = this.activeTasks.get(worker);
      if (task) {
        task.callback(new Error(e.message || 'Worker error'));
        this.activeTasks.delete(worker);
        this.makeWorkerIdle(worker);
      }
    };
  }

  private runTask(worker: Worker, task: PoolTask) {
    this.activeTasks.set(worker, task);
    if (task.transfer && task.transfer.length > 0) {
      worker.postMessage(task.message, task.transfer);
    } else {
      worker.postMessage(task.message);
    }
  }

  private makeWorkerIdle(worker: Worker) {
    if (this.taskQueue.length > 0) {
      const nextTask = this.taskQueue.shift()!;
      this.runTask(worker, nextTask);
    } else {
      this.idleWorkers.push(worker);
    }
  }

  public terminate() {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.idleWorkers = [];
    this.taskQueue = [];
    this.activeTasks.clear();
  }
}
