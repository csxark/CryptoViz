'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'


interface SidebarCipher {
  id: string
  name: string
  category: 'classical' | 'symmetric' | 'hash' | 'asymmetric'
  description?: string
  defaultKey?: string
  defaultInput?: string
  securityStatus?: 'secure' | 'deprecated' | 'broken'
}

interface SidebarProps {
  ciphers: SidebarCipher[]
}

const CATEGORY_LABELS = {
  classical: 'Classical Ciphers',
  symmetric: 'Symmetric Ciphers',
  hash: 'Hash Functions',
  asymmetric: 'Asymmetric Ciphers',
}

export default function Sidebar({ ciphers }: SidebarProps) {
  const pathname = usePathname()

  const grouped = ciphers.reduce(
    (acc, cipher) => {
      acc[cipher.category].push(cipher)
      return acc
    },
    {
      classical: [],
      symmetric: [],
      hash: [],
      asymmetric: [],
    } as Record<SidebarCipher['category'], SidebarCipher[]>,
  )

  const categories: SidebarCipher['category'][] = [
    'classical',
    'symmetric',
    'hash',
    'asymmetric',
  ]

  

  return (
    <aside className="w-full shrink-0 border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950 md:w-64 md:border-b-0 md:border-r" aria-label="Cipher categories">
      <div className="space-y-6 md:sticky md:top-4">
        

        {categories.map((category) => (
          <section key={category}>
            <h2 className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400" id={`sidebar-heading-${category}`}>
              {CATEGORY_LABELS[category]}
            </h2>

            <ul className="space-y-1" aria-labelledby={`sidebar-heading-${category}`}>
              {grouped[category].map((cipher) => {
                const href = `/visualizer/${cipher.id}/`
                const isActive = pathname.startsWith(href)

                return (
                  <li key={cipher.id} className="flex items-center gap-1">
                    <Link
                      href={href}
                      className={`min-w-0 flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                        isActive
                          ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300'
                          : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="block truncate">{cipher.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  )
}
