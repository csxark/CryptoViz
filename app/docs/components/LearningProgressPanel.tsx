"use client";

interface LearningProgressPanelProps {
  completedCount: number;
  bookmarkedCount: number;
  totalCount: number;
  percent: number;
  onClear: () => void;
}

export function LearningProgressPanel({
  completedCount,
  bookmarkedCount,
  totalCount,
  percent,
  onClear,
}: LearningProgressPanelProps) {
  const hasProgress = completedCount > 0 || bookmarkedCount > 0;

  return (
    <section
      aria-labelledby="learning-progress-title"
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="learning-progress-title"
            className="text-sm font-bold text-zinc-900 dark:text-white"
          >
            My Learning Progress
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Saved only in this browser.
          </p>
        </div>

        {hasProgress && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
          >
            Clear progress
          </button>
        )}
      </div>

      <div className="mt-4" aria-label={`${percent}% documentation completed`}>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {completedCount} of {totalCount} completed
          </span>
          <span className="font-mono text-teal-700 dark:text-teal-400">
            {percent}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-teal-500 transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-950/60">
          <p className="text-lg font-bold text-zinc-900 dark:text-white">
            {bookmarkedCount}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Bookmarked</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-950/60">
          <p className="text-lg font-bold text-zinc-900 dark:text-white">
            {completedCount}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Completed</p>
        </div>
      </div>
    </section>
  );
}
