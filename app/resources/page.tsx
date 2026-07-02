'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Navbar from '../../components/layout/Navbar'
import ResourceCard from '../../components/resources/ResourceCard'
import ResourceFilters from '../../components/resources/ResourceFilters'
import { RESOURCES } from '../../content/resources'

export default function ResourcesPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'book' | 'video' | 'tool' | 'paper' | 'course'>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all')
  const [tagFilter, setTagFilter] = useState('')

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    RESOURCES.forEach((r) => r.tags.forEach((t) => tags.add(t)))
    return Array.from(tags).sort()
  }, [])

  const filtered = useMemo(() => {
    return RESOURCES.filter((r) => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.description.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      if (typeFilter !== 'all' && r.type !== typeFilter) return false
      if (difficultyFilter !== 'all' && r.difficulty !== difficultyFilter) return false
      if (tagFilter && !r.tags.includes(tagFilter)) return false
      return true
    })
  }, [search, typeFilter, difficultyFilter, tagFilter])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans transition-colors duration-300">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            Learning Resources
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Curated books, courses, tools, papers, and videos to deepen your cryptography knowledge.
          </p>
        </motion.div>

        <div className="mt-8">
          <ResourceFilters
            search={search}
            onSearchChange={setSearch}
            typeFilter={typeFilter}
            onTypeChange={setTypeFilter}
            difficultyFilter={difficultyFilter}
            onDifficultyChange={setDifficultyFilter}
            tagFilter={tagFilter}
            onTagChange={setTagFilter}
            allTags={allTags}
          />
        </div>

        <motion.div layout className="mt-8">
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Showing {filtered.length} of {RESOURCES.length} resources
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </AnimatePresence>
          </div>

          {filtered.length === 0 && (
            <div className="mt-16 text-center">
              <p className="text-zinc-500 dark:text-zinc-400">No resources match your filters.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
