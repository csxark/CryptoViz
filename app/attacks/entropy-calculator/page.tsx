import type { Metadata } from "next";
import EntropyCalculator from "../../../components/attacks/EntropyCalculator";
import Navbar from "../../../components/layout/Navbar";
import Footer from "../../../components/layout/footer";

export const metadata: Metadata = {
  title: "Password Entropy Calculator | CryptoViz",
  description:
    "Interactive educational tool for calculating the information entropy of passwords and understanding their cryptographic strength.",
};

export default function EntropyCalculatorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <EntropyCalculator />
      </main>
      <Footer />
    </div>
  );
}
