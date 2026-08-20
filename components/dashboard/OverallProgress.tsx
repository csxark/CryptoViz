'use client'
import { motion } from 'framer-motion'
import Card from '@/components/ui/Card'

interface OverallProgressProps { pct: number; visited: number; total: number }

export default function OverallProgress({ pct, visited, total }: OverallProgressProps) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const dash = (pct / 100) * circumference
  return (
    <Card className="dark:bg-zinc-900/40 p-6 flex flex-col items-center justify-center gap-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 self-start">Overall Progress</h2>
      <div className="relative flex items-center justify-center">
        <svg width="140" height="140" className="-rotate-90">
          <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="10" className="stroke-zinc-100 dark:stroke-zinc-800" />
          <motion.circle cx="70" cy="70" r={radius} fill="none" strokeWidth="10" strokeLinecap="round" className="stroke-teal-500"
            strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - dash }} transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }} />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{pct}%</span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">complete</span>
        </div>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        <span className="font-bold text-zinc-800 dark:text-zinc-200">{visited}</span> of <span className="font-bold text-zinc-800 dark:text-zinc-200">{total}</span> algorithms explored
      </p>
    </Card>
  )
}
