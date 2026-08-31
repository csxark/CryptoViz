
'use client'
import type { CipherWorkerProgress } from '@/hooks/useCipherWorker'

interface WorkerProgressBarProps {
  progress: CipherWorkerProgress | null
  label?: string
}
export default function WorkerProgressBar({ progress, label = 'Calculating' }: WorkerProgressBarProps) {
  if (!progress) return null
  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/70 p-3 dark:border-teal-900 dark:bg-teal-950/20" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-teal-800 dark:text-teal-200">
        <span>{progress.currentMilestone || label}</span>
        <span className="font-mono">{progress.percent}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-teal-100 dark:bg-teal-950">
        <div className="h-full rounded-full bg-teal-600 transition-[width] duration-100 ease-out dark:bg-teal-400" style={{ width: `${progress.percent}%` }} />
      </div>
    </div>
  )
}
