'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MDXRemote } from 'next-mdx-remote'
import type { MDXRemoteSerializeResult } from 'next-mdx-remote'
import type { DocMeta } from '../../content/docs'
import DocTOC from './DocTOC'
import DocCallout from './DocCallout'

interface SerializedDoc extends DocMeta {
  serialized: MDXRemoteSerializeResult
}

interface DocsShellProps {
  docs: SerializedDoc[]
}

const components = {
  Callout: DocCallout,
}

export default function DocsShell({ docs }: DocsShellProps) {
  const [selectedDoc, setSelectedDoc] = useState<SerializedDoc | null>(null)

  const categories = ['General', 'Ciphers'] as const

  if (selectedDoc) {
    return (
      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:px-8">
        <article className="min-w-0 flex-1">
          <button
            onClick={() => setSelectedDoc(null)}
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to docs
          </button>

          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <MDXRemote {...selectedDoc.serialized} components={components} />
          </div>
        </article>

        <DocTOC />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
          Documentation
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          Learn the fundamentals of cryptography and how each algorithm works.
        </p>
      </motion.div>

      {categories.map((cat) => {
        const catDocs = docs.filter((d) => d.category === cat)
        if (catDocs.length === 0) return null

        return (
          <motion.section
            key={cat}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12"
          >
            <h2 className="mb-6 text-xl font-bold text-zinc-800 dark:text-zinc-200">
              {cat}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {catDocs.map((doc) => (
                  <motion.button
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setSelectedDoc(doc)}
                    className="group flex flex-col items-start gap-2 rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/40"
                  >
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {doc.description}
                    </p>
                    <span className="mt-auto inline-flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                      </svg>
                      {doc.readingTime}
                    </span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        )
      })}
    </div>
  )
}
