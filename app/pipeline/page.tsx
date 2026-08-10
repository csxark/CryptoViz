import CipherPipelineBuilder from "../../components/pipeline/CipherPipelineBuilder";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/footer";
import PracticePageTemplate from "@/components/layout/PracticePageTemplate";

export const metadata = {
  title: "Cipher Pipeline Builder | CryptoViz",
  description:
    "Chain operations like Encode → Encrypt → Hash → Sign → Verify to build, execute, and visualize custom multi-stage cryptographic workflows.",
};

export default function PipelinePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#060816] text-zinc-900 dark:text-white transition-colors duration-300">
      <Navbar />
      <PracticePageTemplate
        title="Cipher Pipeline Builder"
        description="Chain operations like Encode → Encrypt → Hash → Sign → Verify to build, execute, and visualize custom multi-stage cryptographic workflows."
        eyebrow="Cryptographic Workflow Builder"
        breadcrumbs={[{ label: "Practice" }, { label: "Cipher Pipeline" }]}
        hideHeader
      >
        <CipherPipelineBuilder />
      </PracticePageTemplate>

      <Footer />
    </div>
  );
}
