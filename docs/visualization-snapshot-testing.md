# Snapshot Testing for Visualization Components

## Overview

The **Snapshot Testing for Visualization Components** module in CryptoViz provides automated regression testing and interactive DOM structure assertion tools for all cryptographic visualizers and layout components.

By capturing baseline HTML rendering snapshots, developers can ensure that code refactoring, styling changes, or state updates do not introduce unintended UI regressions in complex components like `ByteHeatmap`, `PlayfairGrid`, `StepAnimator`, `HMACVisualizer`, and `ScryptVisualizer`.

---

## Key Features

1. **Interactive Snapshot Runner (`SnapshotTestRunner`)**:
   - Live DOM structural diff viewer highlighting added/removed HTML lines.
   - Mutation simulator allowing developers to test how regression alerts fire when element trees change.
   - Status tracking across Classical, Symmetric, Hash, KDF, and Layout components.

2. **Automated Vitest Snapshot Assertions**:
   - Automated tests using `render()` and `expect(asFragment()).toMatchSnapshot()` or DOM structure assertions.
   - Deterministic class sorting and whitespace normalization to prevent false-positive diff failures across test runners.

3. **Built-in Snapshot Presets**:
   - `ByteHeatmap`: 16x16 byte level variance matrix snapshot.
   - `PlayfairGrid`: 5x5 Playfair matrix state snapshot.
   - `StepAnimator`: Execution timeline step container snapshot.
   - `SkeletonCard`: Loading state placeholder snapshot.
   - `ScryptVisualizer`: Memory-hard block mixing matrix snapshot.

4. **Reporting & Exporting**:
   - Export structured JSON reports containing pass/fail snapshot metrics.
   - Export Markdown report summaries for pull request reviews and CI documentation.

---

## Architecture & Data Flow

```
+-------------------------------------------------------------------+
|                  Visualization Components                         |
|   (ByteHeatmap, PlayfairGrid, StepAnimator, SkeletonCard, KDF)    |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|               lib/utils/visualizationSnapshots.ts                 |
|   - normalizeDomHtml(html): Deterministic class & whitespace      |
|   - compareSnapshotHtml(baseline, current): Line-by-line diff      |
|   - DEFAULT_VISUALIZATION_SNAPSHOTS presets                       |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|              Interactive UI & Automated Test Suite                |
|   - SnapshotTestRunner: Interactive DOM Diff & Regression Module  |
|   - SnapshotDiffViewer: Line-by-line colored diff (+ / -)         |
|   - componentSnapshots.test.tsx: Vitest automated snapshot suite  |
+-------------------------------------------------------------------+
```

---

## Data Structures

```typescript
export interface VisualizationSnapshot {
  id: string;
  componentName: string;
  title: string;
  category: "classical" | "symmetric" | "hash" | "kdf" | "benchmark" | "layout";
  stateDescription: string;
  props: Record<string, unknown>;
  baselineDomHtml: string;
  capturedAt: string;
  status: "pass" | "fail" | "untested";
}

export interface SnapshotDiffResult {
  isMatch: boolean;
  addedCount: number;
  removedCount: number;
  lines: Array<{
    type: "added" | "removed" | "unchanged";
    lineNumber: number;
    content: string;
  }>;
}
```

---

## Running Tests

To run the automated Vitest snapshot test suite:

```bash
npx vitest run tests/unit/utils/visualizationSnapshots.test.ts tests/unit/components/componentSnapshots.test.tsx
```

To update baseline snapshots in Vitest:

```bash
npx vitest run -u
```
