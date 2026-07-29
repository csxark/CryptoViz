import type { Metadata } from "next";
import BruteForceSimulator from "../../../components/attacks/BruteForceSimulator";
import Navbar from "../../../components/layout/Navbar";
import Footer from "../../../components/layout/footer";

export const metadata: Metadata = {
  title: "Brute Force Attack Time Estimator | CryptoViz",
  description:
    "Interactive educational simulator for estimating the time required to brute-force a password based on length, character complexity, and computing power.",
};

export default function BruteForcePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <BruteForceSimulator />
      </main>
      <Footer />
    </div>
  );
}
