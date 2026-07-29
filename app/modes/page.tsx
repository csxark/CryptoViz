import ModesLab from '@/components/modes/ModesLab'
import EcbPenguin from '@/components/modes/EcbPenguin'
import Footer from "@/components/layout/footer";

export const metadata = {
  title: 'Block Cipher Modes Lab — CryptoViz',
  description:
    'Compare AES modes of operation side by side — ECB, CBC, CTR, CFB, and OFB — and watch how a single one-byte plaintext change propagates through each, plus the classic ECB penguin.',
}

export default function ModesPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-white">
        Block Cipher Modes Lab
      </h1>
      <p className="mb-8 max-w-2xl text-slate-600 dark:text-zinc-400">
        A block cipher like AES only knows how to transform one 16-byte block. A{' '}
        <em>mode of operation</em> decides how to chain those blocks into a full message — and that
        choice is where most real-world crypto goes right or wrong. Flip a single plaintext byte
        below and watch how far the damage spreads under each mode, then see why you should never
        encrypt an image with ECB.
      </p>

      <ModesLab />

      <div className="mt-10">
        <EcbPenguin />
        <br></br>
        <Footer />
      </div>
    </main>
  )
}
