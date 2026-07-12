"use client";

interface DocumentationProgressActionsProps {
  title: string;
  isBookmarked: boolean;
  isCompleted: boolean;
  onToggleBookmark: () => void;
  onToggleCompleted: () => void;
}

export function DocumentationProgressActions({
  title,
  isBookmarked,
  isCompleted,
  onToggleBookmark,
  onToggleCompleted,
}: DocumentationProgressActionsProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      aria-label={`Learning actions for ${title}`}
    >
      <button
        type="button"
        onClick={onToggleBookmark}
        aria-pressed={isBookmarked}
        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 ${
          isBookmarked
            ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-300"
            : "border-zinc-300 text-zinc-700 hover:border-amber-400 hover:bg-amber-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-amber-500/10"
        }`}
      >
        <span aria-hidden="true">{isBookmarked ? "★" : "☆"}</span>{" "}
        {isBookmarked ? "Bookmarked" : "Bookmark"}
      </button>

      <button
        type="button"
        onClick={onToggleCompleted}
        aria-pressed={isCompleted}
        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 ${
          isCompleted
            ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "border-zinc-300 text-zinc-700 hover:border-emerald-500 hover:bg-emerald-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-emerald-500/10"
        }`}
      >
        <span aria-hidden="true">{isCompleted ? "✓" : "○"}</span>{" "}
        {isCompleted ? "Completed" : "Mark as completed"}
      </button>
    </div>
  );
}
