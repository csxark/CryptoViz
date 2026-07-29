'use client'

import { useEffect, useState, useId } from 'react'
import {
  STEP_NOTE_MAX_LENGTH,
  type StepAnnotation,
} from '../../lib/utils/stepAnnotations'

interface StepNotesProps {
  stepLabel: string
  annotation?: StepAnnotation
  onToggleBookmark: () => void
  onSaveNote: (note: string) => void
  onDeleteNote: () => void
}

export default function StepNotes({
  stepLabel,
  annotation,
  onToggleBookmark,
  onSaveNote,
  onDeleteNote,
}: StepNotesProps) {
  const [draft, setDraft] = useState(annotation?.note ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const noteId = useId()

  useEffect(() => {
    setDraft(annotation?.note ?? '')
    setMessage(null)
  }, [annotation?.note, stepLabel])

  const handleSave = () => {
    onSaveNote(draft)
    setMessage(draft.trim() ? 'Note saved locally.' : 'Empty note removed.')
  }

  const handleDelete = () => {
    onDeleteNote()
    setDraft('')
    setMessage('Note removed.')
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
            Personal step notes
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Private to this browser and never added to shared step links.
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleBookmark}
          aria-pressed={annotation?.bookmarked ?? false}
          aria-label={
            annotation?.bookmarked
              ? `Remove bookmark from ${stepLabel}`
              : `Bookmark ${stepLabel}`
          }
          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
            annotation?.bookmarked
              ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
              : 'border-zinc-300 text-zinc-600 hover:border-amber-300 hover:text-amber-700 dark:border-zinc-700 dark:text-zinc-300'
          }`}
        >
          {annotation?.bookmarked ? '★ Bookmarked' : '☆ Bookmark step'}
        </button>
      </div>

      <label htmlFor={noteId} className="mt-4 grid gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
        Note for “{stepLabel}”
        <textarea
          id={noteId}
          value={draft}
          maxLength={STEP_NOTE_MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write an observation, reminder, or explanation..."
          rows={4}
          className="w-full resize-y rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm font-normal text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-white"
        />
      </label>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-zinc-400">
          {draft.length}/{STEP_NOTE_MAX_LENGTH}
        </span>

        <div className="flex gap-2">
          {annotation?.note && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              Delete note
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-500"
          >
            Save note
          </button>
        </div>
      </div>

      {message && (
        <p role="status" className="mt-3 text-xs text-teal-700 dark:text-teal-400">
          {message}
        </p>
      )}
    </section>
  )
}
