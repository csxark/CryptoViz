'use client'

import Link from 'next/link'
import { Shield, BookOpen, Lock, Key, Hash, FileCheck, Award, ChevronRight, CheckCircle } from 'lucide-react'
import { LearningPath } from '@/lib/learning-paths/types'

const ICON_MAP: Record<string, React.ElementType> = {
  Shield,
  BookOpen,
  Lock,
  Key,
  Hash,
  FileCheck,
}

interface PathCardProps {
  path: LearningPath
  progressPercentage: number
  isCompleted: boolean
}

export default function PathCard({ path, progressPercentage, isCompleted }: PathCardProps) {
  const IconComponent = ICON_MAP[path.icon] || Shield

  return (
    <div className={`group relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
      isCompleted
        ? 'border-amber-500/20 bg-slate-900/90 hover:border-amber-500/40 hover:shadow-amber-500/5'
        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:shadow-cyan-500/5'
    }`}>
      <div>
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${path.color} text-slate-950 shadow-lg shadow-cyan-500/10`}>
            <IconComponent className="w-6 h-6" />
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
              {path.difficulty}
            </span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold animate-pulse">
                <CheckCircle className="w-3.5 h-3.5" />
                Completed
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-xl font-bold text-slate-100 group-hover:text-cyan-400 transition-colors mb-2">
          {path.title}
        </h3>

        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          {path.shortDescription}
        </p>
      </div>

      {/* Footer Info */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        {/* Badge Preview */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Award className="w-4 h-4 text-amber-400" />
          <span>Badge: <strong className="text-slate-200">{path.badge.name}</strong></span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Progress</span>
            <span className="text-slate-200 font-bold">{progressPercentage}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isCompleted ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* CTA Link */}
        {isCompleted ? (
          <div className="grid grid-cols-2 gap-2 w-full mt-2">
            <Link
              href={`/learning-paths/${path.id}`}
              className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-slate-100 font-semibold text-xs transition-all"
            >
              <span>Review Path</span>
            </Link>
            <Link
              href={`/learning-paths/${path.id}/certificate`}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all border border-amber-400/20 hover:scale-[1.02]"
            >
              <Award className="w-3.5 h-3.5 fill-slate-950" />
              <span>Certificate</span>
            </Link>
          </div>
        ) : (
          <Link
            href={`/learning-paths/${path.id}`}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-cyan-500/10 border border-slate-700 hover:border-cyan-500/40 text-slate-200 hover:text-cyan-300 font-semibold text-sm transition-all"
          >
            <span>{progressPercentage > 0 ? 'Continue Path' : 'Start Path'}</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </div>
    </div>
  )
}
