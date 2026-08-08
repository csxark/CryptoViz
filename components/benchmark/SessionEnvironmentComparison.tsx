"use client";

import type { BenchmarkSession } from "@/types/benchmark";
import { formatBytes } from "@/lib/utils/benchmarkHistory";
import { Cpu, HardDrive, Globe, Monitor, Gauge, ShieldCheck, Layers } from "lucide-react";

interface SessionEnvironmentComparisonProps {
  sessionA: BenchmarkSession;
  sessionB: BenchmarkSession;
  sessionALabel?: string;
  sessionBLabel?: string;
}

export default function SessionEnvironmentComparison({
  sessionA,
  sessionB,
  sessionALabel = "Session A",
  sessionBLabel = "Session B",
}: SessionEnvironmentComparisonProps) {
  const envRows = [
    {
      icon: Gauge,
      label: "Timestamp / Date",
      valA: new Date(sessionA.timestamp).toLocaleString(),
      valB: new Date(sessionB.timestamp).toLocaleString(),
    },
    {
      icon: Cpu,
      label: "Hardware Concurrency (CPU Threads)",
      valA: `${sessionA.deviceInfo.hardwareConcurrency} logical cores`,
      valB: `${sessionB.deviceInfo.hardwareConcurrency} logical cores`,
      highlightDiff:
        sessionA.deviceInfo.hardwareConcurrency !==
        sessionB.deviceInfo.hardwareConcurrency,
    },
    {
      icon: HardDrive,
      label: "Input Size (Payload)",
      valA: formatBytes(sessionA.inputSize),
      valB: formatBytes(sessionB.inputSize),
      highlightDiff: sessionA.inputSize !== sessionB.inputSize,
    },
    {
      icon: Layers,
      label: "Iterations per Cipher",
      valA: sessionA.iterations ? `${sessionA.iterations} runs` : "—",
      valB: sessionB.iterations ? `${sessionB.iterations} runs` : "—",
      highlightDiff: sessionA.iterations !== sessionB.iterations,
    },
    {
      icon: ShieldCheck,
      label: "Algorithms Evaluated",
      valA: `${sessionA.results.length} ciphers`,
      valB: `${sessionB.results.length} ciphers`,
    },
    {
      icon: Monitor,
      label: "Device Memory (RAM)",
      valA: sessionA.deviceInfo.deviceMemory
        ? `${sessionA.deviceInfo.deviceMemory} GB`
        : "N/A",
      valB: sessionB.deviceInfo.deviceMemory
        ? `${sessionB.deviceInfo.deviceMemory} GB`
        : "N/A",
    },
    {
      icon: Globe,
      label: "User Agent / Runtime",
      valA: sessionA.deviceInfo.userAgent || "Browser Context",
      valB: sessionB.deviceInfo.userAgent || "Browser Context",
      isTruncated: true,
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 bg-zinc-50/80 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950/80">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
          Environmental Context & Session Parameters
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Comparing hardware specs, execution parameters, and browser contexts between sessions.
        </p>
      </div>

      <div className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
        <div className="grid grid-cols-12 bg-zinc-50 px-5 py-3 font-semibold text-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-400">
          <div className="col-span-4">Parameter</div>
          <div className="col-span-4">{sessionALabel}</div>
          <div className="col-span-4">{sessionBLabel}</div>
        </div>

        {envRows.map((row, idx) => {
          const Icon = row.icon;
          return (
            <div
              key={row.label} // static list, label is unique
              className={`grid grid-cols-12 items-center px-5 py-3 transition-colors ${
                row.highlightDiff
                  ? "bg-teal-50/50 dark:bg-teal-950/20"
                  : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
              }`}
            >
              <div className="col-span-4 flex items-center gap-2 font-medium text-zinc-800 dark:text-zinc-200">
                <Icon className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="truncate">{row.label}</span>
              </div>
              <div className={`col-span-4 font-mono text-xs text-zinc-700 dark:text-zinc-300 ${row.isTruncated ? "truncate pr-2" : ""}`}>
                {row.valA}
              </div>
              <div className={`col-span-4 font-mono text-xs font-semibold text-zinc-900 dark:text-white ${row.isTruncated ? "truncate" : ""}`}>
                {row.valB}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
