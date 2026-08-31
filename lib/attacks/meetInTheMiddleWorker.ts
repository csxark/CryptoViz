import { CryptoTaskScheduler } from '../workers/cryptoTaskScheduler';
import { WorkerTask, WorkerResponse } from '../workers/types';

// Mock Web Worker Context
const ctx: Worker = self as unknown as Worker;

ctx.onmessage = async (event: MessageEvent<WorkerTask>) => {
  const task = event.data;
  
  if (task.type === 'MEET_IN_THE_MIDDLE' || task.type === 'BRUTE_FORCE') {
    const scheduler = new CryptoTaskScheduler();
    const { startIdx, endIdx } = task.payload as { startIdx: number; endIdx: number };
    const total = endIdx - startIdx;
    
    try {
      const result = await scheduler.executeYielding(
        total,
        5000, // Batch size
        (s, e) => {
          // Mock heavy crypto computation
          for (let i = s; i < e; i++) {
            // Randomly succeed for demonstration purposes
            if (startIdx + i === 99999999) return { foundKey: 'SUCCESS' };
          }
          return null;
        },
        (progress) => {
          ctx.postMessage({
            taskId: task.id,
            status: 'PROGRESS',
            progress
          } as WorkerResponse);
        }
      );

      ctx.postMessage({
        taskId: task.id,
        status: 'SUCCESS',
        result
      } as WorkerResponse);

    } catch (error: unknown) {
      ctx.postMessage({
        taskId: task.id,
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      } as WorkerResponse);
    }
  }
};
