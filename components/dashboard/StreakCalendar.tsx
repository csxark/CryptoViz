'use client'
import { Flame } from 'lucide-react'
import Card from '@/components/ui/Card'

interface StreakCalendarProps { currentStreak: number; longestStreak: number; lastActiveAt: string; joinedAt: string }

function getLast30Days(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i)); return d.toISOString().slice(0, 10)
  })
}

export default function StreakCalendar({ currentStreak, longestStreak, lastActiveAt, joinedAt }: StreakCalendarProps) {
  const days = getLast30Days()
  const joinDate = joinedAt.slice(0, 10)
  const lastDate = lastActiveAt.slice(0, 10)
  const activeDays = new Set(Array.from({ length: currentStreak }, (_, i) => {
    const d = new Date(lastDate); d.setDate(d.getDate() - i); return d.toISOString().slice(0, 10)
  }))
  const isStreakActive = lastDate === new Date().toISOString().slice(0, 10)
  return (
    <Card className="dark:bg-zinc-900/40 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Learning Streak</h2>
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${isStreakActive ? 'bg-orange-500/10' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
          <Flame size={14} className={isStreakActive ? 'text-orange-500' : 'text-zinc-400'} />
          <span className={`text-sm font-bold tabular-nums ${isStreakActive ? 'text-orange-500' : 'text-zinc-400'}`}>{currentStreak} day{currentStreak !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
        {days.map(day => {
          const active = activeDays.has(day)
          const isToday = day === new Date().toISOString().slice(0, 10)
          const beforeJoin = day < joinDate
          return (
            <div key={day} title={day}
              className={`aspect-square rounded-sm transition-colors ${beforeJoin ? 'bg-zinc-50 dark:bg-zinc-900' : active ? 'bg-teal-500' : 'bg-zinc-100 dark:bg-zinc-800'} ${isToday ? 'ring-1 ring-teal-500 ring-offset-1 dark:ring-offset-zinc-900' : ''}`} />
          )
        })}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
        <span>30 days ago</span>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-zinc-200 dark:bg-zinc-700" /><span>None</span>
          <span className="ml-2 h-2 w-2 rounded-sm bg-teal-500" /><span>Active</span>
        </div>
        <span>Today</span>
      </div>
      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>Longest streak</span>
        <span className="font-bold text-zinc-700 dark:text-zinc-300 tabular-nums">{longestStreak} day{longestStreak !== 1 ? 's' : ''}</span>
      </div>
    </Card>
  )
}
