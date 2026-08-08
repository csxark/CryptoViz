import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ALGORITHM_MATRIX_DATA, MatrixEntry } from '../../lib/cipher/matrixData'
import { Shield, ShieldAlert, ShieldX, Info } from 'lucide-react'
import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs))
}

export default function AlgorithmMatrix() {
  const [filter, setFilter] = useState<string>('all')

  const filteredData = ALGORITHM_MATRIX_DATA.filter((entry) => {
    if (filter === 'all') return true
    return entry.category === filter
  })

  const getSecurityIcon = (status: MatrixEntry['securityStatus']) => {
    switch (status) {
      case 'secure':
        return <Shield className="h-5 w-5 text-emerald-500" aria-label="Secure" />
      case 'legacy':
        return <Info className="h-5 w-5 text-amber-500" aria-label="Legacy" />
      case 'deprecated':
        return <ShieldAlert className="h-5 w-5 text-orange-500" aria-label="Deprecated" />
      case 'broken':
        return <ShieldX className="h-5 w-5 text-red-500" aria-label="Broken" />
    }
  }

  const getSecurityClass = (status: MatrixEntry['securityStatus']) => {
    switch (status) {
      case 'secure': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
      case 'legacy': return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-800'
      case 'deprecated': return 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border-orange-200 dark:border-orange-800'
      case 'broken': return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-800'
    }
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {['all', 'symmetric', 'asymmetric', 'hash', 'classical'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                filter === cat
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              )}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" aria-label="Algorithm Compatibility Matrix">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th scope="col" className="whitespace-nowrap px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">Algorithm</th>
                <th scope="col" className="whitespace-nowrap px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">Category</th>
                <th scope="col" className="whitespace-nowrap px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">Block Size</th>
                <th scope="col" className="whitespace-nowrap px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">Key Size</th>
                <th scope="col" className="whitespace-nowrap px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">Security</th>
                <th scope="col" className="whitespace-nowrap px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">Speed</th>
                <th scope="col" className="whitespace-nowrap px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">Common Applications</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              <AnimatePresence mode="popLayout">
                {filteredData.map((entry) => (
                  <motion.tr
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      {entry.name}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 capitalize">
                      {entry.category}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {entry.blockSize}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {entry.keySize}
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn('inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wider', getSecurityClass(entry.securityStatus))}>
                        {getSecurityIcon(entry.securityStatus)}
                        <span>{entry.securityStatus}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {entry.speed}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      <div className="flex flex-wrap gap-1">
                        {entry.applications.map((app) => (
                          <span
                            key={app}
                            className="inline-block rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 whitespace-nowrap"
                          >
                            {app}
                          </span>
                        ))}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              No algorithms found for this category.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
