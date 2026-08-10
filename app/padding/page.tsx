import Navbar from '../../components/layout/Navbar'

import Footer from '../../components/layout/footer'
import LearnPageTemplate from "@/components/layout/LearnPageTemplate";
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

        <LearnPageTemplate
          title="Padding Scheme Explorer"
          description="Understand and compare common cryptographic padding schemes such as PKCS#7, OAEP, PSS, and PKCS#1 v1.5 side by side."
          eyebrow="Data Alignment & Security"
          breadcrumbs={[
            { label: "Learn" },
            { label: "Padding Schemes" },
          ]}
        >
          <PaddingExplorer />
        </LearnPageTemplate>
      </div>
      <Footer />
    </div>
  )
}
