import type { Metadata } from 'next'
import HmacDrbgVisualizer from '../../components/random/HmacDrbgVisualizer'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/footer'

export const metadata: Metadata = {
  title: 'HMAC_DRBG Visualizer | CryptoViz',
  description:
    'Watch a NIST SP 800-90A HMAC_DRBG (SHA-256) turn a seed into a random bit stream: instantiate, generate, and reseed with the internal K/V state made visible.',
}

export default function DrbgVisualizerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <HmacDrbgVisualizer />
      </main>
      <Footer />
    </div>
  )
}
