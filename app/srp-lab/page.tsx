import type { Metadata } from 'next'
import Srp6aLab from '../../components/protocols/Srp6aLab'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/footer'

export const metadata: Metadata = {
  title: 'SRP-6a Password-Authenticated Key Exchange | CryptoViz',
  description:
    'Walk the SRP-6a (RFC 5054) handshake: agree on a shared key from a password without ever sending it, see both sides derive the same secret, and watch a wrong password fail.',
}

export default function SrpLabPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <Srp6aLab />
      </main>
      <Footer />
    </div>
  )
}
