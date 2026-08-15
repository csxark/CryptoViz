export interface CipherBenchmarkData {
  id: string;
  name: string;
  throughput: number; // MB/s
  memoryFootprint: number; // KB (lower is better, handled in normalization)
  setupLatency: number; // microseconds (lower is better)
  blockSize: number; // bits
  securityBits: number; // bits
  codeFootprint: number; // KB (lower is better)
}

export type HardwareArchitecture = 'embedded-8bit' | 'mobile-arm64' | 'desktop-x86';

const ARCHITECTURE_WEIGHTS: Record<HardwareArchitecture, Record<string, number>> = {
  'embedded-8bit': { throughput: 0.5, memoryFootprint: 2.0, setupLatency: 1.5, blockSize: 1.0, securityBits: 1.0, codeFootprint: 2.0 },
  'mobile-arm64': { throughput: 1.2, memoryFootprint: 1.0, setupLatency: 1.0, blockSize: 1.0, securityBits: 1.2, codeFootprint: 1.0 },
  'desktop-x86': { throughput: 2.0, memoryFootprint: 0.5, setupLatency: 0.8, blockSize: 1.2, securityBits: 1.5, codeFootprint: 0.5 },
};

export function normalizeMetrics(
  ciphers: CipherBenchmarkData[],
  allCiphers: CipherBenchmarkData[],
  architecture: HardwareArchitecture
): Record<string, number>[] {
  const weights = ARCHITECTURE_WEIGHTS[architecture];

  // Compute min/max across all available ciphers for proper scaling
  const metrics = ['throughput', 'memoryFootprint', 'setupLatency', 'blockSize', 'securityBits', 'codeFootprint'] as const;
  
  const bounds: Record<typeof metrics[number], { min: number; max: number }> = {
    throughput: {
      min: Math.min(...allCiphers.map(c => c.throughput)),
      max: Math.max(...allCiphers.map(c => c.throughput)),
    },
    memoryFootprint: {
      min: Math.min(...allCiphers.map(c => c.memoryFootprint)),
      max: Math.max(...allCiphers.map(c => c.memoryFootprint)),
    },
    setupLatency: {
      min: Math.min(...allCiphers.map(c => c.setupLatency)),
      max: Math.max(...allCiphers.map(c => c.setupLatency)),
    },
    blockSize: {
      min: Math.min(...allCiphers.map(c => c.blockSize)),
      max: Math.max(...allCiphers.map(c => c.blockSize)),
    },
    securityBits: {
      min: Math.min(...allCiphers.map(c => c.securityBits)),
      max: Math.max(...allCiphers.map(c => c.securityBits)),
    },
    codeFootprint: {
      min: Math.min(...allCiphers.map(c => c.codeFootprint)),
      max: Math.max(...allCiphers.map(c => c.codeFootprint)),
    },
  };

  return ciphers.map(cipher => {
    const normalized: Record<string, number> = {};

    metrics.forEach(metric => {
      const val = cipher[metric];
      const { min, max } = bounds[metric];
      
      let score = max === min ? 50 : ((val - min) / (max - min)) * 100;

      // Invert metrics where lower is better (RAM, Latency, Code Footprint)
      if (['memoryFootprint', 'setupLatency', 'codeFootprint'].includes(metric)) {
        score = 100 - score;
      }

      // Apply architecture weight constraints
      normalized[metric] = Math.min(100, Math.max(0, score * (weights[metric] || 1)));
    });

    return normalized;
  });
}
