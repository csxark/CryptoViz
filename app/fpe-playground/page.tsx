import type { Metadata } from 'next'
import Ff1Playground from '../../components/fpe/Ff1Playground'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/footer'

export const metadata: Metadata = {
  title: 'Format-Preserving Encryption (FF1) | CryptoViz',
  description:
    'Encrypt a card number into another valid card number with FF1 (NIST SP 800-38G): format-preserving encryption over any alphabet, with the 10-round Feistel network visualized.',
}

export default function FpePlaygroundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <Ff1Playground />
      </main>
      <Footer />
    </div>
  )
}
