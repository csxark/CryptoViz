'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import { ALL_ALGORITHMS, type AlgorithmProgress } from '@/hooks/useProgress'
import Card from '@/components/ui/Card'

interface AlgorithmChecklistProps { visited: Record<string, AlgorithmProgress> }

const CATEGORIES = ['All', 'Classical', 'Symmetric', 'Hash', 'Asymmetric', 'Advanced'] as const
type Filter = (typeof CATEGORIES)[number]

const PILL: Record<string, string> = { Classical: 'border-violet-500/40 text-violet-600 dark:text-violet-400', Symmetric: 'border-blue-500/40 text-blue-600 dark:text-blue-400', Hash: 'border-orange-500/40 text-orange-600 dark:text-orange-400', Asymmetric: 'border-rose-500/40 text-rose-600 dark:text-rose-400', Advanced: 'border-teal-500/40 text-teal-600 dark:text-teal-400' }

export default function AlgorithmChecklist({ visited }: AlgorithmChecklistProps) {
  const [filter, setFilter] = useState<Filter>('All')
  const filtered = ALL_ALGORITHMS.filter(a => filter === 'All' || a.category === filter)
  return (
    <Card className="dark:bg-zinc-900/40 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Algorithm Checklist</h2>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-all ${filter === cat ? 'border-teal-500 bg-teal-500 text-zinc-900' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-teal-500/50 hover:text-teal-500'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.map(algo => {
          const done = Boolean(visited[algo.id])
          return (
            <Link key={algo.id} href={algo.href}
              className={`group flex items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-all ${done ? 'border-teal-500/20 bg-teal-500/5 dark:bg-teal-500/10' : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>
              {done ? <CheckCircle2 size={16} className="shrink-0 text-teal-500" /> : <Circle size={16} className="shrink-0 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400" />}
              <span className={`flex-1 text-sm font-medium truncate ${done ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200'}`}>{algo.name}</span>
              <span className={`shrink-0 rounded-full border text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${PILL[algo.category] ?? 'border-zinc-300 text-zinc-500'}`}>{algo.category}</span>
              <ArrowRight size={11} className="shrink-0 text-zinc-300 dark:text-zinc-600 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
            </Link>
          )
        })}
      </div>
      <p className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-600">Progress is saved locally in your browser.</p>
    </Card>
  )
}
