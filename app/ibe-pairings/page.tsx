import type { Metadata } from 'next';
import Breadcrumbs from '../../components/layout/Breadcrumbs';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/footer';
import PairingVisualizer from '../../components/math/PairingVisualizer';

export const metadata: Metadata = {
  title: 'Bilinear Pairings & Identity-Based Encryption (IBE) Visualizer - CryptoViz',
  description: 'Interactive visualization of bilinear pairing maps e: G1 x G2 -> GT, Miller algorithm double-and-add step trace, and Boneh-Franklin IBE scheme.',
};

export default function IbePairingsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-[#09090B] dark:text-zinc-100 flex flex-col font-sans">
      <Navbar />

      <main className="mx-auto max-w-7xl flex-1 space-y-8 px-4 py-10 sm:px-6 lg:px-8 w-full">
        <Breadcrumbs
          items={[
            { label: 'Sandbox', href: '/visualizer/caesar/' },
            { label: 'Pairing Mathematics & IBE' },
          ]}
        />

        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Advanced Mathematical Cryptography
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Bilinear Pairings &amp; IBE Formalism Visualizer
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Demystify bilinear maps $e: G_1 \times G_2 \to G_T$, explore the double-and-add loop of Miller&apos;s algorithm, and simulate Boneh-Franklin Identity-Based Encryption with arbitrary email public keys.
          </p>
        </header>

        {/* Educational Mathematical Primer */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            Core Foundations of Pairing-Based Cryptography
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-200 text-sm mb-1">
                1. The Bilinear Map $e(P, Q)$
              </h3>
              <p>
                A bilinear map connects two elliptic curve groups $G_1, G_2$ to a target multiplicative finite field $G_T$. Its defining property is bilinearity: $e(aP, bQ) = e(P, Q)^{ab}$ for all scalars $a, b$.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-200 text-sm mb-1">
                2. Miller&apos;s Algorithm
              </h3>
              <p>
                Computing pairings directly from mathematical definitions is intractable. Miller&apos;s algorithm uses a double-and-add recurrence evaluating chord and tangent line functions to compute the pairing in logarithmic time.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-200 text-sm mb-1">
                3. Identity-Based Encryption
              </h3>
              <p>
                Boneh &amp; Franklin (CRYPTO 2001) solved the PKI distribution bottleneck by using arbitrary strings (e.g. emails) as public keys. Bilinear verification allows users to decrypt messages with PKG-extracted keys.
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Visualizer Component */}
        <section aria-label="Interactive Bilinear Pairing Visualizer">
          <PairingVisualizer />
        </section>
      </main>

      <Footer />
    </div>
  );
}
