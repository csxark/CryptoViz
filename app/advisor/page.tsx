import React from 'react'
import type { Metadata } from 'next'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/footer'
import PracticePageTemplate from "@/components/layout/PracticePageTemplate";
import CipherRecommendationAssistant from '../../components/advisor/CipherRecommendationAssistant'

export const metadata: Metadata = {
  title: 'Algorithm Advisor | CryptoViz',
  description: 'An interactive algorithm advisor to help you choose the right cryptographic algorithm based on real-world use cases, environment constraints, and security requirements.',
}

export default function AdvisorPage() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-950 dark:bg-[#060816] dark:text-zinc-100 transition-colors duration-300">
      <Navbar />

       <PracticePageTemplate
        title="Algorithm Advisor"
        description="Select a real-world use case scenario or answer a step-by-step decision tree to discover recommended algorithms, security trade-offs, and implementation code snippets."
        eyebrow="Decision Support System"
        breadcrumbs={[
          {
            label: "Practice",
            href: "/visualizer/caesar/",
          },
          {
            label: "Algorithm Advisor",
          },
        ]}
      >

        <section aria-label="Algorithm Advisor">
          <CipherRecommendationAssistant />
        </section>
      </PracticePageTemplate>

      <Footer />
    </div>
  )
}
