"use client";

import type { ModuleLoadMetrics } from "@/lib/utils/dynamicCipherLoader";
import { formatBytes } from "@/lib/utils/benchmarkHistory";
import { Cpu, HardDrive, Clock, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface ModuleLoadMetricsCardProps {
  metrics: ModuleLoadMetrics;
}

export default function ModuleLoadMetricsCard({
  metrics,
}: ModuleLoadMetricsCardProps) {
  const isReady = metrics.status === "ready";
  const isLoading = metrics.status === "loading";
  const isError = metrics.status === "error";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            Dynamic Module Telemetry
          </span>
          <h4 className="font-semibold text-sm text-zinc-900 dark:text-white truncate max-w-[200px]">
            {metrics.cipherName}
          </h4>
        </div>

        <div className="flex items-center gap-1.5">
          {isReady ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="h-3 w-3" />
              INSTANTIATED
            </span>
          ) : isLoading ? (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <Loader2 className="h-3 w-3 animate-spin" />
              LOADING...
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              UNLOADED
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <div>
          <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 font-sans">
            <Clock className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            Init Latency
          </span>
          <p className="mt-1 font-mono font-bold text-zinc-900 dark:text-white">
            {metrics.initializationTimeMs} ms
          </p>
        </div>

        <div>
          <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 font-sans">
            <HardDrive className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            Bundle Size
          </span>
          <p className="mt-1 font-mono font-bold text-zinc-900 dark:text-white">
            {formatBytes(metrics.bundleSizeBytes)}
          </p>
        </div>

        <div>
          <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 font-sans">
            <Cpu className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            RAM Allocation
          </span>
          <p className="mt-1 font-mono font-bold text-zinc-900 dark:text-white">
            {formatBytes(metrics.memoryUsageBytes)}
          </p>
        </div>
      </div>
    </div>
  );
}
