# Compare Benchmarks Across Sessions

## Overview

The **Compare Benchmarks Across Sessions** feature in CryptoViz provides an interactive, visual, and educational workspace for comparing cryptographic performance metrics across different benchmark execution sessions.

Whether comparing WebCrypto native hardware acceleration against pure JavaScript fallback implementations, evaluating payload scaling ($O(N)$ vs $O(N^3)$), or analyzing multi-core Web Worker IPC thread performance, this module helps users understand the underlying hardware, mathematical, and architectural factors driving cryptographic speed.

---

## Key Features

1. **Interactive Comparative Metrics Dashboard**:
   - **Throughput Speedup Ratio**: Multi-session speedup/slowdown calculations relative to baseline.
   - **Mean Compute Latency (ms)**: Per-cipher execution duration comparison.
   - **Worker IPC Round-Trip Time (RTT)**: Structured Clone serialization and thread postMessage overhead.
   - **Memory Allocation Growth**: Dynamic byte footprint measurements during cipher evaluation.

2. **Recharts Multi-Session Visualization**:
   - Side-by-side grouped bar charts for throughput, execution time, worker RTT, and memory consumption.
   - Interactive tooltips displaying exact metric values, cipher categories, and WebCrypto vs JS implementation flags.

3. **Per-Algorithm Diff Grid**:
   - Tabular comparison comparing Session A vs Session B on a cipher-by-cipher basis.
   - Color-coded speedup badges, sorting, category filters, and live search.

4. **Educational Concept Cards**:
   - **Hardware Acceleration**: AES-NI and SHA extension instruction set speedups in WebCrypto.
   - **Algorithmic Complexity**: Linear $O(N)$ symmetric payload scaling vs cubic $O(N^3)$ asymmetric RSA/DH modular exponentiation.
   - **Web Worker Concurrency & Serialization**: Structured clone overhead vs parallel worker performance.
   - **Memory-Hard KDFs**: Bcrypt, Scrypt, and Argon2 resistance against GPU brute-force attacks.

5. **Built-in Presets & Export/Import**:
   - **Presets**: Instant educational scenarios (WebCrypto vs JS, 1KB vs 64KB Payload, 2-Core vs 16-Core CPU).
   - **Export/Import**: Download session comparison reports in structured JSON or CSV format, or import external session benchmark JSON files.

---

## Architecture & Data Flow

```
+-----------------------------------------------------------------------+
|                         Benchmark Sessions                            |
|    (Local Storage History OR Educational Presets OR Imported JSON)    |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                lib/utils/sessionComparison.ts                         |
|   - computeSessionComparison(sessionA, sessionB)                       |
|   - Calculates Speedup Ratio, Throughput Delta %, Latency Diff       |
|   - Generates AlgorithmDiff[] & Environment Context                   |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|              SessionComparisonVisualizer Component                    |
|   - SessionDeltaCard: High-level metric badges                        |
|   - Recharts Workspace: Throughput, Latency, Worker, Memory charts    |
|   - AlgorithmDiffTable: Per-cipher diff grid with sorting & search    |
|   - SessionEnvironmentComparison: Hardware/Browser parameter diffs   |
|   - EducationalSessionInsights: Interactive cryptographic explanations|
|   - SessionExportImport: JSON / CSV export & session upload           |
+-----------------------------------------------------------------------+
```

---

## Data Structures

```typescript
export interface AlgorithmDiff {
  cipherId: string;
  cipherName: string;
  category: string;
  resultA: BenchmarkResult | null;
  resultB: BenchmarkResult | null;
  opsPerSecA: number | null;
  opsPerSecB: number | null;
  opsPerSecDeltaPercent: number | null;
  avgTimeA: number | null;
  avgTimeB: number | null;
  avgTimeDeltaMs: number | null;
  speedupFactor: number | null;
  status: "faster" | "slower" | "similar" | "missing";
}

export interface SessionDelta {
  sessionA: BenchmarkSession;
  sessionB: BenchmarkSession;
  speedupRatio: number;
  meanTimeDeltaMs: number;
  throughputDeltaPercent: number;
  workerTimeDeltaMs: number;
  memoryDeltaBytes: number;
  algorithmDiffs: AlgorithmDiff[];
  fastestAlgorithm?: AlgorithmDiff;
  slowestAlgorithm?: AlgorithmDiff;
}
```

---

## Verification & Testing

Unit tests for `sessionComparison.ts` and `SessionComparisonVisualizer.tsx` can be executed using Vitest:

```bash
npm run test
```

Or target specific tests:
```bash
npx vitest run tests/unit/utils/sessionComparison.test.ts
npx vitest run tests/unit/components/SessionComparisonVisualizer.test.tsx
```
