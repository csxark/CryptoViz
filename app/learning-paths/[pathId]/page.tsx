'use client'

import { use } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle,
  Play,
  Award,
  Clock,
  Shield,
  BookOpen,
  Lock,
  Key,
  Hash,
  FileCheck,
} from 'lucide-react'
import { getLearningPathById } from '@/lib/learning-paths/data'
import { useLearningPath } from '@/lib/hooks/useLearningPath'

const ICON_MAP: Record<string, React.ElementType> = {
  Shield,
  BookOpen,
  Lock,
  Key,
  Hash,
  FileCheck,
}

export default function PathDetailPage({ params }: { params: Promise<{ pathId: string }> }) {
  const resolvedParams = use(params)
  const path = getLearningPathById(resolvedParams.pathId)

  const { progress, getPathProgressPercentage, markLessonComplete } = useLearningPath()

  if (!path) {
    notFound()
  }

  const IconComponent = ICON_MAP[path.icon] || Shield
  const progressPercentage = getPathProgressPercentage(path.id)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Back Link */}
        <Link
          href="/learning-paths"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Learning Paths</span>
        </Link>

        {/* Path Completed Celebratory Banner */}
        {progressPercentage === 100 && (
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-yellow-500/5 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-amber-500/5">
            <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
              <div className="p-4 rounded-2xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 shrink-0">
                <Award className="w-8 h-8 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-amber-300">Path Fully Completed!</h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                  Congratulations! You have mastered all topics in <strong className="text-slate-200">{path.title}</strong> and unlocked your digital certificate of completion.
                </p>
              </div>
            </div>
            <Link
              href={`/learning-paths/${path.id}/certificate`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all border border-amber-400/20 hover:scale-[1.02] shrink-0"
            >
              <Award className="w-4 h-4 fill-slate-950" />
              <span>Claim Certificate</span>
            </Link>
          </div>
        )}

        {/* Path Hero Header */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 p-8 sm:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${path.color} text-slate-950`}>
                  <IconComponent className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider">
                  {path.difficulty} • {path.category}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100">{path.title}</h1>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl">
                {path.fullDescription}
              </p>
            </div>

            {/* Badge Card */}
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-center space-y-2 shrink-0 min-w-[200px]">
              <Award className="w-8 h-8 text-amber-400 mx-auto" />
              <div className="text-xs font-bold text-amber-300">{path.badge.name}</div>
              <p className="text-[11px] text-amber-200/80 leading-tight">{path.badge.description}</p>
            </div>
          </div>

          {/* Progress Bar Header */}
          <div className="pt-6 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Path Completion</span>
              <span className="text-slate-200 font-bold">{progressPercentage}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Lessons List Roadmap */}
        <div className="space-y-6">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <span>Curriculum Lessons ({path.lessons.length})</span>
          </h2>

          <div className="space-y-4">
            {path.lessons.map((lesson, idx) => {
              const lessonKey = `${path.id}:${lesson.id}`
              const isLessonDone = !!progress.completedLessons[lessonKey]

              return (
                <div
                  key={lesson.id}
                  className={`p-6 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${
                    isLessonDone
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isLessonDone
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 border border-slate-700 text-slate-300'
                      }`}
                    >
                      {isLessonDone ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-100">{lesson.title}</h3>
                        <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" />
                          {lesson.duration}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-400">{lesson.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <button
                      onClick={() => markLessonComplete(path.id, lesson.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        isLessonDone
                          ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                          : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isLessonDone ? 'Completed' : 'Mark Done'}
                    </button>

                    <Link
                      href={`/learning-paths/${path.id}/${lesson.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-slate-950" />
                      <span>{isLessonDone ? 'Review' : 'Start'}</span>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
