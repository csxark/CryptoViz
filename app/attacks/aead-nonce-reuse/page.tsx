import type { Metadata } from 'next'
import AeadNonceReuseSimulator from '../../../components/attacks/AeadNonceReuseSimulator'
import Navbar from '../../../components/layout/Navbar'
import Footer from '../../../components/layout/footer'

export const metadata: Metadata = {
  title: "AEAD Nonce-Reuse Catastrophe Simulation | CryptoViz",
  description: "Interactive simulation of the AES-GCM nonce-reuse vulnerability. Learn how GHASH key recovery enables arbitrary ciphertext and authentication tag forgery.",
}

export default function AeadNonceReusePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <AeadNonceReuseSimulator />
      </main>
      <Footer />
    </div>
  )
}
