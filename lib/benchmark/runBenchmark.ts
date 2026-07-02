// lib/benchmark/runBenchmark.ts

export interface BenchmarkConfig {
  cipherId: string;
  input: string;
  key: string;
  iterations: number;
}

export interface BenchmarkResult {
  cipherId: string;
  encryptionTime: number;
  decryptionTime: number;
  totalEncryptionTime: number;
  totalDecryptionTime: number;
  iterations: number;
}

interface WorkerRequest {
  id: string;
  action: "encrypt" | "decrypt";
  cipherId: string;
  input: string;
  key: string;
  options?: any;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
}

function createWorker(): Worker {
  return new Worker(
    new URL("../workers/cipher.worker.ts", import.meta.url),
    {
      type: "module",
    }
  );
}

function executeWorker(
  worker: Worker,
  request: WorkerRequest
): Promise<WorkerResponse> {
  return new Promise((resolve, reject) => {
    const handleMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== request.id) return;

      worker.removeEventListener("message", handleMessage);

      if (event.data.success) {
        resolve(event.data);
      } else {
        reject(new Error(event.data.error));
      }
    };

    worker.addEventListener("message", handleMessage);

    worker.postMessage(request);
  });
}

export async function benchmarkCipher(
  config: BenchmarkConfig
): Promise<BenchmarkResult> {
  const worker = createWorker();

  let totalEncryptionTime = 0;
  let totalDecryptionTime = 0;

  try {
    for (let i = 0; i < config.iterations; i++) {
      const encryptId = crypto.randomUUID();

      const encryptStart = performance.now();

      await executeWorker(worker, {
        id: encryptId,
        action: "encrypt",
        cipherId: config.cipherId,
        input: config.input,
        key: config.key,
      });

      const encryptEnd = performance.now();

      totalEncryptionTime += encryptEnd - encryptStart;

      const decryptId = crypto.randomUUID();

      const decryptStart = performance.now();

      await executeWorker(worker, {
        id: decryptId,
        action: "decrypt",
        cipherId: config.cipherId,
        input: config.input,
        key: config.key,
      });

      const decryptEnd = performance.now();

      totalDecryptionTime += decryptEnd - decryptStart;
    }

    return {
      cipherId: config.cipherId,
      iterations: config.iterations,
      totalEncryptionTime,
      totalDecryptionTime,
      encryptionTime:
        totalEncryptionTime / config.iterations,
      decryptionTime:
        totalDecryptionTime / config.iterations,
    };
  } finally {
    worker.terminate();
  }
}

export async function benchmarkMultipleCiphers(
  configs: BenchmarkConfig[]
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];

  for (const config of configs) {
    const result = await benchmarkCipher(config);
    results.push(result);
  }

  return results;
}

export function generateRandomInput(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let output = "";

  for (let i = 0; i < length; i++) {
    output += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }

  return output;
}

export function exportBenchmarkCSV(
  results: BenchmarkResult[]
) {
  const header =
    "Cipher,Iterations,Average Encrypt(ms),Average Decrypt(ms),Total Encrypt(ms),Total Decrypt(ms)\n";

  const rows = results
    .map(
      (result) =>
        `${result.cipherId},${result.iterations},${result.encryptionTime.toFixed(
          4
        )},${result.decryptionTime.toFixed(
          4
        )},${result.totalEncryptionTime.toFixed(
          4
        )},${result.totalDecryptionTime.toFixed(4)}`
    )
    .join("\n");

  const blob = new Blob([header + rows], {
    type: "text/csv",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = "benchmark-results.csv";

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}