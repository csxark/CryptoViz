/**
 * Benchmark types for performance measurement of cryptographic algorithms.
 */

export type CipherCategory = "classical" | "symmetric" | "asymmetric" | "hash" | "kdf";

export interface BenchmarkResult {
  cipherId: string;
  cipherName: string;
  category: CipherCategory;
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
  /** WebCrypto vs JS implementation status */
  implementation?: "WebCrypto" | "JavaScript";
  status?: "success" | "unsupported" | "error";
  errorMessage?: string;
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

export interface BrowserCapabilityReport {
  userAgent: string;
  webCryptoSupported: boolean;
  supportedAlgorithms: string[];
  benchmarkResults: BenchmarkResult[];
  timestamp: number;
}