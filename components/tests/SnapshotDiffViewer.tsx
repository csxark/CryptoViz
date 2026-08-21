"use client";

import type { SnapshotDiffResult } from "@/lib/utils/visualizationSnapshots";
import { CheckCircle, AlertTriangle, FileCode } from "lucide-react";
import Card from "@/components/ui/Card";

interface SnapshotDiffViewerProps {
  diffResult: SnapshotDiffResult;
  componentName: string;
  _title: string;
}

export default function SnapshotDiffViewer({
  diffResult,
  componentName,
  _title,
}: SnapshotDiffViewerProps) {
  return (
    <Card className="overflow-hidden">
      {/* Diff Header Banner */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <span className="font-semibold text-sm text-zinc-900 dark:text-white">
            DOM Structure Snapshot Diff: <span className="font-mono text-teal-600 dark:text-teal-400">{componentName}</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {diffResult.isMatch ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle className="h-3.5 w-3.5" />
              100% MATCH PASS
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              DIFF DETECTED (+{diffResult.addedCount} / -{diffResult.removedCount})
            </span>
          )}
        </div>
      </div>

      {/* Line-by-Line Code Diff */}
      <div className="max-h-96 overflow-y-auto bg-zinc-950 p-4 font-mono text-xs text-zinc-300">
        {diffResult.lines.map((line, idx) => {
          const isAdded = line.type === "added";
          const isRemoved = line.type === "removed";

          return (
            <div
              key={`line-${line.lineNumber}-${line.type}`}
              className={`flex items-start gap-3 py-0.5 px-2 font-mono leading-relaxed transition-colors ${
                isAdded
                  ? "bg-emerald-950/70 text-emerald-300 font-semibold"
                  : isRemoved
                    ? "bg-rose-950/70 text-rose-300 font-semibold"
                    : "text-zinc-400 hover:bg-zinc-900"
              }`}
            >
              <span className="w-8 shrink-0 select-none text-right opacity-40 text-[11px]">
                {line.lineNumber}
              </span>
              <span className="w-4 select-none font-bold">
                {isAdded ? "+" : isRemoved ? "-" : " "}
              </span>
              <span className="break-all whitespace-pre-wrap">{line.content}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
