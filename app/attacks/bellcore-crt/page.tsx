import type { Metadata } from "next";
import BellcoreFaultSimulator from "../../../components/attacks/BellcoreFaultSimulator";
import Navbar from "../../../components/layout/Navbar";
import Footer from "../../../components/layout/footer";

export const metadata: Metadata = {
  title: "RSA-CRT Bellcore Fault Attack Simulator | CryptoViz",
  description:
    "Interactive educational simulator demonstrating how transient bit-flips during Chinese Remainder Theorem calculations can instantly factor RSA moduli via GCD computation.",
};

export default function BellcoreCRTPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <BellcoreFaultSimulator />
      </main>
      <Footer />
    </div>
  );
}