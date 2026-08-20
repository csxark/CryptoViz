'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Shield,
  AlertTriangle,
  BookOpen,
  HelpCircle,
} from 'lucide-react'
import type { LessonPackage, LessonAnnotatedStep, LessonQuizCheckpoint } from '../../lib/utils/lessonPackage'

interface LessonPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  lesson: LessonPackage
  onStepNavigate: (stepIndex: number) => void
}

type PlayerMode = 'annotating' | 'quizzing'

interface QuizAnswerState {
  selected: number | null
  submitted: boolean
}

export default function LessonPlayerModal({
  isOpen,
  onClose,
  lesson,
  onStepNavigate,
}: LessonPlayerModalProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playerMode, setPlayerMode] = useState<PlayerMode>('annotating')
  const [quizState, setQuizState] = useState<QuizAnswerState>({ selected: null, submitted: false })
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const totalSteps = lesson.steps.length
  const currentStep = lesson.steps[currentStepIdx]

  const currentAnnotation = lesson.annotatedSteps.find((a) => a.stepIndex === currentStepIdx)
  const currentQuiz = lesson.quizCheckpoints.find((q) => q.stepIndex === currentStepIdx)
  const hasAnnotation = !!currentAnnotation
  const hasQuiz = !!currentQuiz

  const goToStep = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(totalSteps - 1, idx))
      setCurrentStepIdx(clamped)
      setQuizState({ selected: null, submitted: false })
      setPlayerMode('annotating')
      onStepNavigate(clamped)
    },
    [totalSteps, onStepNavigate],
  )

  const handleNext = useCallback(() => {
    if (currentStepIdx < totalSteps - 1) {
      setCompletedSteps((prev) => new Set(prev).add(currentStepIdx))
      goToStep(currentStepIdx + 1)
    } else {
      setIsPlaying(false)
      setCompletedSteps((prev) => new Set(prev).add(currentStepIdx))
    }
  }, [currentStepIdx, totalSteps, goToStep])

  const handlePrev = useCallback(() => {
    if (currentStepIdx > 0) {
      goToStep(currentStepIdx - 1)
    }
  }, [currentStepIdx, goToStep])

  const handlePlayToggle = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentStepIdx((prev) => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false)
            return prev
          }
          setCompletedSteps((p) => new Set(p).add(prev))
          onStepNavigate(prev + 1)
          setQuizState({ selected: null, submitted: false })
          setPlayerMode('annotating')
          return prev + 1
        })
      }, 2500)
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
        playIntervalRef.current = null
      }
    }
  }, [isPlaying, totalSteps, onStepNavigate])

  useEffect(() => {
    if (hasQuiz && isPlaying) {
      setIsPlaying(false)
      setPlayerMode('quizzing')
    }
  }, [currentStepIdx, hasQuiz, isPlaying])

  const handleQuizSelect = useCallback((idx: number) => {
    if (quizState.submitted) return
    setQuizState((prev) => ({ ...prev, selected: idx }))
  }, [quizState.submitted])

  const handleQuizSubmit = useCallback(() => {
    if (quizState.selected === null) return
    setQuizState((prev) => ({ ...prev, submitted: true }))
  }, [quizState.selected])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === ' ') {
        e.preventDefault()
        handlePlayToggle()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, handleNext, handlePrev, handlePlayToggle])

  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [])

  if (!isOpen) return null

  const progress = totalSteps > 0 ? ((currentStepIdx + 1) / totalSteps) * 100 : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-player-title"
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 rounded-t-2xl">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <h2 id="lesson-player-title" className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                {lesson.metadata.title}
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              by {lesson.metadata.author} &middot; Step {currentStepIdx + 1} of {totalSteps}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              <Shield className="h-3 w-3" />
              Verified
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close lesson player"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step content */}
        <div className="p-5 space-y-4">
          {/* Current step info */}
          {currentStep && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                    Step {currentStepIdx + 1}
                  </span>
                  <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">
                    {currentStep.label}
                  </h3>
                  {currentStep.sublabel && (
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {currentStep.sublabel}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {completedSteps.has(currentStepIdx) && (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  )}
                  {currentStep.isMilestone && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-2xs font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                      Milestone
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white p-2 dark:bg-zinc-900">
                  <span className="text-zinc-400 dark:text-zinc-500">Input</span>
                  <p className="mt-0.5 font-mono text-zinc-700 dark:text-zinc-300 break-all">
                    {currentStep.inputState.slice(0, 80)}
                    {currentStep.inputState.length > 80 ? '...' : ''}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-2 dark:bg-zinc-900">
                  <span className="text-zinc-400 dark:text-zinc-500">Output</span>
                  <p className="mt-0.5 font-mono text-zinc-700 dark:text-zinc-300 break-all">
                    {currentStep.outputState.slice(0, 80)}
                    {currentStep.outputState.length > 80 ? '...' : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Annotation panel */}
          {hasAnnotation && playerMode === 'annotating' && (
            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900/50 dark:bg-teal-950/20">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                  Instructor Annotation
                </span>
              </div>
              <div className="text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {currentAnnotation.markdownExplanation}
              </div>
              {currentAnnotation.highlightConcepts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {currentAnnotation.highlightConcepts.map((concept) => (
                    <span
                      key={concept}
                      className="rounded-full bg-teal-100 px-2.5 py-0.5 text-2xs font-semibold text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quiz panel */}
          {hasQuiz && playerMode === 'quizzing' && currentQuiz && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  Test Your Understanding
                </span>
              </div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-3">
                {currentQuiz.question}
              </p>
              <div className="space-y-2">
                {currentQuiz.options.map((opt, i) => {
                  const isSelected = quizState.selected === i
                  const isCorrect = i === currentQuiz.correctOptionIndex
                  const showResult = quizState.submitted

                  let borderColor = 'border-zinc-200 dark:border-zinc-700'
                  let bgColor = 'bg-white dark:bg-zinc-900'
                  if (showResult && isCorrect) {
                    borderColor = 'border-emerald-400 dark:border-emerald-600'
                    bgColor = 'bg-emerald-50 dark:bg-emerald-950/30'
                  } else if (showResult && isSelected && !isCorrect) {
                    borderColor = 'border-red-400 dark:border-red-600'
                    bgColor = 'bg-red-50 dark:bg-red-950/30'
                  } else if (isSelected) {
                    borderColor = 'border-teal-400 dark:border-teal-600'
                    bgColor = 'bg-teal-50 dark:bg-teal-950/30'
                  }

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleQuizSelect(i)}
                      disabled={quizState.submitted}
                      className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-all ${borderColor} ${bgColor} disabled:cursor-default`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 dark:border-zinc-600 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                        {showResult && isCorrect ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : showResult && isSelected && !isCorrect ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          String.fromCharCode(65 + i)
                        )}
                      </span>
                      <span className="text-zinc-700 dark:text-zinc-200">{opt}</span>
                    </button>
                  )
                })}
              </div>

              {quizState.submitted && currentQuiz.explanation && (
                <div className="mt-3 rounded-lg bg-white/80 p-3 text-xs text-zinc-600 dark:bg-zinc-900/80 dark:text-zinc-300">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">Explanation: </span>
                  {currentQuiz.explanation}
                </div>
              )}

              {!quizState.submitted && (
                <button
                  type="button"
                  onClick={handleQuizSubmit}
                  disabled={quizState.selected === null}
                  className="mt-3 w-full rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Submit Answer
                </button>
              )}
            </div>
          )}

          {/* Step note from original lesson */}
          {lesson.stepNotes[currentStepIdx] && (
            <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
              <span className="text-2xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Original Note
              </span>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                {lesson.stepNotes[currentStepIdx]}
              </p>
            </div>
          )}
        </div>

        {/* Transport controls */}
        <div className="sticky bottom-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 rounded-b-2xl">
          {/* Step dots */}
          <div className="flex items-center justify-center gap-1 mb-3 overflow-x-auto pb-1">
            {lesson.steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goToStep(i)}
                className={`h-2 w-2 rounded-full transition-all shrink-0 ${
                  i === currentStepIdx
                    ? 'bg-teal-500 scale-125'
                    : completedSteps.has(i)
                      ? 'bg-teal-300 dark:bg-teal-700'
                      : 'bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStepIdx === 0}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              aria-label="Previous step"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePlayToggle}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-500/30 hover:bg-teal-500 transition-colors"
                aria-label={isPlaying ? 'Pause auto-play' : 'Resume auto-play'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </button>
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentStepIdx === totalSteps - 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              aria-label="Next step"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between text-2xs text-zinc-400 dark:text-zinc-500">
            <span>{Math.round(progress)}% complete</span>
            <span>
              {completedSteps.size}/{totalSteps} steps
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
