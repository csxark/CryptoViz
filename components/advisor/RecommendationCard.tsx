import React, { useRef, useEffect } from 'react'
import Link from 'next/link'
import { RecommendationNode } from '../../lib/advisor/treeData'
import { CIPHER_REGISTRY } from '../../lib/cipher/registry'

interface RecommendationCardProps {
  node: RecommendationNode
}

export default function RecommendationCard({ node }: RecommendationCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Focus management: when recommendation appears, focus the container
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus()
    }
  }, [node.id])

  // Get cipher metadata from registry
  const ciphers = node.cipherIds
    .map((id) => CIPHER_REGISTRY.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="flex flex-col gap-8 outline-none"
      aria-labelledby="recommendation-heading"
    >
      <div className="space-y-4 rounded-3xl bg-teal-500/10 p-8 border border-teal-500/20 dark:bg-teal-900/20 dark:border-teal-500/30">
        <h2
          id="recommendation-heading"
          className="text-sm font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400"
        >
          Recommendation
        </h2>
        <h3 className="text-3xl font-black text-zinc-900 dark:text-white">
          {node.title}
        </h3>
        <p className="text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
          {node.rationale}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
        {ciphers.map((cipher) => (
          <div
            key={cipher.id}
            className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
          >
            <div>
              <div className="flex items-center gap-3">
                <h4 className="text-xl font-bold text-zinc-900 dark:text-white">
                  {cipher.name}
                </h4>
                {cipher.securityStatus === 'secure' && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Secure
                  </span>
                )}
                {cipher.securityStatus === 'deprecated' && (
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    Deprecated
                  </span>
                )}
                {cipher.securityStatus === 'broken' && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    Broken
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {cipher.description}
              </p>
            </div>
            
            <div className="mt-auto pt-4">
              <Link
                href={`/visualizer/${cipher.id}`}
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-zinc-900
                  px-4
                  py-2
                  text-sm
                  font-semibold
                  text-white
                  transition-all
                  hover:bg-zinc-800
                  hover:shadow-md
                  focus:outline-none
                  focus:ring-2
                  focus:ring-zinc-900
                  focus:ring-offset-2
                  dark:bg-white
                  dark:text-zinc-900
                  dark:hover:bg-zinc-100
                  dark:focus:ring-white
                  dark:focus:ring-offset-zinc-950
                "
              >
                Open in Playground
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {(node.tradeOffs || node.commonMistakes) && (
        <div className="space-y-6 pt-4">
          {node.tradeOffs && (
            <div className="space-y-2">
              <h4 className="font-semibold text-zinc-900 dark:text-white">
                Trade-offs & Context
              </h4>
              <p className="text-zinc-600 dark:text-zinc-400">
                {node.tradeOffs}
              </p>
            </div>
          )}
          {node.commonMistakes && (
            <div className="space-y-2 rounded-xl bg-orange-50 p-4 border border-orange-100 dark:bg-orange-900/10 dark:border-orange-900/30">
              <h4 className="flex items-center gap-2 font-semibold text-orange-800 dark:text-orange-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Common Mistakes to Avoid
              </h4>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                {node.commonMistakes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
