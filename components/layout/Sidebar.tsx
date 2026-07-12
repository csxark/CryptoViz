'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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

  // Group ciphers by category
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

  return (
    <aside className="w-full shrink-0 border-r border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/20 md:w-64 md:min-h-[calc(100vh-4rem)] md:sticky md:top-16">
      <div className="flex gap-6 overflow-x-auto md:flex-col md:overflow-visible pb-2">
        {categories.map((cat) => (
          <div
            key={cat}
            className="min-w-[220px] flex-shrink-0 md:min-w-0 flex flex-col gap-1"
          >
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
                   className={`flex items-center rounded-lg border-l-2 border-transparent px-3 py-2 text-sm font-medium transition-all duration-200 hover:translate-x-1 ${
                      isActive
                        ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400'
                        : 'text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-white'
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
    </aside>
  )
}
