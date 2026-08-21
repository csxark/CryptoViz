'use client'

import { useState, useRef, useCallback } from 'react'
import type { ChangeEvent } from 'react'
import { X, Download, Upload, Shield, AlertTriangle, FileText } from 'lucide-react'
import type { CipherDirection, CipherStep, CipherMetadata, Encoding } from '../../lib/cipher/types'
import {
  buildLessonPackage,
  downloadLessonPackage,
  parseLessonPackageJson,
  verifyLessonIntegrity,
  type LessonAnnotatedStep,
  type LessonPackage,
  type LessonQuizCheckpoint,
  type LessonMetadata,
} from '../../lib/utils/lessonPackage'

interface LessonPackageModalProps {
  isOpen: boolean
  onClose: () => void
  cipherId: string
  cipherName: string
  direction: CipherDirection
  input: string
  key: string
  options: Record<string, unknown>
  steps: CipherStep[]
  output: string
  outputEncoding: Encoding
  metadata: CipherMetadata
  stepNotes: Record<number, string>
  onLessonImported: (lesson: LessonPackage) => void
}

type ModalTab = 'export' | 'import'

export default function LessonPackageModal({
  isOpen,
  onClose,
  cipherId,
  cipherName,
  direction,
  input,
  key,
  options,
  steps,
  output,
  outputEncoding,
  metadata,
  stepNotes,
  onLessonImported,
}: LessonPackageModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('export')
  const [title, setTitle] = useState(`${cipherName} Lesson`)
  const [author, setAuthor] = useState('')
  const [prerequisites, setPrerequisites] = useState('')
  const [annotatedSteps, setAnnotatedSteps] = useState<LessonAnnotatedStep[]>([])
  const [quizCheckpoints, setQuizCheckpoints] = useState<LessonQuizCheckpoint[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [importedLesson, setImportedLesson] = useState<LessonPackage | null>(null)
  const [integrityStatus, setIntegrityStatus] = useState<'unknown' | 'valid' | 'invalid'>('unknown')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setMessage(null)
    setIsError(false)
    setImportedLesson(null)
    setIntegrityStatus('unknown')
  }, [])

  const handleTabChange = useCallback((tab: ModalTab) => {
    setActiveTab(tab)
    resetState()
  }, [resetState])

  const handleAddAnnotatedStep = useCallback(() => {
    const nextIndex = annotatedSteps.length > 0
      ? Math.max(...annotatedSteps.map((s) => s.stepIndex)) + 1
      : 0
    if (nextIndex >= steps.length) return
    setAnnotatedSteps((prev) => [
      ...prev,
      {
        stepIndex: nextIndex,
        markdownExplanation: '',
        highlightConcepts: [],
      },
    ])
  }, [annotatedSteps, steps.length])

  const handleUpdateAnnotatedStep = useCallback(
    (index: number, field: keyof LessonAnnotatedStep, value: string | string[]) => {
      setAnnotatedSteps((prev) => {
        const updated = [...prev]
        updated[index] = { ...updated[index], [field]: value }
        return updated
      })
    },
    [],
  )

  const handleRemoveAnnotatedStep = useCallback((index: number) => {
    setAnnotatedSteps((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleAddQuizCheckpoint = useCallback(() => {
    const nextIndex = quizCheckpoints.length > 0
      ? Math.max(...quizCheckpoints.map((q) => q.stepIndex)) + 1
      : 0
    if (nextIndex >= steps.length) return
    setQuizCheckpoints((prev) => [
      ...prev,
      {
        stepIndex: nextIndex,
        question: '',
        options: ['', ''],
        correctOptionIndex: 0,
        explanation: '',
      },
    ])
  }, [quizCheckpoints, steps.length])

  const handleUpdateQuizCheckpoint = useCallback(
    (index: number, field: keyof LessonQuizCheckpoint, value: unknown) => {
      setQuizCheckpoints((prev) => {
        const updated = [...prev]
        updated[index] = { ...updated[index], [field]: value } as LessonQuizCheckpoint
        return updated
      })
    },
    [],
  )

  const handleRemoveQuizCheckpoint = useCallback((index: number) => {
    setQuizCheckpoints((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleExport = useCallback(() => {
    if (!title.trim()) {
      setIsError(true)
      setMessage('A lesson title is required.')
      return
    }

    const lesson: LessonPackage = buildLessonPackage({
      metadata: {
        title: title.trim(),
        author: author.trim() || 'Anonymous',
        targetCipher: cipherId,
        prerequisites: prerequisites
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean),
        createdAt: new Date().toISOString(),
      },
      executionContext: {
        algorithmId: cipherId,
        key,
        input,
        options: options as Record<string, string | number | boolean>,
        direction,
      },
      annotatedSteps,
      quizCheckpoints,
      steps,
      output,
      outputEncoding,
      stepNotes,
    })

    downloadLessonPackage(lesson)
    setIsError(false)
    setMessage('Lesson package exported successfully.')
  }, [title, author, cipherId, prerequisites, annotatedSteps, quizCheckpoints, steps, input, key, options, direction, output, outputEncoding, stepNotes])

  const handleImportFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return

      if (file.size > 10 * 1024 * 1024) {
        setIsError(true)
        setMessage('Lesson files must be smaller than 10 MB.')
        return
      }

      try {
        const result = parseLessonPackageJson(await file.text())
        if (!result.success) {
          setIsError(true)
          setMessage(result.error)
          setImportedLesson(null)
          setIntegrityStatus('invalid')
          return
        }

        setImportedLesson(result.lesson)
        const valid = verifyLessonIntegrity(result.lesson)
        setIntegrityStatus(valid ? 'valid' : 'invalid')

        if (!valid) {
          setIsError(true)
          setMessage('Integrity check failed — the lesson file may have been tampered with.')
          return
        }

        setIsError(false)
        setMessage('Lesson package loaded and verified.')
      } catch {
        setIsError(true)
        setMessage('The lesson file could not be read.')
        setImportedLesson(null)
        setIntegrityStatus('invalid')
      }
    },
    [],
  )

  const handleApplyImport = useCallback(() => {
    if (!importedLesson) return
    onLessonImported(importedLesson)
    onClose()
  }, [importedLesson, onLessonImported, onClose])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose],
  )

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-modal-title"
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <h2 id="lesson-modal-title" className="text-lg font-bold text-zinc-900 dark:text-white">
              Lesson Package
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Export annotated lessons or import .cryptoviz files.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close lesson package modal"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800/80">
          <button
            type="button"
            onClick={() => handleTabChange('export')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all ${
              activeTab === 'export'
                ? 'bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            Export Lesson
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('import')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all ${
              activeTab === 'import'
                ? 'bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Import Lesson
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {activeTab === 'export' ? (
            <>
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Lesson Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    placeholder="e.g. AES Key Expansion Walkthrough"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Author
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    placeholder="Your name or alias"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Prerequisites (comma-separated cipher IDs)
                  </label>
                  <input
                    type="text"
                    value={prerequisites}
                    onChange={(e) => setPrerequisites(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    placeholder="e.g. caesar, vigenere"
                  />
                </div>
              </div>

              {/* Step Annotations */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Step Annotations ({annotatedSteps.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddAnnotatedStep}
                    disabled={annotatedSteps.length >= steps.length}
                    className="rounded-md bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
                  >
                    + Add Annotation
                  </button>
                </div>
                {annotatedSteps.length === 0 && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    No step annotations yet. Add explanations for specific steps.
                  </p>
                )}
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {annotatedSteps.map((as, i) => (
                    <div key={i} className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                          Step {as.stepIndex + 1}: {steps[as.stepIndex]?.label ?? 'Unknown'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAnnotatedStep(i)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                      <textarea
                        value={as.markdownExplanation}
                        onChange={(e) => handleUpdateAnnotatedStep(i, 'markdownExplanation', e.target.value)}
                        rows={2}
                        className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                        placeholder="Markdown explanation for this step..."
                      />
                      <input
                        type="text"
                        value={as.highlightConcepts.join(', ')}
                        onChange={(e) =>
                          handleUpdateAnnotatedStep(
                            i,
                            'highlightConcepts',
                            e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          )
                        }
                        className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                        placeholder="Key concepts (comma-separated)"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Quiz Checkpoints */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Quiz Checkpoints ({quizCheckpoints.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddQuizCheckpoint}
                    disabled={quizCheckpoints.length >= steps.length}
                    className="rounded-md bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
                  >
                    + Add Quiz
                  </button>
                </div>
                {quizCheckpoints.length === 0 && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    No quiz checkpoints yet. Add questions at key moments.
                  </p>
                )}
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {quizCheckpoints.map((qc, i) => (
                    <div key={i} className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          Quiz at Step {qc.stepIndex + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuizCheckpoint(i)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        type="text"
                        value={qc.question}
                        onChange={(e) => handleUpdateQuizCheckpoint(i, 'question', e.target.value)}
                        className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                        placeholder="Question text..."
                      />
                      <div className="mt-2 space-y-1">
                        {qc.options.map((opt, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`quiz-${i}`}
                              checked={qc.correctOptionIndex === j}
                              onChange={() => handleUpdateQuizCheckpoint(i, 'correctOptionIndex', j)}
                              className="h-3 w-3 accent-teal-600"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOptions = [...qc.options]
                                newOptions[j] = e.target.value
                                handleUpdateQuizCheckpoint(i, 'options', newOptions)
                              }}
                              className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                              placeholder={`Option ${j + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={qc.explanation}
                        onChange={(e) => handleUpdateQuizCheckpoint(i, 'explanation', e.target.value)}
                        className="mt-2 w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                        placeholder="Explanation (shown after answering)..."
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleExport}
                disabled={steps.length === 0}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-teal-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Download className="h-4 w-4" />
                Export .cryptoviz Lesson
              </button>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 p-6 text-center dark:bg-zinc-950/40">
                <FileText className="mx-auto h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Select a .cryptoviz lesson file
                </p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  Maximum file size: 10 MB
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition-colors"
                >
                  Browse Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".cryptoviz,application/json"
                  className="sr-only"
                  onChange={handleImportFile}
                  aria-label="Import lesson package"
                />
              </div>

              {importedLesson && (
                <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                        {importedLesson.metadata.title}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        by {importedLesson.metadata.author} &middot; {importedLesson.steps.length} steps &middot;{' '}
                        {importedLesson.quizCheckpoints.length} quizzes
                      </p>
                    </div>
                    {integrityStatus === 'valid' ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <Shield className="h-3 w-3" />
                        Verified
                      </span>
                    ) : integrityStatus === 'invalid' ? (
                      <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
                        <AlertTriangle className="h-3 w-3" />
                        Tampered
                      </span>
                    ) : null}
                  </div>

                  {importedLesson.annotatedSteps.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        Annotations:
                      </p>
                      <ul className="mt-1 space-y-1">
                        {importedLesson.annotatedSteps.map((as, i) => (
                          <li key={i} className="text-xs text-zinc-600 dark:text-zinc-300">
                            Step {as.stepIndex + 1}: {as.markdownExplanation.slice(0, 80)}
                            {as.markdownExplanation.length > 80 ? '...' : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleApplyImport}
                    className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-teal-500 hover:to-cyan-500 transition-all"
                  >
                    <Upload className="h-4 w-4" />
                    Load Lesson & Start Playing
                  </button>
                </div>
              )}
            </>
          )}

          {message && (
            <p
              role={isError ? 'alert' : 'status'}
              className={`text-xs ${
                isError
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
