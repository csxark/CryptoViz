import { WorkerPool } from './pool'
import { getDispatcher } from './cipherDispatchRegistry'

export const sharedCipherPool = new WorkerPool(
  () => new Worker(new URL('./cipher.worker.ts', import.meta.url)),
  typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4,
  async (message: any) => {
    // Inline fallback execution for sandboxed environments
    const payload = message.payload || message;
    const { cipherId, type, input, key, options } = payload;
    const dispatcher = await getDispatcher(cipherId);
    const handler = type === 'encrypt' ? dispatcher.encrypt : dispatcher.decrypt;
    return { result: await handler(input, key, options) };
  }
)
