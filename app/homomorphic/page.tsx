'use client'

import React from 'react'
import Breadcrumbs from '@/components/layout/Breadcrumbs'
import Navbar from '@/components/layout/Navbar'
import HomomorphicWorkbench from '@/components/homomorphic/HomomorphicWorkbench'

export default function HomomorphicPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Sandbox' }, { label: 'Homomorphic' }]} />
        <HomomorphicWorkbench />
      </main>
    </div>
  )
}
