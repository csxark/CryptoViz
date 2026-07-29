"use client";

import { useMemo, useState, useEffect } from "react";
import type { BenchmarkSession } from "@/types/benchmark";
import {
  computeSessionComparison,
  DEFAULT_SESSION_PRESETS,
  type SessionPreset,
} from "@/lib/utils/sessionComparison";
import SessionDeltaCard from "./SessionDeltaCard";
import AlgorithmDiffTable from "./AlgorithmDiffTable";
import SessionEnvironmentComparison from "./SessionEnvironmentComparison";
import EducationalSessionInsights from "./EducationalSessionInsights";
import SessionPresetSelector from "./SessionPresetSelector";
import SessionExportImport from "./SessionExportImport";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BarChart3, LineChart as LineChartIcon, Layers, Sliders, Zap, HelpCircle } from "lucide-react";

interface SessionComparisonVisualizerProps {
  sessionA: BenchmarkSession;
  sessionB: BenchmarkSession;
  sessionALabel?: string;
  sessionBLabel?: string;
  onImportSession?: (session: BenchmarkSession) => void;
}

export default function SessionComparisonVisualizer({
  sessionA: initialSessionA,
  sessionB: initialSessionB,
  sessionALabel = "Session A (Baseline)",
  sessionBLabel = "Session B (Candidate)",
  onImportSession,
}: SessionComparisonVisualizerProps) {
  const [currentSessionA, setCurrentSessionA] = useState<BenchmarkSession>(initialSessionA);
  const [currentSessionB, setCurrentSessionB] = useState<BenchmarkSession>(initialSessionB);
  const [activePresetId, setActivePresetId] = useState<string | undefined>(undefined);
  const [activeMetric, setActiveMetric] = useState<"throughput" | "latency" | "worker" | "memory">("throughput");
  const [activeTab, setActiveTab] = useState<"charts" | "table" | "environment" | "educational">("charts");

  // Keep state synced if props change
  useEffect(() => {
    setCurrentSessionA(initialSessionA);
    setCurrentSessionB(initialSessionB);
  }, [initialSessionA, initialSessionB]);

  const delta = useMemo(
    () => computeSessionComparison(currentSessionA, currentSessionB),
    [currentSessionA, currentSessionB],
  );

  const handleSelectPreset = (preset: SessionPreset) => {
    setCurrentSessionA(preset.sessionA);
    setCurrentSessionB(preset.sessionB);
    setActivePresetId(preset.id);
  };

  // Prepare recharts comparison data
  const chartData = useMemo(() => {
    return delta.algorithmDiffs.map((diff) => ({
      name: diff.cipherName,
      category: diff.category,
      sessionA_ops: diff.opsPerSecA || 0,
      sessionB_ops: diff.opsPerSecB || 0,
      sessionA_time: diff.avgTimeA || 0,
      sessionB_time: diff.avgTimeB || 0,
      sessionA_worker: diff.resultA?.workerExecutionTime || 0,
      sessionB_worker: diff.resultB?.workerExecutionTime || 0,
      sessionA_memory: (diff.resultA?.memoryUsage || 0) / 1024,
      sessionB_memory: (diff.resultB?.memoryUsage || 0) / 1024,
      speedup: diff.speedupFactor || 1,
    }));
  }, [delta]);

  return (
    <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header & Presets */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Interactive Benchmark Module
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Compare Benchmarks Across Sessions
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Analyze throughput speedups, execution latency deltas, thread IPC performance, and hardware acceleration across benchmark runs.
            </p>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
            {[
              { id: "charts", label: "Comparison Charts", icon: BarChart3 },
              { id: "table", label: "Algorithm Diff Grid", icon: Layers },
              { id: "environment", label: "Environmental Specs", icon: Sliders },
              { id: "educational", label: "Educational Insights", icon: HelpCircle },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-white text-teal-700 shadow-sm dark:bg-zinc-800 dark:text-teal-300"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preset Selector */}
        <SessionPresetSelector
          onSelectPreset={handleSelectPreset}
          activePresetId={activePresetId}
        />
      </div>

      {/* Top Cards: Delta Summary */}
      <SessionDeltaCard
        delta={delta}
        sessionALabel={sessionALabel}
        sessionBLabel={sessionBLabel}
      />

      {/* Export / Import Toolbar */}
      <SessionExportImport
        sessionA={currentSessionA}
        sessionB={currentSessionB}
        onImportSession={(imported) => {
          setCurrentSessionB(imported);
          setActivePresetId(undefined);
          if (onImportSession) onImportSession(imported);
        }}
      />

      {/* Main Workspace Tabs */}
      {activeTab === "charts" && (
        <div className="space-y-4">
          {/* Metric selector bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/60">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Select Chart Metric:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "throughput", label: "Throughput (ops/sec)" },
                { id: "latency", label: "Cipher Time (ms)" },
                { id: "worker", label: "Worker RTT (ms)" },
                { id: "memory", label: "Memory Usage (KB)" },
              ].map((metric) => (
                <button
                  key={metric.id}
                  type="button"
                  onClick={() => setActiveMetric(metric.id as any)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    activeMetric === metric.id
                      ? "bg-teal-600 text-white dark:bg-teal-500"
                      : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  {metric.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recharts Bar Chart */}
          <div className="h-80 w-full rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    borderColor: "#334155",
                    borderRadius: "0.75rem",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
                <Bar
                  dataKey={
                    activeMetric === "throughput"
                      ? "sessionA_ops"
                      : activeMetric === "latency"
                        ? "sessionA_time"
                        : activeMetric === "worker"
                          ? "sessionA_worker"
                          : "sessionA_memory"
                  }
                  name={sessionALabel}
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey={
                    activeMetric === "throughput"
                      ? "sessionB_ops"
                      : activeMetric === "latency"
                        ? "sessionB_time"
                        : activeMetric === "worker"
                          ? "sessionB_worker"
                          : "sessionB_memory"
                  }
                  name={sessionBLabel}
                  fill="#0d9488"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "table" && (
        <AlgorithmDiffTable
          algorithmDiffs={delta.algorithmDiffs}
          sessionALabel={sessionALabel}
          sessionBLabel={sessionBLabel}
        />
      )}

      {activeTab === "environment" && (
        <SessionEnvironmentComparison
          sessionA={currentSessionA}
          sessionB={currentSessionB}
          sessionALabel={sessionALabel}
          sessionBLabel={sessionBLabel}
        />
      )}

      {activeTab === "educational" && (
        <EducationalSessionInsights delta={delta} />
      )}
    </div>
  );
}
