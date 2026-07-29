import type { Metadata } from "next";
import BirthdayAttackSimulator from "../../../components/attacks/BirthdayAttackSimulator";
import Navbar from "../../../components/layout/Navbar";
import Footer from "../../../components/layout/footer";

export const metadata: Metadata = {
  title: "Birthday Attack Simulator | CryptoViz",
  description:
    "Interactive educational simulator for exploring the birthday paradox and testing collision resistance of various hash sizes.",
};

export default function BirthdayAttackPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <BirthdayAttackSimulator />
      </main>
      <Footer />
    </div>
  );
}
