import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { ArrowRight, ShieldAlert, Key, Hammer, Database, Hash, BarChart3 } from "lucide-react";

export const metadata = {
  title: "Cryptographic Attacks — CryptoViz",
  description: "Explore interactive playgrounds demonstrating cryptographic vulnerability classes, mathematical attacks, and security defenses.",
};

const attackPlaygrounds = [
  {
    title: "Linear Cryptanalysis",
    difficulty: "Advanced",
    time: "25 min",
    description: "Exploit high-probability linear approximations between plaintext, ciphertext, and key bits to recover secret key bits of a 2-round SPN cipher.",
    link: "/attacks/linear-cryptanalysis",
    icon: <ShieldAlert className="h-6 w-6 text-teal-400" />,
    glowClass: "hover:border-teal-500/50 hover:shadow-[0_0_30px_rgba(20,216,194,0.1)]",
  },
  {
    title: "Padding Oracle Attack",
    difficulty: "Advanced",
    time: "20 min",
    description: "Watch a CBC padding-oracle attack decrypt ciphertext byte-by-byte using leaked padding error statuses, then see the constant-time fix defeat it.",
    link: "/attacks/padding-oracle",
    icon: <Key className="h-6 w-6 text-amber-400" />,
    glowClass: "hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)]",
  },
  {
    title: "Meet-in-the-Middle Attack",
    difficulty: "Advanced",
    time: "15 min",
    description: "Decrypt Double-DES by building intermediate state lookup tables to reduce the search space from 2^2n down to 2*2^n operations.",
    link: "/attacks/meet-in-the-middle",
    icon: <Hammer className="h-6 w-6 text-indigo-400" />,
    glowClass: "hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)]",
  },
  {
    title: "Dictionary Attack",
    difficulty: "Beginner",
    time: "10 min",
    description: "See how automated script attempts compare common human passphrases against target hashed credentials to identify weak password choices.",
    link: "/attacks/dictionary",
    icon: <Database className="h-6 w-6 text-emerald-400" />,
    glowClass: "hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]",
  },
  {
    title: "Length Extension Attack",
    difficulty: "Intermediate",
    time: "15 min",
    description: "Forge valid message authentication codes (MACs) for SHA-256 by exploiting structural state-copying padding properties without the key.",
    link: "/attacks/length-extension",
    icon: <Hash className="h-6 w-6 text-rose-400" />,
    glowClass: "hover:border-rose-500/50 hover:shadow-[0_0_30px_rgba(244,63,94,0.1)]",
  },
  {
    title: "Frequency Analysis Solver",
    difficulty: "Beginner",
    time: "8 min",
    description: "Solve classical Caesar and monoalphabetic substitution ciphers automatically using statistical properties of the English alphabet.",
    link: "/attacks/frequency-analysis",
    icon: <BarChart3 className="h-6 w-6 text-sky-400" />,
    glowClass: "hover:border-sky-500/50 hover:shadow-[0_0_30px_rgba(14,165,233,0.1)]",
  },
];

export default function AttacksHubPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-[#F5F5F5] font-sans antialiased">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-16">
        {/* Header */}
        <div className="mb-16 border-b border-[#2A2A31] pb-10">
          <span className="inline-flex rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-teal-400">
            Attack Vectors
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[#F5F5F5] sm:text-5xl">
            Cryptographic Attack Playgrounds
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#B3B3B8]">
            Understand cryptographic vulnerabilities, mathematical attack proofs, and side-channel exploits through hands-on simulations. Learn why modern design choices are essential for overall security robustness.
          </p>
        </div>

        {/* Playgrounds Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {attackPlaygrounds.map((playground, idx) => (
            <div
              key={idx}
              className={`group relative flex flex-col justify-between rounded-xl border border-[#2A2A31] bg-[#16161A] p-6 shadow-sm transition-all duration-250 hover:-translate-y-1 hover:bg-[#1A1A1F] ${playground.glowClass}`}
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#09090B] border border-[#2a2a31]">
                    {playground.icon}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#F5F5F5] bg-[#09090B] border border-[#2A2A31] rounded">
                      {playground.difficulty}
                    </span>
                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#8A8A94] bg-[#09090B] border border-[#2A2A31] rounded">
                      {playground.time}
                    </span>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-[#F5F5F5] transition-colors group-hover:text-teal-400">
                  {playground.title}
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-[#B3B3B8]">
                  {playground.description}
                </p>
              </div>

              <div className="mt-6 border-t border-[#2A2A31] pt-4 flex items-center justify-between">
                <Link
                  href={playground.link}
                  className="inline-flex items-center text-xs font-semibold tracking-wider text-teal-400 hover:text-teal-300 transition"
                >
                  Explore Simulator
                </Link>
                <ArrowRight size={14} className="text-teal-400 transition-transform duration-250 group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
