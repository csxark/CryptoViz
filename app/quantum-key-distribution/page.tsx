import type { Metadata } from 'next'
import BB84Simulator from '../../components/quantum/BB84Simulator'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/footer'

export const metadata: Metadata = {
  title: 'BB84 Quantum Key Distribution | CryptoViz',
  description:
    'Interactive BB84 QKD simulator: Alice, Bob, and an intercept-resend eavesdropper — sifting, error rate (QBER), and physics-based eavesdropper detection.',
}

export default function QuantumKeyDistributionPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <BB84Simulator />
      </main>
      <Footer />
    </div>
  )
}
