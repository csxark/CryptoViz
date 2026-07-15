/**
 * Benchmark types for performance measurement of cryptographic algorithms.
 */
export interface BenchmarkResult {
  cipherId: string;
  cipherName: string;
  category: string;
  inputSize: number;
  direction: "encrypt" | "decrypt" | "hash";
  iterations: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  stdDev: number;
  totalTime: number;
  operationsPerSecond: number;
  timestamp: Date;
  /** Average end-to-end Web Worker request time, including message transfer. */
  workerExecutionTime?: number;
  /** Time required for React/browser to commit the result UI. */
  renderTime?: number;
  /** Optional memory growth metric captured during benchmark execution. */
  memoryUsage?: number;
}

export interface BenchmarkComparison {
  inputSize: number;
  results: BenchmarkResult[];
}

export interface BenchmarkSession {
  id: string;
  timestamp: Date;
  deviceInfo: DeviceInfo;
  results: BenchmarkResult[];
  inputSize?: number;
  iterations?: number;
  selectedAlgorithms?: string[];
}

export interface DeviceInfo {
  userAgent: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  language: string;
  platform: string;
  timezone: string;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelDepth: number;
  };
}

export interface AlgorithmGroup {
  category: "classical" | "symmetric" | "asymmetric" | "hash";
  algorithms: string[];
}
