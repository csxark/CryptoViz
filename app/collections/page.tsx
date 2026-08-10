'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/footer'
import ReferencePageTemplate from "@/components/layout/ReferencePageTemplate";
import { CIPHER_COLLECTIONS, CipherCollection } from '../../lib/cipher/collections'
import { CIPHER_REGISTRY, CipherDefinition } from '../../lib/cipher/registry'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../components/ui/Card'
import { Heading, Text } from '../../components/ui/Typography'
import { SecurityBadge } from '../../components/ui/Badge'
import { ArrowRight, Info, Shield, Layers, HelpCircle } from 'lucide-react'

export default function CollectionsPage() {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    CIPHER_COLLECTIONS[0]?.id || ''
  )

  const activeCollection = useMemo(() => {
    return CIPHER_COLLECTIONS.find((col) => col.id === selectedCollectionId)
  }, [selectedCollectionId])

  const activeCiphers = useMemo(() => {
    if (!activeCollection) return []
    return activeCollection.cipherIds
      .map((id) => CIPHER_REGISTRY.find((c) => c.id === id))
      .filter((c): c is CipherDefinition => !!c)
  }, [activeCollection])

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100 transition-colors duration-300">
      <Navbar />
      
 <ReferencePageTemplate
        title="Cipher Collections"
        description="Explore closely related cryptographic algorithm families. Contrast security levels, block sizes, and operation behaviors side-by-side."
        eyebrow="Curated Showcases"
        breadcrumbs={[
          { label: "Reference" },
          { label: "Collections" },
        ]}
      >

        {/* Collections Selector & Detail Grid */}
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Sidebar selector */}
          <div className="lg:col-span-4 space-y-4" role="tablist" aria-label="Cipher collections">
            {CIPHER_COLLECTIONS.map((col) => {
              const isActive = col.id === selectedCollectionId
              return (
                <button
                  key={col.id}
                  onClick={() => setSelectedCollectionId(col.id)}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${col.id}`}
                  id={`tab-${col.id}`}
                  className={`w-full text-left p-6 rounded-[var(--radius-lg)] border transition-all duration-300 ${
                    isActive
                      ? 'bg-white dark:bg-zinc-900 border-teal-500 shadow-md ring-1 ring-teal-500/20'
                      : 'bg-zinc-100/50 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
                        {col.name}
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        {col.cipherIds.length} Algorithms
                      </p>
                    </div>
                    {isActive && (
                      <span className="h-2 w-2 rounded-full bg-teal-500" />
                    )}
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-3 line-clamp-2">
                    {col.description}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Collection Detail Display */}
          <div className="lg:col-span-8 space-y-6">
            {activeCollection && (
              <div
                id={`panel-${activeCollection.id}`}
                role="tabpanel"
                aria-labelledby={`tab-${activeCollection.id}`}
                className="space-y-8 animate-fadeIn"
              >
                {/* Active Collection Description Card */}
                <Card className="p-8 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Layers className="h-5 w-5 text-teal-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                        Family Group
                      </span>
                    </div>
                    <Heading as="h2" className="text-2xl font-bold">
                      {activeCollection.name}
                    </Heading>
                    <Text size="base" secondary>
                      {activeCollection.description}
                    </Text>

                    <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                        Key Features & Capabilities
                      </h4>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {activeCollection.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>

                {/* Cipher list inside the collection */}
                <div className="space-y-4">
                  <Heading as="h3" className="text-xl font-bold">
                    Algorithms in this Collection
                  </Heading>

                  <div className="grid gap-4">
                    {activeCiphers.map((cipher) => (
                      <Card
                        key={cipher.id}
                        className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300"
                      >
                        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
                          <div>
                            <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                              {cipher.name}
                            </CardTitle>
                            <CardDescription className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {cipher.category}
                            </CardDescription>
                          </div>
                          <SecurityBadge status={cipher.securityStatus} />
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            {cipher.description}
                          </p>

                          <div className="flex flex-wrap gap-3 pt-2">
                            <Link
                              href={`/visualizer/${cipher.id}`}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white transition-colors duration-200"
                            >
                              Visualize {cipher.name}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>

                            <Link
                              href={`/compare?left=${cipher.id}`}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 transition-all duration-200"
                            >
                              Compare
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </ReferencePageTemplate>

      <Footer />
    </div>
  )
}
