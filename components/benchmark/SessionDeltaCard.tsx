"use client";

import type { SessionDelta } from "@/lib/utils/comparison";
import { getMetricBg, getMetricTextColor } from "@/lib/utils/comparison";
import { formatBytes } from "@/lib/utils/benchmarkHistory";
import { SPEEDUP_THRESHOLD, SLOWDOWN_THRESHOLD } from "@/constants/benchmark";
import { Zap, Clock, Cpu, HardDrive, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Card from "@/components/ui/Card";

interface SessionDeltaCardProps {
  delta: SessionDelta;
}

export default function SessionDeltaCard({
  delta,
}: SessionDeltaCardProps) {
  const isSpeedup = delta.speedupRatio >= SPEEDUP_THRESHOLD;
  const isSlowdown = delta.speedupRatio <= SLOWDOWN_THRESHOLD;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Metric 1: Overall Speedup Ratio */}
      <Card className="p-5 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Speedup Ratio (B / A)
          </span>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${getMetricBg(
              isSpeedup,
              isSlowdown
            )}`}
          >
            <Zap className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-3xl font-extrabold text-zinc-900 dark:text-white">
            {delta.speedupRatio.toFixed(2)}x
          </span>
          <span
            className={`flex items-center text-xs font-bold ${getMetricTextColor(
              isSpeedup,
              isSlowdown
            )}`}
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
      </Card>

      {/* Metric 2: Cipher Time Delta */}
      <Card className="p-5 transition-all hover:shadow-md">
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
      </Card>

      {/* Metric 3: Worker IPC Overhead Delta */}
      <Card className="p-5 transition-all hover:shadow-md">
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
      </Card>

      {/* Metric 4: Memory Usage Delta */}
      <Card className="p-5 transition-all hover:shadow-md">
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
      </Card>
    </div>
  );
}
