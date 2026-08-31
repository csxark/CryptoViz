import type { Metadata } from "next";
import SubstitutionBreaker from "../../components/cryptanalysis/SubstitutionBreaker";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/footer";

export const metadata: Metadata = {
  title: "Substitution Cipher Breaker — Automated Cryptanalysis | CryptoViz",
  description:
    "Automatically crack monoalphabetic substitution ciphers using frequency analysis and hill climbing with simulated annealing. Interactive educational cryptanalysis tool.",
};

export default function SubstitutionBreakerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <SubstitutionBreaker />
      </main>
      <Footer />
    </div>
  );
}
