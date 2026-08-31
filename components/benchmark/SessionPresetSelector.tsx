"use client";

import { DEFAULT_SESSION_PRESETS, type SessionPreset } from "@/lib/utils/comparison";
import { Sparkles, ArrowRight } from "lucide-react";

interface SessionPresetSelectorProps {
  onSelectPreset: (preset: SessionPreset) => void;
  activePresetId?: string;
}

export default function SessionPresetSelector({
  onSelectPreset,
  activePresetId,
}: SessionPresetSelectorProps) {
  return (
    <div className="rounded-xl border border-teal-200/80 bg-teal-50/40 p-4 dark:border-teal-900/50 dark:bg-teal-950/20">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-300">
          Educational Benchmark Comparison Presets
        </h4>
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
        Select a preset scenario to instantly explore hardware acceleration, payload scaling, and concurrency deltas.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {DEFAULT_SESSION_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`group flex flex-col justify-between rounded-lg border p-3 text-left transition-all ${
                isActive
                  ? "border-teal-500 bg-white shadow-sm ring-2 ring-teal-500/20 dark:bg-zinc-900"
                  : "border-zinc-200 bg-white hover:border-teal-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90 dark:hover:border-teal-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                    {preset.badge}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-600 dark:group-hover:text-teal-400" />
                </div>
                <h5 className="font-semibold text-xs text-zinc-900 dark:text-white line-clamp-1">
                  {preset.title}
                </h5>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  {preset.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
