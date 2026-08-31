'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/footer'
import Breadcrumbs from '@/components/layout/Breadcrumbs'
import StatsCard from '@/components/dashboard/StatsCard'
import CategoryProgress from '@/components/dashboard/CategoryProgress'
import RecentActivity from '@/components/dashboard/RecentActivity'
import AlgorithmChecklist from '@/components/dashboard/AlgorithmChecklist'
import StreakCalendar from '@/components/dashboard/StreakCalendar'
import Bookmarks from '@/components/dashboard/Bookmarks'
import OverallProgress from '@/components/dashboard/OverallProgress'
import { useProgress } from '@/hooks/useProgress'
import { Trophy, Target, CheckCircle2, Flame, RotateCcw, AlertTriangle } from 'lucide-react'

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-64 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-64 rounded-xl bg-zinc-100 dark:bg-zinc-800 lg:col-span-2" />
      </div>
    </div>
  )
}

function ResetModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Handle accessibility close trigger on Escape keydown
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Focus Trap Base implementation: Force contextual focus inside container
    modalRef.current?.focus();

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-dialog-title"
      aria-describedby="reset-dialog-description"
      ref={modalRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm outline-none"
    >
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-rose-500/10 p-2"><AlertTriangle size={20} className="text-rose-500" /></div>
          <h2 id="reset-dialog-title" className="font-bold text-zinc-900 dark:text-zinc-50">Reset All Progress?</h2>
        </div>
        <p id="reset-dialog-description" className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">This will permanently erase your algorithm visits, challenge stats, streaks, and bookmarks. This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 transition-colors">Reset Progress</button>
        </div>
      </div>
    </div>
  )
}

function DashboardContent() {
  const { progress, hydrated, visitedCount, totalAlgorithms, completionPct, byCategory, accuracy, recentAlgorithms, toggleBookmark, resetProgress } = useProgress()
  const [showReset, setShowReset] = useState(false)

  if (!hydrated) return <DashboardSkeleton />

  const { challenges, bookmarks } = progress
  const handleRemoveBookmark = (id: string) => {
    const bm = bookmarks.find(b => b.id === id)
    if (bm) toggleBookmark({ id: bm.id, title: bm.title, href: bm.href })
  }

  return (
    <>
      {showReset && <ResetModal onConfirm={() => { resetProgress(); setShowReset(false) }} onCancel={() => setShowReset(false)} />}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <Breadcrumbs items={[{ label: 'Dashboard' }]} />
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-50/50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-teal-700 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-400">Learning Progress</div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">Your Dashboard</h1>
          <p className="mt-2 max-w-lg text-sm text-zinc-500 dark:text-zinc-400">Track your cryptography learning journey — algorithms explored, challenge accuracy, and streaks — all stored locally in your browser.</p>
        </div>
        <button onClick={() => setShowReset(true)} className="self-start sm:self-auto inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:border-rose-500/40 hover:text-rose-500 transition-all">
          <RotateCcw size={13} /> Reset Progress
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <StatsCard label="Explored" value={visitedCount} sub={`of ${totalAlgorithms} algorithms`} icon={CheckCircle2} accent />
        <StatsCard label="Completion" value={`${completionPct}%`} sub="of full curriculum" icon={Trophy} />
        <StatsCard label="Challenge Accuracy" value={`${accuracy}%`} sub={`${challenges.totalCorrect}/${challenges.totalAttempted} correct`} icon={Target} />
        <StatsCard label="Current Streak" value={challenges.currentStreak} sub={`best: ${challenges.longestStreak} days`} icon={Flame} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <OverallProgress pct={completionPct} visited={visitedCount} total={totalAlgorithms} />
        <div className="lg:col-span-2"><CategoryProgress byCategory={byCategory} /></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <StreakCalendar currentStreak={challenges.currentStreak} longestStreak={challenges.longestStreak} lastActiveAt={progress.lastActiveAt} joinedAt={progress.joinedAt} />
        <RecentActivity recentAlgorithms={recentAlgorithms} />
      </div>

      <div className="mb-6"><Bookmarks bookmarks={bookmarks} onRemove={handleRemoveBookmark} /></div>
      <AlgorithmChecklist visited={progress.algorithms} />
      <p className="mt-8 text-center text-xs text-zinc-400 dark:text-zinc-600">All progress data is stored locally in your browser using <code className="font-mono">localStorage</code>. Nothing is sent to any server.</p>
    </>
  )
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-[#09090B] dark:text-[#F5F5F5] font-sans antialiased">
      <Navbar />
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-teal-500/[0.04] blur-3xl dark:bg-teal-500/[0.06]" />
      </div>
      <main id="main-content" className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)]" />
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
