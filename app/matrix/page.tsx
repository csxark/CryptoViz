'use client'

import React from 'react'
import Navbar from '../../components/layout/Navbar'
import ReferencePageTemplate from "@/components/layout/ReferencePageTemplate";
import AlgorithmMatrix from '../../components/matrix/AlgorithmMatrix'

export default function MatrixPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <Navbar />

      <ReferencePageTemplate
        title="Compatibility Matrix"
        description="Compare cryptographic algorithms side by side. Evaluate block sizes, key lengths, security statuses, speeds, and common applications to choose the right algorithm for your use case."
        eyebrow="Algorithm Overview"
        breadcrumbs={[
          { label: "Reference" },
          { label: "Compatibility Matrix" },
        ]}
      >

        <section aria-label="Algorithm Matrix Data">
          <AlgorithmMatrix />
        </section>
      </ReferencePageTemplate>
    </div>
  )
}
