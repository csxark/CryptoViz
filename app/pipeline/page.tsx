import DagPipelineCanvas from "@/components/pipeline/DagPipelineCanvas";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/footer";
import PracticePageTemplate from "@/components/layout/PracticePageTemplate";

export const metadata = {
  title: "Cryptographic DAG Pipeline Canvas | CryptoViz",
  description:
    "Design and execute multi-stage cryptographic protocol architectures using an interactive node-based DAG canvas with typed sockets and real-time buffer inspection.",
};

export default function PipelinePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#060816] text-zinc-900 dark:text-white transition-colors duration-300">
      <Navbar />
      <PracticePageTemplate
        title="Cryptographic DAG Pipeline Canvas"
        description="Wire primitives together to build, evaluate, and visualize custom multi-stage protocol architectures like Hybrid Encryption and TLS 1.3."
        eyebrow="Protocol Architecture Canvas"
        breadcrumbs={[{ label: "Practice" }, { label: "DAG Pipeline" }]}
        hideHeader
      >
        <DagPipelineCanvas />
      </PracticePageTemplate>

      <Footer />
    </div>
  );
}
