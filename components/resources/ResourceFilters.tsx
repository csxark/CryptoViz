'use client'

import { motion } from 'motion/react'
import { clsx } from 'clsx'
import type { Resource } from '../../content/resources'

const TYPES: (Resource['type'] | 'all')[] = ['all', 'book', 'video', 'tool', 'paper', 'course']
const DIFFICULTIES: (Resource['difficulty'] | 'all')[] = ['all', 'beginner', 'intermediate', 'advanced']

interface ResourceFiltersProps {
  search: string
  onSearchChange: (val: string) => void
  typeFilter: Resource['type'] | 'all'
  onTypeChange: (val: Resource['type'] | 'all') => void
  difficultyFilter: Resource['difficulty'] | 'all'
  onDifficultyChange: (val: Resource['difficulty'] | 'all') => void
  tagFilter: string
  onTagChange: (val: string) => void
  allTags: string[]
}

const btnBase =
  'rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors'
const btnActive =
  'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
const btnInactive =
  'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'

export default function ResourceFilters({
  search,
  onSearchChange,
  typeFilter,
  onTypeChange,
  difficultyFilter,
  onDifficultyChange,
  tagFilter,
  onTagChange,
  allTags,
}: ResourceFiltersProps) {
  return (
    <motion.div
      layout
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <input
        type="text"
        placeholder="Search resources..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-teal-400"
      />

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Type
        </span>
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => onTypeChange(t)}
              className={clsx(btnBase, typeFilter === t ? btnActive : btnInactive)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Level
        </span>
        <div className="flex flex-wrap gap-1.5">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => onDifficultyChange(d)}
              className={clsx(btnBase, difficultyFilter === d ? btnActive : btnInactive)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Tag
        </span>
        <select
          value={tagFilter}
          onChange={(e) => onTagChange(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:border-teal-400"
        >
          <option value="">All tags</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>
    </motion.div>
  )
}
