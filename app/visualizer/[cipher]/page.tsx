import { notFound } from 'next/navigation'
import Navbar from '../../../components/layout/Navbar'
import Sidebar from '../../../components/layout/Sidebar'
import CipherLayout from '../../../components/cipher/CipherLayout'
import WorkerErrorBoundary from '../../../components/error/WorkerErrorBoundary'
import { CIPHER_REGISTRY } from '../../../lib/cipher/registry'

// Generate static routes for all ciphers for 'output: export' static build
export async function generateStaticParams() {
  return CIPHER_REGISTRY.map((cipher) => ({
    cipher: cipher.id,
  }))
}

// Next.js dynamic routing expects params to be a Promise in Next 15+
export default async function VisualizerPage({
  params,
}: {
  params: Promise<{ cipher: string }>
}) {
  const resolvedParams = await params
  const cipher = CIPHER_REGISTRY.find((c) => c.id === resolvedParams.cipher)

  if (!cipher) {
    notFound()
  }

  // Prep sidebar lists
  const sidebarCiphers = CIPHER_REGISTRY.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
  }))

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans transition-colors duration-300">
      <Navbar />
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row">
        <Sidebar ciphers={sidebarCiphers} />
        <main className="flex-1 min-w-0 bg-white dark:bg-zinc-900/10">
          <WorkerErrorBoundary>
            <CipherLayout cipher={cipher} />
          </WorkerErrorBoundary>
        </main>
      </div>
    </div>
  )
}
