import type { CryptoWorkerRequest, CryptoWorkerResponse } from "./crypto.worker";

type Resolvers = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
};

class CryptoWorkerClient {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, Resolvers>();

  private initWorker() {
    if (!this.worker && typeof window !== "undefined") {
      this.worker = new Worker(new URL("./crypto.worker.ts", import.meta.url), {
        type: "module",
      });

      this.worker.onmessage = (event: MessageEvent<CryptoWorkerResponse>) => {
        const { id, success } = event.data;
        const resolvers = this.pendingRequests.get(id);
        
        if (resolvers) {
          this.pendingRequests.delete(id);
          if (success) {
            resolvers.resolve((event.data as any).result);
          } else {
            resolvers.reject(new Error((event.data as any).error));
          }
        }
      };
    }
  }

  public async runCryptoOperation<T>(operation: CryptoWorkerRequest["operation"], payload: unknown): Promise<T> {
    this.initWorker();

    return new Promise<T>((resolve, reject) => {
      const id = crypto.randomUUID();
      this.pendingRequests.set(id, { resolve, reject });

      if (this.worker) {
        this.worker.postMessage({ id, operation, payload });
      } else {
        reject(new Error("Web Worker is not supported or failed to initialize"));
      }
    });
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    for (const { reject } of this.pendingRequests.values()) {
      reject(new Error("Worker terminated"));
    }
    this.pendingRequests.clear();
  }
}

export const cryptoWorkerClient = new CryptoWorkerClient();
