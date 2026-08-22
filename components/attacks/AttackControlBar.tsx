'use client'

interface AttackControlBarProps {
  running: boolean
  canPrevious: boolean
  canNext: boolean
  onPlay: () => void
  onPause: () => void
  onPrevious: () => void
  onNext: () => void
  onReset?: () => void
  disabled?: boolean
}
export default function AttackControlBar({
  running, canPrevious, canNext, onPlay, onPause, onPrevious, onNext, onReset, disabled,
}: AttackControlBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <button onClick={running ? onPause : onPlay} disabled={disabled || (!running && !canNext)}
        className="rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {running ? 'Pause' : 'Play'}
      </button>
      <button onClick={onPrevious} disabled={disabled || !canPrevious}
        className="rounded-md border px-3 py-2 text-sm disabled:opacity-40">Step Previous</button>
      <button onClick={onNext} disabled={disabled || !canNext}
        className="rounded-md border px-3 py-2 text-sm disabled:opacity-40">Step Next</button>
      {onReset && <button onClick={onReset} disabled={disabled}
        className="rounded-md border px-3 py-2 text-sm disabled:opacity-40">Reset</button>}
    </div>
  )
}
