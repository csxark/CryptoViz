'use client'

import Navbar from '../../components/layout/Navbar'
import ReferencePageTemplate from "@/components/layout/ReferencePageTemplate";
import AvalancheVisualizer from '../../components/avalanche/AvalancheVisualizer'

export default function AvalanchePage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <Navbar />

      <ReferencePageTemplate
        title="Avalanche-effect visualizer"
        description="Type an input, flip a single bit, and watch the output cascade. A strong primitive turns that 1-bit change into roughly a 50% output change — the avalanche effect."
        eyebrow="Diffusion workspace"
        breadcrumbs={[
          { label: "Reference" },
          { label: "Avalanche Effect" },
        ]}
        className="max-w-4xl"
      >

        <AvalancheVisualizer />
      </ReferencePageTemplate>
    </div>
  )
}
