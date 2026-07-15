"use client";

import type { BenchmarkSession } from "@/types/benchmark";
import { formatBytes } from "@/lib/utils/benchmarkHistory";

interface BenchmarkHistoryProps {
  sessions: BenchmarkSession[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onClear: () => void;
}

function average(values: Array<number | undefined>): number | undefined {
  const valid = values.filter((value): value is number => value !== undefined);
  if (!valid.length) return undefined;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export default function BenchmarkHistory({
  sessions,
  selectedIds,
  onSelectedIdsChange,
  onClear,
}: BenchmarkHistoryProps) {
  const selected = sessions.filter((session) =>
    selectedIds.includes(session.id),
  );

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectedIdsChange(selectedIds.filter((value) => value !== id));
      return;
    }
    onSelectedIdsChange([...selectedIds, id].slice(-2));
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Benchmark History
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Stored locally in this browser. Select up to two sessions to
            compare.
          </p>
        </div>
        {sessions.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
          >
            Clear history
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Completed benchmark sessions will appear here.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => {
            const isSelected = selectedIds.includes(session.id);
            const averageTime = average(
              session.results.map((result) => result.averageTime),
            );
            return (
              <button
                type="button"
                key={session.id}
                onClick={() => toggle(session.id)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  isSelected
                    ? "border-teal-500 bg-teal-50 dark:bg-teal-950/20"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {new Date(session.timestamp).toLocaleString()}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">
                    {session.results.length} algorithms
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <div>
                    <dt>Input</dt>
                    <dd className="font-mono text-zinc-800 dark:text-zinc-200">
                      {formatBytes(session.inputSize)}
                    </dd>
                  </div>
                  <div>
                    <dt>Iterations</dt>
                    <dd className="font-mono text-zinc-800 dark:text-zinc-200">
                      {session.iterations ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Mean cipher time</dt>
                    <dd className="font-mono text-zinc-800 dark:text-zinc-200">
                      {averageTime?.toFixed(4) ?? "—"} ms
                    </dd>
                  </div>
                  <div>
                    <dt>CPU threads</dt>
                    <dd className="font-mono text-zinc-800 dark:text-zinc-200">
                      {session.deviceInfo.hardwareConcurrency}
                    </dd>
                  </div>
                </dl>
              </button>
            );
          })}
        </div>
      )}

      {selected.length === 2 && (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3 text-left">Metric</th>
                {selected.map((session) => (
                  <th key={session.id} className="px-4 py-3 text-left">
                    {new Date(session.timestamp).toLocaleString()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {[
                [
                  "Algorithms",
                  (s: BenchmarkSession) => String(s.results.length),
                ],
                [
                  "Input size",
                  (s: BenchmarkSession) => formatBytes(s.inputSize),
                ],
                [
                  "Iterations",
                  (s: BenchmarkSession) => String(s.iterations ?? "—"),
                ],
                [
                  "Mean cipher time",
                  (s: BenchmarkSession) =>
                    `${average(s.results.map((r) => r.averageTime))?.toFixed(4) ?? "—"} ms`,
                ],
                [
                  "Mean worker time",
                  (s: BenchmarkSession) =>
                    `${average(s.results.map((r) => r.workerExecutionTime))?.toFixed(4) ?? "—"} ms`,
                ],
                [
                  "Mean render time",
                  (s: BenchmarkSession) =>
                    `${average(s.results.map((r) => r.renderTime))?.toFixed(4) ?? "—"} ms`,
                ],
              ].map(([label, getter]) => (
                <tr key={label as string}>
                  <th className="px-4 py-3 text-left font-medium">
                    {label as string}
                  </th>
                  {selected.map((session) => (
                    <td key={session.id} className="px-4 py-3 font-mono">
                      {(getter as (session: BenchmarkSession) => string)(
                        session,
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
