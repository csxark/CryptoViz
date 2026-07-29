import { describe, expect, it } from "vitest";
import {
  normalizeDomHtml,
  compareSnapshotHtml,
  DEFAULT_VISUALIZATION_SNAPSHOTS,
  exportSnapshotReportJSON,
  exportSnapshotReportMarkdown,
} from "@/lib/utils/visualizationSnapshots";

describe("visualizationSnapshots utility", () => {
  it("normalizes HTML strings deterministically", () => {
    const rawA = `<div  class="z-10 bg-red-500  flex " > <span >Hello</span> </div>`;
    const rawB = `<div class="bg-red-500 flex z-10"><span>Hello</span></div>`;

    const normA = normalizeDomHtml(rawA);
    const normB = normalizeDomHtml(rawB);

    expect(normA).toBe(normB);
  });

  it("returns match pass for identical HTML snapshots", () => {
    const html = `<div class="p-4 font-bold"><span>Test Component</span></div>`;
    const diff = compareSnapshotHtml(html, html);

    expect(diff.isMatch).toBe(true);
    expect(diff.addedCount).toBe(0);
    expect(diff.removedCount).toBe(0);
    expect(diff.lines.length).toBeGreaterThan(0);
  });

  it("detects added and removed lines when HTML changes", () => {
    const baseline = `<div class="p-4"><span>Line 1</span></div>`;
    const mutated = `<div class="p-4"><span>Line 1</span><span class="text-red-500">Mutated Line</span></div>`;

    const diff = compareSnapshotHtml(baseline, mutated);

    expect(diff.isMatch).toBe(false);
    expect(diff.addedCount).toBeGreaterThan(0);
  });

  it("loads builtin visualization snapshot presets", () => {
    expect(DEFAULT_VISUALIZATION_SNAPSHOTS.length).toBeGreaterThan(0);
    const heatmap = DEFAULT_VISUALIZATION_SNAPSHOTS.find(
      (s) => s.componentName === "ByteHeatmap",
    );
    expect(heatmap).toBeDefined();
    expect(heatmap?.status).toBe("pass");
  });

  it("exports valid JSON and Markdown snapshot reports", () => {
    const jsonStr = exportSnapshotReportJSON(DEFAULT_VISUALIZATION_SNAPSHOTS);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.totalSnapshots).toBe(DEFAULT_VISUALIZATION_SNAPSHOTS.length);
    expect(parsed.passed).toBeGreaterThan(0);

    const mdStr = exportSnapshotReportMarkdown(DEFAULT_VISUALIZATION_SNAPSHOTS);
    expect(mdStr).toContain("# CryptoViz Component Snapshot Test Report");
    expect(mdStr).toContain("ByteHeatmap");
  });
});
