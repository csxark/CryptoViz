'use client'

import { motion } from 'motion/react'
import type { Resource } from '../../content/resources'

const typeColors: Record<Resource['type'], string> = {
  book: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  video: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  tool: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  paper: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  course: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
}

const difficultyColors: Record<Resource['difficulty'], string> = {
  beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  intermediate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

interface ResourceCardProps {
  resource: Resource
}

export default function ResourceCard({ resource }: ResourceCardProps) {
  return (
    <motion.a
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4 }}
      className="group flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
          {resource.title}
        </h3>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
            typeColors[resource.type]
          }`}
        >
          {resource.type}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {resource.description}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        {resource.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          >
            {tag}
          </span>
        ))}
        <span
          className={`ml-auto rounded-md px-2 py-0.5 text-xs font-medium ${
            difficultyColors[resource.difficulty]
          }`}
        >
          {resource.difficulty}
        </span>
        {resource.duration && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {resource.duration}
          </span>
        )}
      </div>
    </motion.a>
  )
}
