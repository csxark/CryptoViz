export type ComponentCategory =
  | "classical"
  | "symmetric"
  | "hash"
  | "kdf"
  | "benchmark"
  | "layout";

export interface VisualizationSnapshot {
  id: string;
  componentName: string;
  title: string;
  category: ComponentCategory;
  stateDescription: string;
  props: Record<string, unknown>;
  baselineDomHtml: string;
  capturedAt: string;
  status: "pass" | "fail" | "untested";
}

export interface SnapshotDiffLine {
  type: "added" | "removed" | "unchanged";
  lineNumber: number;
  content: string;
}

export interface SnapshotDiffResult {
  isMatch: boolean;
  addedCount: number;
  removedCount: number;
  lines: SnapshotDiffLine[];
}

export interface SnapshotTestReport {
  exportedAt: string;
  totalSnapshots: number;
  passed: number;
  failed: number;
  untested: number;
  snapshots: Array<{
    id: string;
    componentName: string;
    title: string;
    status: "pass" | "fail" | "untested";
    addedDiffCount: number;
    removedDiffCount: number;
  }>;
}

export const VISUALIZATION_SNAPSHOT_STORAGE_KEY = "cryptoviz-visualization-snapshots";

/**
 * Normalizes HTML string for reliable structural DOM comparison.
 */
export function normalizeDomHtml(html: string): string {
  return html
    .trim()
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .replace(/data-reactroot=""/g, "")
    .replace(/class="([^"]*)"/g, (match, p1) => {
      // Sort class names for deterministic snapshot matching
      const sortedClasses = p1.split(" ").filter(Boolean).sort().join(" ");
      return `class="${sortedClasses}"`;
    });
}

/**
 * Compares baseline HTML against current rendered HTML line-by-line.
 */
