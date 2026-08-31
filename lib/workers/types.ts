export interface WorkerTask {
  id: string;
  type: 'MEET_IN_THE_MIDDLE' | 'BRUTE_FORCE';
  payload: unknown;
}

export interface WorkerResponse {
  taskId: string;
  status: 'PROGRESS' | 'SUCCESS' | 'ERROR';
  progress?: number;
  result?: unknown;
  error?: string;
}

export interface CryptoTaskEvent {
  action: 'START' | 'STOP' | 'PAUSE';
  task: WorkerTask;
}
