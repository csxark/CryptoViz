import Navbar from "@/components/layout/Navbar";
import BloomFilterVisualizer from "@/components/simulator/BloomFilterVisualizer";

export const metadata = {
  title: "Bloom Filter Simulator — CryptoViz",
  description:
    "Explore space-efficient probabilistic data structures with zero false negatives. Visualize bit array saturation, hash index calculations, and theoretical false positive rates.",
};

export default function BloomFilterPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Probabilistic Data Structures
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Bloom Filter Simulator
          </h1>
          <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            A Bloom Filter is a space-efficient data structure used to test set membership with zero false negatives and a configurable false-positive probability. Watch bits flip in real time as elements are hashed, and test membership queries against the filter.
          </p>
        </header>

        <BloomFilterVisualizer />
      </main>
    </div>
  );
}
