import Link from 'next/link'
import { Clock, ArrowRight } from 'lucide-react'
import { type AlgorithmProgress, ALL_ALGORITHMS } from '@/hooks/useProgress'
import Card from '@/components/ui/Card'

interface RecentActivityProps { recentAlgorithms: AlgorithmProgress[] }

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const DOT: Record<string, string> = { Classical: 'bg-violet-500', Symmetric: 'bg-blue-500', Hash: 'bg-orange-500', Asymmetric: 'bg-rose-500', Advanced: 'bg-teal-500' }

export default function RecentActivity({ recentAlgorithms }: RecentActivityProps) {
  if (recentAlgorithms.length === 0) {
    return (
      <Card className="dark:bg-zinc-900/40 p-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-5">Recent Activity</h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock size={32} className="text-zinc-300 dark:text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No algorithms explored yet.</p>
          <Link href="/visualizer/caesar/" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-500 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-teal-400 transition-colors">
            Start with Caesar Cipher <ArrowRight size={12} />
          </Link>
        </div>
      </Card>
    )
  }
  return (
    <Card className="dark:bg-zinc-900/40 p-6">
      <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-5">Recent Activity</h2>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {recentAlgorithms.map(algo => {
          const meta = ALL_ALGORITHMS.find(a => a.id === algo.id)
          return (
            <li key={algo.id}>
              <Link href={meta?.href ?? '#'} className="group flex items-center justify-between gap-4 py-3 transition-colors hover:text-teal-500">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[algo.category] ?? 'bg-zinc-400'}`} />
                  <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-teal-500 transition-colors">{algo.name}</span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{algo.category}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs tabular-nums text-zinc-400">{timeAgo(algo.lastVisitedAt)}</span>
                  <ArrowRight size={12} className="text-zinc-300 dark:text-zinc-600 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
