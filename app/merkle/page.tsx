'use client'

import Navbar from '../../components/layout/Navbar'
import LearnPageTemplate from "@/components/layout/LearnPageTemplate";
import MerkleVisualizer from '../../components/merkle/MerkleVisualizer'
import Footer from '../../components/layout/footer'

export default function MerklePage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col justify-between">
      <div>
        <Navbar />

         <LearnPageTemplate
        title="Merkle Tree Visualizer"
        description="A Merkle Tree (cryptographic hash tree) is a tree of hashes where every leaf represents a data block, and every parent represents the combined cryptographic hash of its children. Explore leaves, generate Merkle Proofs, and debug the verification audit path step-by-step."
        eyebrow="Data Integrity & Verifiability"
        breadcrumbs={[
          { label: "Learn" },
          { label: "Merkle Tree" },
        ]}
      >

          <MerkleVisualizer />
        </LearnPageTemplate>
      </div>
      <Footer />
    </div>
  )
}
