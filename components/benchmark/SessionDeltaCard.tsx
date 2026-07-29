"use client";

import type { SessionDelta } from "@/lib/utils/sessionComparison";
import { formatBytes } from "@/lib/utils/benchmarkHistory";
import { Zap, Clock, Cpu, HardDrive, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SessionDeltaCardProps {
  delta: SessionDelta;
  sessionALabel?: string;
  sessionBLabel?: string;
}

export default function SessionDeltaCard({
  delta,
  sessionALabel = "Baseline (Session A)",
  sessionBLabel = "Candidate (Session B)",
}: SessionDeltaCardProps) {
  const isSpeedup = delta.speedupRatio >= 1.02;
  const isSlowdown = delta.speedupRatio <= 0.98;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Metric 1: Overall Speedup Ratio */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Speedup Ratio (B / A)
          </span>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              isSpeedup
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                : isSlowdown
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                  : "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
            }`}
          >
            <Zap className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-3xl font-extrabold text-zinc-900 dark:text-white">
            {delta.speedupRatio.toFixed(2)}x
          </span>
          <span
            className={`flex items-center text-xs font-bold ${
              isSpeedup
                ? "text-emerald-600 dark:text-emerald-400"
                : isSlowdown
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {isSpeedup ? (
              <TrendingUp className="mr-0.5 h-3.5 w-3.5" />
            ) : isSlowdown ? (
              <TrendingDown className="mr-0.5 h-3.5 w-3.5" />
            ) : (
              <Minus className="mr-0.5 h-3.5 w-3.5" />
            )}
            {delta.throughputDeltaPercent > 0 ? "+" : ""}
            {delta.throughputDeltaPercent.toFixed(1)}%
          </span>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 truncate">
          Average throughput relative performance
        </p>
      </div>

      {/* Metric 2: Cipher Time Delta */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Mean Execution Time
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
            <Clock className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-3xl font-extrabold text-zinc-900 dark:text-white">
            {delta.meanTimeDeltaMs > 0 ? "+" : ""}
            {delta.meanTimeDeltaMs.toFixed(3)} ms
          </span>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 truncate">
          Delta in average per-cipher compute duration
        </p>
      </div>

      {/* Metric 3: Worker IPC Overhead Delta */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Worker RTT Delta
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Cpu className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-3xl font-extrabold text-zinc-900 dark:text-white">
            {delta.workerTimeDeltaMs > 0 ? "+" : ""}
            {delta.workerTimeDeltaMs.toFixed(3)} ms
          </span>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 truncate">
          Web Worker postMessage serialization difference
        </p>
      </div>

      {/* Metric 4: Memory Usage Delta */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Memory Growth Delta
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
            <HardDrive className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-3xl font-extrabold text-zinc-900 dark:text-white">
            {delta.memoryDeltaBytes > 0 ? "+" : ""}
            {formatBytes(Math.abs(delta.memoryDeltaBytes))}
          </span>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 truncate">
          {delta.memoryDeltaBytes <= 0 ? "Lower memory footprint" : "Higher memory allocation"}
        </p>
      </div>
    </div>
  );
}
