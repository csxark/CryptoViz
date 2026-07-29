"use client";

import type { VisualizationSnapshot, ComponentCategory } from "@/lib/utils/visualizationSnapshots";
import { Sparkles, Layers, Shield, Cpu, Clock, Layout } from "lucide-react";

interface SnapshotPresetSelectorProps {
  snapshots: VisualizationSnapshot[];
  selectedSnapshotId: string;
  onSelectSnapshot: (snapshot: VisualizationSnapshot) => void;
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function SnapshotPresetSelector({
  snapshots,
  selectedSnapshotId,
  onSelectSnapshot,
  activeCategory,
  onCategoryChange,
}: SnapshotPresetSelectorProps) {
  const categories: Array<{ id: string; label: string; icon: any }> = [
    { id: "all", label: "All Components", icon: Layers },
    { id: "classical", label: "Classical Ciphers", icon: Shield },
    { id: "symmetric", label: "Symmetric Ciphers", icon: Cpu },
    { id: "kdf", label: "KDF & Hashes", icon: Clock },
    { id: "layout", label: "Layout & UI", icon: Layout },
  ];

  const filteredSnapshots = snapshots.filter(
    (s) => activeCategory === "all" || s.category === activeCategory,
  );

  return (
    <div className="space-y-4">
      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-teal-600 text-white shadow-sm dark:bg-teal-500"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Snapshot Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSnapshots.map((snapshot) => {
          const isSelected = selectedSnapshotId === snapshot.id;
          const isPass = snapshot.status === "pass";

          return (
            <button
              key={snapshot.id}
              type="button"
              onClick={() => onSelectSnapshot(snapshot)}
              className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? "border-teal-500 bg-teal-50/50 shadow-sm ring-2 ring-teal-500/20 dark:bg-teal-950/30"
                  : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {snapshot.componentName}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                      isPass
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                    }`}
                  >
                    {snapshot.status}
                  </span>
                </div>

                <h4 className="font-semibold text-xs text-zinc-900 dark:text-white line-clamp-1">
                  {snapshot.title}
                </h4>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  {snapshot.stateDescription}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-[10px] text-zinc-400 dark:border-zinc-800">
                <span className="capitalize">Category: {snapshot.category}</span>
                <span>{new Date(snapshot.capturedAt).toLocaleDateString()}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
