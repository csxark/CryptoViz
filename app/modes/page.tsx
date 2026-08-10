import ModesLab from '@/components/modes/ModesLab'

import EcbPenguin from '@/components/modes/EcbPenguin'
import Footer from "@/components/layout/footer";
import ReferencePageTemplate from "@/components/layout/ReferencePageTemplate";

export const metadata = {
  title: 'Block Cipher Modes Lab — CryptoViz',
  description:
    'Compare AES modes of operation side by side — ECB, CBC, CTR, CFB, and OFB — and watch how a single one-byte plaintext change propagates through each, plus the classic ECB penguin.',
}

export default function ModesPage() {
  return (
    <ReferencePageTemplate
      title="Block Cipher Modes Lab"
      description="Compare AES modes of operation side by side — ECB, CBC, CTR, CFB, and OFB — and watch how a single one-byte plaintext change propagates through each, plus the classic ECB penguin."
      eyebrow="Interactive learning lab"
      breadcrumbs={[
        { label: "reference" },
        { label: "Block Cipher Modes" },
      ]}
    >
      <ModesLab />

      <div className="mt-10">
        <EcbPenguin />
        <br></br>
        <Footer />
      </div>
    </ReferencePageTemplate>
  )
}
