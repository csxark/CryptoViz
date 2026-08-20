export type RsaOperation = "Square" | "Square + Multiply";

export interface WaveformPoint {
  sample: number;
  value: number;
  cycle: number;
  bit: number;
  operation: RsaOperation;
}

export interface RsaCycle {
  cycle: number;
  bit: number;
  operation: RsaOperation;
  startSample: number;
  endSample: number;
  peak: number;
}

export interface DpaCandidate {
  key: number;
  correlation: number;
}

export interface CacheCell {
  line: number;
  phase: number;
  state: "flush" | "access" | "reload-fast" | "reload-slow" | "idle";
  latency: number;
}

export interface SideChannelLabResult {
  rsaBits: number[];
  waveform: WaveformPoint[];
  cycles: RsaCycle[];
  dpaCandidates: DpaCandidate[];
  correctDpaKey: number;
  cacheCells: CacheCell[];
  cacheAccessedLines: number[];
}

export const DEFAULT_RSA_BITS = [1, 0, 1, 1, 0, 1];
export const DEFAULT_DPA_KEY = 0x2a;
export const DEFAULT_TRACE_COUNT = 96;
export const WAVEFORM_SAMPLES_PER_CYCLE = 48;

const AES_SBOX = [
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
] as const;

function hammingWeight(value: number) {
  let count = 0;
  let n = value & 0xff;
  while (n) {
    n &= n - 1;
    count += 1;
  }
  return count;
}

function deterministicNoise(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pearson(xs: number[], ys: number[]) {
  const xMean = average(xs);
  const yMean = average(ys);
  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  for (let index = 0; index < xs.length; index += 1) {
    const x = xs[index] - xMean;
    const y = ys[index] - yMean;
    numerator += x * y;
    xDenominator += x * x;
    yDenominator += y * y;
  }

  const denominator = Math.sqrt(xDenominator * yDenominator);
  return denominator === 0 ? 0 : numerator / denominator;
}

export function buildRsaWaveform(bits = DEFAULT_RSA_BITS): {
  waveform: WaveformPoint[];
  cycles: RsaCycle[];
} {
  if (!bits.length || bits.some((bit) => bit !== 0 && bit !== 1)) {
    throw new Error("RSA demo bits must be a non-empty array containing only 0 or 1.");
  }

  const waveform: WaveformPoint[] = [];
  const cycles: RsaCycle[] = [];

  bits.forEach((bit, cycle) => {
    const operation: RsaOperation = bit === 1 ? "Square + Multiply" : "Square";
    const startSample = cycle * WAVEFORM_SAMPLES_PER_CYCLE;
    const endSample = startSample + WAVEFORM_SAMPLES_PER_CYCLE - 1;
    let peak = 0;

    for (let local = 0; local < WAVEFORM_SAMPLES_PER_CYCLE; local += 1) {
      const phase = local / WAVEFORM_SAMPLES_PER_CYCLE;
      const squarePulse = Math.exp(-((phase - 0.28) ** 2) / 0.008) * 0.55;
      const multiplyPulse =
        bit === 1
          ? Math.exp(-((phase - 0.68) ** 2) / 0.012) * 0.82
          : 0;
      const baseline =
        0.12 + Math.sin((cycle + 1) * 0.7 + local * 0.18) * 0.025;
      const value = baseline + squarePulse + multiplyPulse;

      peak = Math.max(peak, value);
      waveform.push({
        sample: startSample + local,
        value,
        cycle,
        bit,
        operation,
      });
    }

    cycles.push({ cycle, bit, operation, startSample, endSample, peak });
  });

  return { waveform, cycles };
}

export function buildDpaCandidates(
  traceCount = DEFAULT_TRACE_COUNT,
  secretKey = DEFAULT_DPA_KEY,
): { candidates: DpaCandidate[]; correctKey: number } {
  if (!Number.isInteger(traceCount) || traceCount < 16 || traceCount > 500) {
    throw new Error("DPA trace count must be an integer between 16 and 500.");
  }

  const plaintexts = Array.from({ length: traceCount }, (_, index) =>
    (index * 73 + 19) & 0xff,
  );

  const measurements = plaintexts.map((plaintext, index) => {
    const leakage = hammingWeight(AES_SBOX[plaintext ^ secretKey]);
    return leakage + deterministicNoise(index + 101) * 1.25;
  });

  const candidates = Array.from({ length: 256 }, (_, key) => {
    const hypothesis = plaintexts.map((plaintext) =>
      hammingWeight(AES_SBOX[plaintext ^ key]),
    );
    return { key, correlation: pearson(hypothesis, measurements) };
  }).sort((left, right) => Math.abs(right.correlation) - Math.abs(left.correlation));

  return { candidates, correctKey: secretKey };
}

export function buildCacheHeatmap(): {
  cells: CacheCell[];
  accessedLines: number[];
} {
  const accessedLines = [3, 7, 11, 18, 23];
  const cells: CacheCell[] = [];

  for (let line = 0; line < 32; line += 1) {
    for (let phase = 0; phase < 20; phase += 1) {
      let state: CacheCell["state"] = "idle";
      let latency = 0;

      if (phase === 1 || phase === 2) {
        state = "flush";
        latency = 180;
      } else if (phase >= 6 && phase <= 9 && accessedLines.includes(line)) {
        state = "access";
        latency = 80;
      } else if (phase === 13 && accessedLines.includes(line)) {
        state = "reload-fast";
        latency = 42;
      } else if (phase === 14 && !accessedLines.includes(line)) {
        state = "reload-slow";
        latency = 168;
      }

      cells.push({ line, phase, state, latency });
    }
  }

  return { cells, accessedLines };
}

export function autoExtractRsaBits(cycles: RsaCycle[]) {
  const threshold = 0.7;
  return cycles.map((cycle) => (cycle.peak >= threshold ? 1 : 0));
}

export function runSideChannelLab(): SideChannelLabResult {
  const { waveform, cycles } = buildRsaWaveform();
  const { candidates, correctKey } = buildDpaCandidates();
  const { cells, accessedLines } = buildCacheHeatmap();

  return {
    rsaBits: DEFAULT_RSA_BITS,
    waveform,
    cycles,
    dpaCandidates: candidates,
    correctDpaKey: correctKey,
    cacheCells: cells,
    cacheAccessedLines: accessedLines,
  };
}
