"use client";

import React from "react";

export type ChartMetricId = "throughput" | "latency" | "worker" | "memory";

export interface MetricSelectorProps {
  activeMetric: ChartMetricId;
  onMetricChange: (metric: ChartMetricId) => void;
}

const METRICS: { id: ChartMetricId; label: string }[] = [
  { id: "throughput", label: "Throughput (ops/sec)" },
  { id: "latency", label: "Cipher Time (ms)" },
  { id: "worker", label: "Worker RTT (ms)" },
  { id: "memory", label: "Memory Usage (KB)" },
];

export default function MetricSelector({
  activeMetric,
  onMetricChange,
}: MetricSelectorProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/60">
      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        Select Chart Metric:
      </span>
      <div className="flex flex-wrap gap-2">
        {METRICS.map((metric) => {
          const isActive = activeMetric === metric.id;
          return (
            <button
              key={metric.id}
              type="button"
              onClick={() => onMetricChange(metric.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-teal-600 text-white dark:bg-teal-500"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {metric.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
