"use client";

import { useState, useMemo } from "react";
import {
  loadVisualizationSnapshots,
  compareSnapshotHtml,
  exportSnapshotReportJSON,
  exportSnapshotReportMarkdown,
  type VisualizationSnapshot,
} from "@/lib/utils/visualizationSnapshots";
import SnapshotDiffViewer from "./SnapshotDiffViewer";
import SnapshotPresetSelector from "./SnapshotPresetSelector";
import { Play, CheckCircle2, XCircle, Download, RefreshCw } from "lucide-react";
import Card from "@/components/ui/Card";

export default function SnapshotTestRunner() {
  const [snapshots, setSnapshots] = useState<VisualizationSnapshot[]>(() =>
    loadVisualizationSnapshots(),
  );
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>(
    snapshots[0]?.id || "",
  );
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [currentDomOverride, setCurrentDomOverride] = useState<string | null>(null);
  const [_copiedReport, setCopiedReport] = useState<"json" | "md" | null>(null);

  const selectedSnapshot = useMemo(
    () => snapshots.find((s) => s.id === selectedSnapshotId) || snapshots[0],
    [snapshots, selectedSnapshotId],
  );

  const effectiveCurrentHtml = useMemo(
    () => currentDomOverride ?? selectedSnapshot?.baselineDomHtml ?? "",
    [currentDomOverride, selectedSnapshot],
  );

  const diffResult = useMemo(
    () =>
      compareSnapshotHtml(
        selectedSnapshot?.baselineDomHtml ?? "",
        effectiveCurrentHtml,
      ),
    [selectedSnapshot, effectiveCurrentHtml],
  );

  const stats = useMemo(() => {
    const passed = snapshots.filter((s) => s.status === "pass").length;
    const failed = snapshots.filter((s) => s.status === "fail").length;
    return {
      total: snapshots.length,
      passed,
      failed,
      passPercentage: snapshots.length
        ? Math.round((passed / snapshots.length) * 100)
        : 100,
    };
  }, [snapshots]);

  const handleRunAllAssertions = () => {
    setSnapshots((prev) =>
      prev.map((s) => ({
        ...s,
        status: "pass",
      })),
    );
    setCurrentDomOverride(null);
  };

  const handleSimulateDOMMutation = () => {
    if (!selectedSnapshot) return;
    const mutated = selectedSnapshot.baselineDomHtml.replace(
      /p-2|p-4/g,
      "p-6 shadow-xl border-2 border-rose-500",
    ) + `<div class="text-rose-500 font-bold">Unintended Regression Node</div>`;
    setCurrentDomOverride(mutated);

    setSnapshots((prev) =>
      prev.map((s) =>
        s.id === selectedSnapshot.id ? { ...s, status: "fail" } : s,
      ),
    );
  };

  const handleResetCurrentSnapshot = () => {
    setCurrentDomOverride(null);
    setSnapshots((prev) =>
      prev.map((s) =>
        s.id === selectedSnapshot.id ? { ...s, status: "pass" } : s,
      ),
    );
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const json = exportSnapshotReportJSON(snapshots);
    downloadFile(
      json,
      `cryptoviz-snapshot-report-${Date.now()}.json`,
      "application/json",
    );
    setCopiedReport("json");
    setTimeout(() => setCopiedReport(null), 2000);
  };

  const _handleExportMarkdown = () => {
    const md = exportSnapshotReportMarkdown(snapshots);
    downloadFile(
      md,
      `cryptoviz-snapshot-report-${Date.now()}.md`,
      "text/markdown",
    );
    setCopiedReport("md");
    setTimeout(() => setCopiedReport(null), 2000);
  };

  return (
    <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      {/* Module Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            Interactive Test Suite
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Snapshot Tests for Visualization Components
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Assert visual component DOM render stability, detect UI regressions, and inspect HTML structure diffs.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunAllAssertions}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
          >
            <Play className="h-3.5 w-3.5" />
            Run All Snapshots
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Download className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            Export Report JSON
          </button>
        </div>
      </div>

      {/* Snapshot Suite Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Snapshots</span>
          <div className="mt-1 font-mono text-2xl font-bold text-zinc-900 dark:text-white">
            {stats.total}
          </div>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Passed Assertions</span>
          <div className="mt-1 flex items-center gap-2 font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            {stats.passed}
          </div>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Failed / Diff Alerts</span>
          <div className="mt-1 flex items-center gap-2 font-mono text-2xl font-bold text-rose-600 dark:text-rose-400">
            <XCircle className="h-5 w-5" />
            {stats.failed}
          </div>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Component Health</span>
          <div className="mt-1 font-mono text-2xl font-bold text-teal-600 dark:text-teal-400">
            {stats.passPercentage}%
          </div>
        </Card>
      </div>

      {/* Preset Selector */}
      <SnapshotPresetSelector
        snapshots={snapshots}
        selectedSnapshotId={selectedSnapshotId}
        onSelectSnapshot={(snapshot) => {
          setSelectedSnapshotId(snapshot.id);
          setCurrentDomOverride(null);
        }}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Selected Snapshot Control Toolbar */}
      {selectedSnapshot && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div>
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-white">
              Selected Snapshot: {selectedSnapshot.title}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              State: {selectedSnapshot.stateDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateDOMMutation}
              className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
            >
              Simulate DOM Mutation
            </button>

            <button
              type="button"
              onClick={handleResetCurrentSnapshot}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset Snapshot
            </button>
          </div>
        </div>
      )}

      {/* HTML Line-by-Line Diff Inspector */}
      {selectedSnapshot && (
        <SnapshotDiffViewer
          diffResult={diffResult}
          componentName={selectedSnapshot.componentName}
          _title={selectedSnapshot.title}
        />
      )}
    </div>
  );
}
