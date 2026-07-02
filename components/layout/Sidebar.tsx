'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'

interface SidebarProps {
  ciphers: {
    id: string
    name: string
    category: 'classical' | 'symmetric' | 'hash' | 'asymmetric'
  }[]
}

const CATEGORY_LABELS = {
  classical: 'Classical Ciphers',
  symmetric: 'Symmetric Ciphers',
  hash: 'Hash Functions',
  asymmetric: 'Asymmetric Ciphers',
}

export default function Sidebar({ ciphers }: SidebarProps) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const grouped = ciphers.reduce(
    (acc, cipher) => {
      acc[cipher.category].push(cipher)
      return acc
    },
    { classical: [], symmetric: [], hash: [], asymmetric: [] } as Record<
      'classical' | 'symmetric' | 'hash' | 'asymmetric',
      typeof ciphers
    >
  )

  const categories: ('classical' | 'symmetric' | 'hash' | 'asymmetric')[] = [
    'classical',
    'symmetric',
    'hash',
    'asymmetric',
  ]

  const sidebarContent = (
    <div className="flex flex-col gap-6">
      {categories.map((cat) => (
        <div key={cat} className="flex flex-col gap-1">
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {CATEGORY_LABELS[cat]}
          </h3>
          <div className="flex flex-col gap-[2px]">
            {grouped[cat].map((cipher) => {
              const href = `/visualizer/${cipher.id}/`
              const isActive = pathname.startsWith(`/visualizer/${cipher.id}/`)

              return (
                <Link
                  key={cipher.id}
                  href={href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {cipher.name}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="sticky top-16 z-40 flex w-full items-center gap-2 border-b border-zinc-200 bg-white/95 px-4 py-3 text-sm font-medium text-zinc-700 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-300 md:hidden"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {isMobileOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
        {isMobileOpen ? 'Close Cipher List' : 'Browse Ciphers'}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-32 z-40 h-[calc(100vh-8rem)] w-72 overflow-y-auto border-r border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 md:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden w-full shrink-0 border-r border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/20 md:block md:w-64 md:min-h-[calc(100vh-4rem)] md:sticky md:top-16">
        {sidebarContent}
      </aside>
    </>
  )
}
