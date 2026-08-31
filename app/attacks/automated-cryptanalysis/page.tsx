import type { Metadata } from "next";
import { AutomatedCryptanalysisWorkbench } from "../../../components/attacks/AutomatedCryptanalysisWorkbench";
import Navbar from "../../../components/layout/Navbar";
import Footer from "../../../components/layout/footer";

export const metadata: Metadata = {
  title: "Automated Cryptanalysis Solver | CryptoViz",
  description:
    "Interactive educational solver using heuristic optimization and quadgram language models to break monoalphabetic substitution ciphers automatically.",
};

export default function AutomatedCryptanalysisPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <AutomatedCryptanalysisWorkbench />
      </main>
      <Footer />
    </div>
  );
}