'use client'

import Navbar from '../../components/layout/Navbar'
import MerkleVisualizer from '../../components/merkle/MerkleVisualizer'
import Footer from '../../components/layout/footer'

export default function MerklePage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col justify-between">
      <div>
        <Navbar />

        <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
          <header className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
              Data Integrity & Verifiability
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Merkle Tree Visualizer
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              A Merkle Tree (cryptographic hash tree) is a tree of hashes where every leaf represents a data block, 
              and every parent represents the combined cryptographic hash of its children. This data structure allows 
              secure and efficient verification of large datasets in O(log N) time complexity. Explore leaves, 
              generate Merkle Proofs, and debug the verification audit path step-by-step.
            </p>
          </header>

          <MerkleVisualizer />
        </main>
      </div>
      <Footer />
    </div>
  )
}
