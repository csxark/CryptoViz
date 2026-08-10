import React from 'react'
import type { Metadata } from 'next'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/footer'
import PracticePageTemplate from "@/components/layout/PracticePageTemplate";
import CipherRecommendationAssistant from '../../components/advisor/CipherRecommendationAssistant'

export const metadata: Metadata = {
  title: 'Cipher Recommendation Assistant | CryptoViz',
  description: 'An interactive recommendation assistant to help you choose the right cryptographic algorithm based on real-world use cases, environment constraints, and security requirements.',
}

export default function AdvisorPage() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-950 dark:bg-[#060816] dark:text-zinc-100 transition-colors duration-300">
      <Navbar />

       <PracticePageTemplate
        title="Cipher Recommendation Assistant"
        description="Select a real-world use case scenario or answer a step-by-step decision tree to discover recommended algorithms, security trade-offs, and implementation code snippets."
        eyebrow="Interactive Recommendation Guide"
        breadcrumbs={[
          {
            label: "Practice",
            href: "/visualizer/caesar/",
          },
          {
            label: "Cipher Recommendation Assistant",
          },
        ]}
      >

        <section aria-label="Cipher Recommendation Assistant">
          <CipherRecommendationAssistant />
        </section>
      </PracticePageTemplate>

      <Footer />
    </div>
  )
}
