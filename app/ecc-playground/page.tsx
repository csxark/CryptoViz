import type { Metadata } from 'next'
import CurvePlayground from '../../components/ecc/CurvePlayground'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/footer'

export const metadata: Metadata = {
  title: 'Elliptic-Curve Point-Arithmetic Playground | CryptoViz',
  description:
    'Interactive elliptic-curve group law over F_p: point addition, scalar multiplication, and base-point orbits — the geometry behind ECDSA, ECDH and X25519.',
}

export default function EccPlaygroundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <CurvePlayground />
      </main>
      <Footer />
    </div>
  )
}