export function compareSnapshotHtml(
  baselineHtml: string,
  currentHtml: string,
): SnapshotDiffResult {
  const normBaseline = normalizeDomHtml(baselineHtml);
  const normCurrent = normalizeDomHtml(currentHtml);

  if (normBaseline === normCurrent) {
    const formattedLines = normBaseline.split("><").map((segment, idx) => ({
      type: "unchanged" as const,
      lineNumber: idx + 1,
      content: idx === 0 ? segment : `<${segment}`,
    }));

    return {
      isMatch: true,
      addedCount: 0,
      removedCount: 0,
      lines: formattedLines,
    };
  }

  const linesA = normBaseline.split("><").map((s, i) => (i === 0 ? s : `<${s}`));
  const linesB = normCurrent.split("><").map((s, i) => (i === 0 ? s : `<${s}`));

  const diffLines: SnapshotDiffLine[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let lineCounter = 1;

  const maxLen = Math.max(linesA.length, linesB.length);

  for (let i = 0; i < maxLen; i += 1) {
    const lineA = linesA[i];
    const lineB = linesB[i];

    if (lineA === lineB) {
      diffLines.push({
        type: "unchanged",
        lineNumber: lineCounter++,
        content: lineA,
      });
    } else {
      if (lineA !== undefined) {
        diffLines.push({
          type: "removed",
          lineNumber: lineCounter++,
          content: lineA,
        });
        removedCount += 1;
      }
      if (lineB !== undefined) {
        diffLines.push({
          type: "added",
          lineNumber: lineCounter++,
          content: lineB,
        });
        addedCount += 1;
      }
    }
  }

  return {
    isMatch: false,
    addedCount,
    removedCount,
    lines: diffLines,
  };
}

/**
 * Built-in snapshot baseline definitions for CryptoViz visualizer components.
 */
export const DEFAULT_VISUALIZATION_SNAPSHOTS: VisualizationSnapshot[] = [
  {
    id: "snapshot-byte-heatmap",
    componentName: "ByteHeatmap",
    title: "ByteHeatmap Avalanche Bit Matrix",
    category: "symmetric",
    stateDescription: "Renders 16x16 byte level variance matrix showing bit flips during AES encryption rounds.",
    props: {
      data: Array.from({ length: 16 }, (_, i) => ({
        index: i,
        diffCount: (i * 3) % 8,
        percentage: ((i * 3) % 8) / 8,
      })),
    },
    baselineDomHtml: `<div class="grid grid-cols-4 gap-2 border p-4"><div class="rounded bg-teal-500 p-2 font-mono text-xs">Byte 0: 0 bits</div><div class="rounded bg-teal-600 p-2 font-mono text-xs">Byte 1: 3 bits</div><div class="rounded bg-teal-700 p-2 font-mono text-xs">Byte 2: 6 bits</div></div>`,
    capturedAt: "2026-07-28T12:00:00Z",
    status: "pass",
  },
  {
    id: "snapshot-playfair-grid",
    componentName: "PlayfairGrid",
    title: "Playfair Cipher 5x5 Key Matrix",
    category: "classical",
    stateDescription: "Renders 5x5 Playfair grid matrix populated with key string MONARCHY.",
    props: {
      matrix: [
        ["M", "O", "N", "A", "R"],
        ["C", "H", "Y", "B", "D"],
        ["E", "F", "G", "I", "K"],
        ["L", "P", "Q", "S", "T"],
        ["U", "V", "W", "X", "Z"],
      ],
      activePair: ["M", "O"],
    },
    baselineDomHtml: `<div class="grid grid-cols-5 gap-1 font-mono text-center font-bold"><div class="bg-teal-600 text-white p-2">M</div><div class="bg-teal-600 text-white p-2">O</div><div class="bg-zinc-800 text-zinc-200 p-2">N</div></div>`,
    capturedAt: "2026-07-28T12:05:00Z",
    status: "pass",
  },
  {
    id: "snapshot-step-animator",
    componentName: "StepAnimator",
    title: "StepAnimator Cipher Execution Timeline",
    category: "classical",
    stateDescription: "Step-by-step visual animation container highlighting shift substitutions.",
    props: {
      currentStep: 2,
      totalSteps: 5,
      stepTitle: "Shift Character 'A' by Key 3 -> 'D'",
    },
    baselineDomHtml: `<div class="flex items-center justify-between border-b pb-2"><span class="font-bold text-sm">Step 2 of 5</span><span class="text-teal-400">Shift Character 'A' by Key 3 -> 'D'</span></div>`,
    capturedAt: "2026-07-28T12:10:00Z",
    status: "pass",
  },
  {
    id: "snapshot-skeleton-card",
    componentName: "SkeletonCard",
    title: "SkeletonCard Loading Placeholder",
    category: "layout",
    stateDescription: "Placeholder skeleton animation for async web worker ciphers.",
    props: {},
    baselineDomHtml: `<div data-testid="skeleton-card" class="animate-pulse rounded-xl border p-4 space-y-3"><div data-testid="skeleton-line" class="h-4 bg-zinc-800 rounded w-3/4"></div></div>`,
    capturedAt: "2026-07-28T12:15:00Z",
    status: "pass",
  },
  {
    id: "snapshot-scrypt-visualizer",
    componentName: "ScryptVisualizer",
    title: "Scrypt Memory-Hard Vector Grid",
    category: "kdf",
    stateDescription: "State matrix displaying 1024-element memory block mixing.",
    props: {
      costFactor: 1024,
      blockSize: 8,
      parallelization: 1,
    },
    baselineDomHtml: `<div class="rounded-lg border p-4 font-mono text-xs"><span class="font-bold text-teal-400">Scrypt N=1024, r=8, p=1</span><div class="mt-2 grid grid-cols-8 gap-1"><div class="bg-purple-900 p-1">V[0]</div></div></div>`,
    capturedAt: "2026-07-28T12:20:00Z",
    status: "pass",
  },
];

/**
 * Load snapshots from local storage combined with default presets.
 */
export function loadVisualizationSnapshots(): VisualizationSnapshot[] {
  if (typeof window === "undefined") return DEFAULT_VISUALIZATION_SNAPSHOTS;
  try {
    const raw = window.localStorage.getItem(VISUALIZATION_SNAPSHOT_STORAGE_KEY);
    if (!raw) return DEFAULT_VISUALIZATION_SNAPSHOTS;
    const parsed = JSON.parse(raw) as VisualizationSnapshot[];
    return [...parsed, ...DEFAULT_VISUALIZATION_SNAPSHOTS.filter((d) => !parsed.some((p) => p.id === d.id))];
  } catch {
    return DEFAULT_VISUALIZATION_SNAPSHOTS;
  }
}

/**
 * Save custom visualization snapshot.
 */
export function saveVisualizationSnapshot(
  snapshot: VisualizationSnapshot,
): VisualizationSnapshot[] {
  const existing = loadVisualizationSnapshots();
  const updated = [snapshot, ...existing.filter((item) => item.id !== snapshot.id)];

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        VISUALIZATION_SNAPSHOT_STORAGE_KEY,
        JSON.stringify(updated),
      );
    } catch {
      // Storage limits handled gracefully
    }
  }

  return updated;
}

/**
 * Generates structured JSON snapshot test report.
 */
export function exportSnapshotReportJSON(
  snapshots: VisualizationSnapshot[],
): string {
  const passed = snapshots.filter((s) => s.status === "pass").length;
  const failed = snapshots.filter((s) => s.status === "fail").length;
  const untested = snapshots.filter((s) => s.status === "untested").length;

  const report: SnapshotTestReport = {
    exportedAt: new Date().toISOString(),
    totalSnapshots: snapshots.length,
    passed,
    failed,
    untested,
    snapshots: snapshots.map((s) => ({
      id: s.id,
      componentName: s.componentName,
      title: s.title,
      status: s.status,
      addedDiffCount: 0,
      removedDiffCount: 0,
    })),
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Generates Markdown snapshot test report.
 */
export function exportSnapshotReportMarkdown(
  snapshots: VisualizationSnapshot[],
): string {
  const passed = snapshots.filter((s) => s.status === "pass").length;
  const failed = snapshots.filter((s) => s.status === "fail").length;

  const lines: string[] = [
    "# CryptoViz Component Snapshot Test Report",
    "",
    `**Exported At**: ${new Date().toLocaleString()}`,
    `**Total Component Snapshots**: ${snapshots.length}`,
    `**Passed**: ${passed} | **Failed**: ${failed}`,
    "",
    "| Snapshot ID | Component Name | Title | Category | Status |",
    "|-------------|----------------|-------|----------|--------|",
  ];

  snapshots.forEach((s) => {
    lines.push(
      `| \`${s.id}\` | \`${s.componentName}\` | ${s.title} | \`${s.category}\` | **${s.status.toUpperCase()}** |`,
    );
  });

  return lines.join("\n");
}
