import LinearCryptanalysisSimulator from "@/components/attacks/LinearCryptanalysisSimulator";
import Navbar from "@/components/layout/Navbar";

export const metadata = {
  title: "Linear Cryptanalysis Simulator — CryptoViz",
  description:
    "Interactive educational simulator for Matsui's linear cryptanalysis, featuring an S-box LAT grid, Piling-up Lemma, and a 2-round SPN key recovery attack.",
};

export default function LinearCryptanalysisPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-[#F5F5F5] font-sans antialiased">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <LinearCryptanalysisSimulator />
      </main>
    </div>
  );
}
