"use client";
import HeroIllustration from "@/components/HeroIllustration";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next"
import Navbar from "../components/layout/Navbar";
import SkeletonCard from "../components/ui/SkeletonCard";
import { Zap, ShieldCheck, BookOpen } from "lucide-react";
import Footer from "../components/layout/footer";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, []);

  const categories = [
    {
      title: "Classical Ciphers",
      description:
        "Explore the foundations of cryptography: Caesar, ROT13, Vigenère, Playfair, and Rail Fence transposition ciphers.",
      icon: (
        <svg className="h-6 w-6 text-[#00C2AE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      link: "/visualizer/caesar/",
      glowClass: "hover:border-[#00C2AE]/50"
    },
    {
      title: "Symmetric Cryptosystems",
      description:
        "Watch block and stream ciphers like XOR, One-Time Pad, DES, Triple-DES, and standard AES expand keys and encrypt blocks.",
      icon: (
        <svg className="h-6 w-6 text-[#00C2AE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      link: "/visualizer/aes/",
      glowClass: "hover:border-[#00C2AE]/50"
    },
    {
      title: "Secure Hash Functions",
      description:
        "Analyse compression, round constants, and padding structures of MD5, SHA-256, SHA-512, HMAC, and Bcrypt derivation.",
      icon: (
        <svg className="h-6 w-6 text-[#00C2AE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      link: "/visualizer/sha256/",
      glowClass: "hover:border-[#00C2AE]/50"
    },
    {
      title: "Asymmetric Cryptography",
      description:
        "Demystify RSA encryption, Diffie-Hellman key exchanges (featuring paint mixing), and ECDSA P-256 elliptic signatures.",
      icon: (
        <svg className="h-6 w-6 text-[#00C2AE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      link: "/visualizer/rsa/",
      glowClass: "hover:border-[#00C2AE]/50"
    },
  ];

  return (
    <div className="min-h-screen bg-black font-sans transition-colors duration-300 text-[#F5F5F5]">
      <Navbar />
      <Analytics />

      {/* Hero Frame */}
      <section className="relative overflow-hidden bg-black">

        {/* Unified Design System Vector Ambient Underlay */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00C2AE]/3 blur-[200px]" />
          <div className="absolute -left-40 top-10 h-[450px] w-[450px] rounded-full bg-[#008A7C]/3 blur-[150px]" />
        </div>

        {/* Architecture Grid Mesh */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(#2A2A31 1px, transparent 1px),
              linear-gradient(90deg, #2A2A31 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />

        <div className="mx-auto max-w-[1400px] px-6  pb-20 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_520px]">
            
            {/* LEFT ENGINE LOGIC INFO */}
            <div>
              {/* Context Element Starters */}
              <div className="absolute left-10 top-24 h-1.5 w-1.5 rounded-full bg-[#00C2AE]/60 animate-pulse" />
              <div className="absolute left-72 top-40 h-1 w-1 rounded-full bg-[#00C2AE]/40 animate-pulse" />

              <h1 className="text-5xl font-extrabold leading-[1.15] tracking-tight text-[#F5F5F5] pt-8 lg:text-6xl">
                Interact with
                <span className="block mt-1">Modern</span>
                <span className="block w-fit bg-gradient-to-r from-[#00C2AE] to-[#14D8C2] bg-clip-text text-transparent pb-2">
                  Cryptography
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-[#8A8A94]">
                Learn encryption, hashing and secure communication through
                beautiful interactive visualisations designed for students,
                developers and security enthusiasts.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/visualizer/caesar/"
                  className="rounded-lg bg-[#00C2AE] hover:bg-[#14D8C2] px-6 py-3.5 text-sm font-semibold text-[#09090B] shadow-md transition-all duration-200"
                >
                  Open Playground &rarr;
                </Link>

                <a
                  href="/docs"
                  className="rounded-lg border border-[#2A2A31] bg-[#101013] hover:bg-[#16161A] hover:border-[#8A8A94]/30 px-6 py-3.5 text-sm font-semibold text-[#F5F5F5] transition-all duration-200"
                >
                  Documentation
                </a>
              </div>

              {/* Minimal Core Cards */}
              <div className="mt-14 pt-20 grid grid-cols-3 gap-4">
                <div className="group rounded-xl border border-[#2A2A31] bg-black p-5 transition-all duration-300">
                  <Zap className="mb-3 text-[#00C2AE]" size={20} />
                  <h4 className="text-sm font-semibold text-[#F5F5F5]">Interactive</h4>
                  <p className="mt-1 text-xs text-[#8A8A94]">Live playground execution</p>
                </div>

                <div className="group rounded-xl border border-[#2A2A31] bg-black p-5 transition-all duration-300">
                  <ShieldCheck className="mb-3 text-[#00C2AE]" size={20} />
                  <h4 className="text-sm font-semibold text-[#F5F5F5]">Secure</h4>
                  <p className="mt-1 text-xs text-[#8A8A94]">Standard algorithms</p>
                </div>

                <div className="group rounded-xl border border-[#2A2A31] bg-black p-5 transition-all duration-300">
                  <BookOpen className="mb-3 text-[#00C2AE]" size={20} />
                  <h4 className="text-sm font-semibold text-[#F5F5F5]">Learn</h4>
                  <p className="mt-1 text-xs text-[#8A8A94]">Step-by-step analytics</p>
                </div>
              </div>
            </div>

            {/* RIGHT MOUNTED VIEWPORT */}
            <div className="relative flex items-center justify-center overflow-visible">
              <HeroIllustration />
            </div>

          </div>
        </div>
      </section>

      {/* Grid Platform Items */}
      <section className="mx-auto max-w-5xl py-12 px-4 sm:px-6 lg:px-8 bg-black overflow-hidden">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isLoading
            ? Array.from({ length: 4 }).map((_, idx) => <SkeletonCard key={idx} />)
            : categories.map((cat, idx) => (
                <div
                  key={idx}
                  className={`group relative flex flex-col justify-between rounded-xl border border-[#2A2A31] bg-black p-6 shadow-sm transition-all duration-200 ${cat.glowClass}`}
                >
                  <div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#16161A] border border-[#2A2A31]">
                      {cat.icon}
                    </div>
                    <h3 className="mt-4 text-base font-bold text-[#F5F5F5] transition-colors group-hover:text-[#00C2AE]">
                      {cat.title}
                    </h3>
                    <p className="mt-2 text-xs text-[#B3B3B8] leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-[#2A2A31] pt-3">
                    <Link
                      href={cat.link}
                      className="inline-flex items-center text-xs font-semibold tracking-wider text-[#00C2AE] hover:text-[#14D8C2]"
                    >
                      Explore Category
                      <span className="ml-1 transition-transform duration-200 group-hover:translate-x-0.5">&rarr;</span>
                    </Link>
                  </div>
                </div>
              ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}