import type { Metadata } from 'next'
import SignatureNonceReuseSimulator from '../../../components/attacks/SignatureNonceReuseSimulator'
import Navbar from '../../../components/layout/Navbar'
import Footer from '../../../components/layout/footer'

export const metadata: Metadata = {
  title: 'Signature Nonce-Reuse Attack Lab | CryptoViz',
  description:
    'Recover an ECDSA private key from two secp256k1 signatures that reused their nonce — the Sony PS3 / Bitcoin break — plus signature malleability, step by step.',
}

export default function SignatureNonceReusePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <SignatureNonceReuseSimulator />
      </main>
      <Footer />
    </div>
  )
}
