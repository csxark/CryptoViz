'use client'

import { useState } from 'react'
import { BookOpen, Search, Sparkles, Award } from 'lucide-react'
import { LEARNING_PATHS } from '@/lib/learning-paths/data'
import { useLearningPath } from '@/lib/hooks/useLearningPath'
import ResumeBanner from '@/components/learning-paths/ResumeBanner'
import RecommendationCard from '@/components/learning-paths/RecommendationCard'
import PathCard from '@/components/learning-paths/PathCard'

export default function LearningPathsPage() {
  const {
    isLoaded,
    getPathProgressPercentage,
    getOverallProgress,
    getLastActiveLessonDetails,
    getRecommendedNextLesson,
    resetProgress,
    progress,
  } = useLearningPath()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center text-slate-400">
        Loading Interactive Learning Paths...
      </div>
    )
  }

  const overall = getOverallProgress()
  const lastActiveDetails = getLastActiveLessonDetails()
  const recommendation = getRecommendedNextLesson()

  const categories = ['All', ...Array.from(new Set(LEARNING_PATHS.map((p) => p.category)))]

  const filteredPaths = LEARNING_PATHS.filter((path) => {
    const matchesSearch =
      path.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      path.shortDescription.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || path.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Page Header */}
        <div className="space-y-4 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Guided Educational Curriculum</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-100">
            Interactive Learning Paths
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-3xl leading-relaxed">
            Step-by-step cryptographic paths designed for all experience levels. Explore concepts, test your knowledge with interactive quizzes, and launch live visualizers.
          </p>
        </div>

        {/* Overall Progress Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-400">Overall Progress</div>
            <div className="text-2xl font-black text-cyan-400">{overall.percentage}%</div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-400">Lessons Completed</div>
            <div className="text-2xl font-black text-emerald-400">
              {overall.totalCompleted} <span className="text-sm font-normal text-slate-500">/ {overall.totalLessons}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-400">Completed Paths</div>
            <div className="text-2xl font-black text-indigo-400">
              {overall.completedPathsCount} <span className="text-sm font-normal text-slate-500">/ {LEARNING_PATHS.length}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-400">Certificates & Badges</div>
            <div className="text-2xl font-black text-amber-400 flex items-center gap-1.5">
              <Award className="w-5 h-5 text-amber-400" />
              <span>{overall.completedPathsCount}</span>
            </div>
          </div>
        </div>

        {/* Resume Banner & Next Lesson Recommendation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResumeBanner lastActiveDetails={lastActiveDetails} onReset={resetProgress} />
          <RecommendationCard recommendation={recommendation} />
        </div>

        {/* Filter & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search paths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        {/* Path Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPaths.map((path) => {
            const pct = getPathProgressPercentage(path.id)
            const pathCompleted = !!progress.completedPaths[path.id]

            return (
              <PathCard
                key={path.id}
                path={path}
                progressPercentage={pct}
                isCompleted={pathCompleted}
              />
            )
          })}
        </div>

        {filteredPaths.length === 0 && (
          <div className="text-center py-16 p-6 rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-400 space-y-2">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <div className="text-base font-bold text-slate-200">No learning paths match your filter</div>
            <p className="text-xs text-slate-500">Try clearing your search query or choosing another category.</p>
          </div>
        )}
      </div>
    </div>
  )
}
