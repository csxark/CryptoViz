'use client'
interface SkeletonCardProps {
  /** Number of shimmering placeholder lines inside the output box. Default: 2 */
  lines?: number
  /** Whether to show the bottom "duration" row skeleton. Default: true */
  showFooter?: boolean
  /** Optional extra classes on the outer wrapper */
  className?: string
}

export default function SkeletonCard({
  lines = 2,
  showFooter = true,
  className = '',
}: SkeletonCardProps) {
  return (
    <div
      role="status"
      aria-label="Loading result"
      className={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 ${className}`}
    >
      {/* Label row skeleton (matches the uppercase category label) */}
      <div className="h-3 w-32 rounded-full bg-zinc-200/80 dark:bg-zinc-800 shimmer" />

      {/* Output box skeleton (matches min-h-[48px] output container) */}
      <div className="mt-2 min-h-[48px] rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950/40">
        <div className="flex flex-col gap-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="h-3.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 shimmer"
              style={{ width: i === lines - 1 ? '60%' : '90%' }}
            />
          ))}
        </div>
      </div>

      {/* Footer skeleton (matches the "Off-thread Execution time" row) */}
      {showFooter && (
        <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <div className="h-3 w-28 rounded-full bg-zinc-200/80 dark:bg-zinc-800 shimmer" />
          <div className="h-3 w-14 rounded-full bg-zinc-200/80 dark:bg-zinc-800 shimmer" />
        </div>
      )}

      <span className="sr-only">Loading…</span>

      {/* Shimmer keyframes (works in both light and dark mode since
          it animates opacity/gradient position, not color) */}
      <style>{`
        .shimmer {
          position: relative;
          overflow: hidden;
        }
        .shimmer::after {
          content: '';
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0,
            rgba(255, 255, 255, 0.55) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          animation: shimmer 1.6s infinite;
        }
        .dark .shimmer::after {
          background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0,
            rgba(255, 255, 255, 0.08) 50%,
            rgba(255, 255, 255, 0) 100%
          );
        }
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .shimmer::after {
            animation: none;
          }
          .shimmer {
            animation: pulse 1.8s ease-in-out infinite;
          }
          @keyframes pulse {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        }
      `}</style>
    </div>
  )
}
