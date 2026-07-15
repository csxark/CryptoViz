"use client";

import React from 'react';
import type { BenchmarkResult } from "@/types/benchmark";
import { calculateComparison } from "@/lib/utils/benchmark";

interface PerformanceMetricsProps {
  results: BenchmarkResult[];
}

export default React.memo(function PerformanceMetrics({
  results,
}: PerformanceMetricsProps) {
  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500 dark:text-zinc-400">
          No benchmark results yet. Run a benchmark to see metrics.
        </p>
      </div>
    );
  }

  const comparison = calculateComparison(results);

  const summary = [
    {
      label: "Fastest Algorithm",
      value: comparison.fastest.cipherName,
      detail: `${comparison.fastest.averageTime.toFixed(4)} ms/op`,
    },
    {
      label: "Slowest Algorithm",
      value: comparison.slowest.cipherName,
      detail: `${comparison.slowest.averageTime.toFixed(4)} ms/op`,
    },
    {
      label: "Speed Ratio",
      value: `${comparison.speedupRatio.toFixed(2)}x`,
      detail: "fastest compared with slowest",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <article
            key={item.label}
            className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {item.label}
            </p>
            <p className="mt-2 text-xl font-bold text-zinc-900 dark:text-white">
              {item.value}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {item.detail}
            </p>
          </article>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-[1050px] w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              {[
                "Algorithm",
                "Avg Time",
                "Worker Time",
                "Render Time",
                "Min / Max",
                "Std Dev",
                "Ops/Sec",
              ].map((heading) => (
                <th key={heading} className="px-4 py-3 font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {[...results]
              .sort((a, b) => a.averageTime - b.averageTime)
              .map((result) => (
                <tr
                  key={result.cipherId}
                  className="text-zinc-700 dark:text-zinc-300"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-zinc-900 dark:text-white">
                      {result.cipherName}
                    </p>
                    <p className="text-xs capitalize text-zinc-500">
                      {result.category}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {result.averageTime.toFixed(4)} ms
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {result.workerExecutionTime?.toFixed(4) ?? "—"} ms
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {result.renderTime?.toFixed(4) ?? "—"} ms
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {result.minTime.toFixed(4)} / {result.maxTime.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    ±{result.stdDev.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {result.operationsPerSecond.toFixed(0)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
