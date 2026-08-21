'use client'
import { motion } from 'framer-motion'
import Card from '@/components/ui/Card'

interface CategoryProgressProps { byCategory: Record<string, { total: number; visited: number }> }

const COLORS: Record<string, string> = { Classical: 'bg-violet-500', Symmetric: 'bg-blue-500', Hash: 'bg-orange-500', Asymmetric: 'bg-rose-500', Advanced: 'bg-teal-500' }
const BADGES: Record<string, string> = { Classical: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', Symmetric: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', Hash: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', Asymmetric: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', Advanced: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' }

export default function CategoryProgress({ byCategory }: CategoryProgressProps) {
  return (
    <Card className="dark:bg-zinc-900/40 p-6">
      <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-5">Progress by Category</h2>
      <div className="space-y-4">
        {Object.entries(byCategory).map(([cat, { total, visited }]) => {
          const pct = Math.round((visited / total) * 100)
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${BADGES[cat] ?? 'bg-zinc-100 text-zinc-600'}`}>{cat}</span>
                <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{visited}/{total}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <motion.div className={`h-full rounded-full ${COLORS[cat] ?? 'bg-teal-500'}`}
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }} />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
