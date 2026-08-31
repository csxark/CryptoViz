import type { Metadata } from "next";
import CipherIdentifier from "../../components/cryptanalysis/CipherIdentifier";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/footer";

export const metadata: Metadata = {
  title: "Cipher Identifier — Automated Cryptanalysis | CryptoViz",
  description:
    "Identify unknown ciphertext using automated statistical analysis. Uses frequency analysis, index of coincidence, entropy, Kasiski examination, and pattern matching to classify encryption methods.",
};

export default function CipherIdentifierPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <CipherIdentifier />
      </main>
      <Footer />
    </div>
  );
}
