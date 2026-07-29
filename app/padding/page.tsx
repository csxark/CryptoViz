import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/footer'
import PaddingExplorer from '../../components/padding/PaddingExplorer'

export const metadata = {
  title: 'Padding Scheme Explorer — CryptoViz',
  description: 'Understand and compare common cryptographic padding schemes such as PKCS#7, OAEP, PSS, and PKCS#1 v1.5 side by side.',
}

export default function PaddingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col justify-between">
      <div>
        <Navbar />

        <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
          <header className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
              Data Alignment & Security
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Padding Scheme Explorer
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Cryptographic algorithms often require inputs to be a specific length, or require randomness 
              to prevent deterministic patterns. Padding schemes solve these problems. Explore how symmetric 
              ciphers pad data to fit block sizes, and how asymmetric ciphers use padding to ensure IND-CCA2 
              security and prevent forgery.
            </p>
          </header>

          <PaddingExplorer />
        </main>
      </div>
      <Footer />
    </div>
  )
}
