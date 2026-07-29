"use client";

import { useState, useMemo } from "react";
import type { AlgorithmDiff } from "@/lib/utils/sessionComparison";
import { Search, ArrowUpDown, Shield, Cpu, Activity } from "lucide-react";

interface AlgorithmDiffTableProps {
  algorithmDiffs: AlgorithmDiff[];
  sessionALabel?: string;
  sessionBLabel?: string;
}

type SortField = "cipherName" | "category" | "opsPerSecA" | "opsPerSecB" | "speedupFactor" | "avgTimeDeltaMs";
type SortOrder = "asc" | "desc";

export default function AlgorithmDiffTable({
  algorithmDiffs,
  sessionALabel = "Session A",
  sessionBLabel = "Session B",
}: AlgorithmDiffTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("speedupFactor");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    return algorithmDiffs
      .filter((diff) => {
        const matchesSearch =
          diff.cipherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          diff.cipherId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory =
          categoryFilter === "all" || diff.category === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        let valA: number | string = 0;
        let valB: number | string = 0;

        switch (sortField) {
          case "cipherName":
            valA = a.cipherName;
            valB = b.cipherName;
            break;
          case "category":
            valA = a.category;
            valB = b.category;
            break;
          case "opsPerSecA":
            valA = a.opsPerSecA ?? -1;
            valB = b.opsPerSecA ?? -1;
            break;
          case "opsPerSecB":
            valA = a.opsPerSecB ?? -1;
            valB = b.opsPerSecB ?? -1;
            break;
          case "speedupFactor":
            valA = a.speedupFactor ?? -1;
            valB = b.speedupFactor ?? -1;
            break;
          case "avgTimeDeltaMs":
            valA = a.avgTimeDeltaMs ?? 0;
            valB = b.avgTimeDeltaMs ?? 0;
            break;
        }

        if (typeof valA === "string" && typeof valB === "string") {
          return sortOrder === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        return sortOrder === "asc"
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      });
  }, [algorithmDiffs, searchTerm, categoryFilter, sortField, sortOrder]);

  return (
    <div className="space-y-4">
      {/* Controls: Search and Category Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search cipher algorithm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-4 py-2 text-sm text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {["all", "classical", "symmetric", "asymmetric", "hash", "kdf"].map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                  categoryFilter === cat
                    ? "bg-teal-600 text-white dark:bg-teal-500"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                {cat}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Comparison Grid Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            <tr>
              <th
                onClick={() => handleSort("cipherName")}
                className="cursor-pointer px-4 py-3.5 hover:text-teal-600 dark:hover:text-teal-400"
              >
                <div className="flex items-center gap-1.5">
                  <span>Algorithm</span>
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </div>
              </th>
              <th
                onClick={() => handleSort("category")}
                className="cursor-pointer px-4 py-3.5 hover:text-teal-600 dark:hover:text-teal-400"
              >
                Category
              </th>
              <th
                onClick={() => handleSort("opsPerSecA")}
                className="cursor-pointer px-4 py-3.5 text-right hover:text-teal-600 dark:hover:text-teal-400"
              >
                {sessionALabel} (ops/s)
              </th>
              <th
                onClick={() => handleSort("opsPerSecB")}
                className="cursor-pointer px-4 py-3.5 text-right hover:text-teal-600 dark:hover:text-teal-400"
              >
                {sessionBLabel} (ops/s)
              </th>
              <th
                onClick={() => handleSort("speedupFactor")}
                className="cursor-pointer px-4 py-3.5 text-center hover:text-teal-600 dark:hover:text-teal-400"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Speedup Delta</span>
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </div>
              </th>
              <th
                onClick={() => handleSort("avgTimeDeltaMs")}
                className="cursor-pointer px-4 py-3.5 text-right hover:text-teal-600 dark:hover:text-teal-400"
              >
                Avg Latency (ms)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  No algorithms match the selected search or filter criteria.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((diff) => {
                const isFaster = diff.status === "faster";
                const isSlower = diff.status === "slower";
                const isSimilar = diff.status === "similar";

                return (
                  <tr
                    key={diff.cipherId}
                    className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                  >
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{diff.cipherName}</span>
                        {diff.resultB?.implementation && (
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono font-normal text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {diff.resultB.implementation}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs capitalize text-zinc-500 dark:text-zinc-400">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 font-medium ${
                          diff.category === "classical"
                            ? "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
                            : diff.category === "symmetric"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                              : diff.category === "asymmetric"
                                ? "bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300"
                                : diff.category === "hash"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                        }`}
                      >
                        {diff.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      {diff.opsPerSecA !== null
                        ? diff.opsPerSecA.toLocaleString(undefined, {
                            maximumFractionDigits: 1,
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-zinc-900 dark:text-white">
                      {diff.opsPerSecB !== null
                        ? diff.opsPerSecB.toLocaleString(undefined, {
                            maximumFractionDigits: 1,
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {diff.speedupFactor !== null ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold font-mono ${
                            isFaster
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : isSlower
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {diff.speedupFactor.toFixed(2)}x
                          {diff.opsPerSecDeltaPercent !== null && (
                            <span className="text-[10px] opacity-80">
                              ({diff.opsPerSecDeltaPercent > 0 ? "+" : ""}
                              {diff.opsPerSecDeltaPercent.toFixed(0)}%)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {diff.avgTimeA !== null && diff.avgTimeB !== null ? (
                        <div>
                          <span>
                            {diff.avgTimeB.toFixed(3)} ms
                          </span>
                          <div className="text-[10px] text-zinc-400">
                            vs {diff.avgTimeA.toFixed(3)} ms
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
