import { WorkerPool } from './pool'

// Single shared pool instance for all cipher-worker consumers (AES, PBE KDF,
// etc.), so we don't spin up duplicate worker threads across features.
export const sharedCipherPool = new WorkerPool(
  () => new Worker(new URL('./cipher.worker.ts', import.meta.url))
)