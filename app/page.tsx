"use client";
import HeroIllustration from "@/components/HeroIllustration";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import Navbar from "../components/layout/Navbar";
import SkeletonCard from "../components/ui/SkeletonCard";
import { Zap, ShieldCheck, BookOpen, ArrowRight } from "lucide-react";
import Footer from "../components/layout/footer";
import LearningJourney from "../components/landing/LearningJourney";
import InteractivePreview from "../components/landing/InteractivePreview";
import WhyCryptoViz from "../components/landing/WhyCryptoViz";
import StatisticsRow from "../components/landing/StatisticsRow";

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
      difficulty: "Beginner",
      time: "12 min",
      popular: true,
      description:
        "Explore the foundations of cryptography: Caesar, ROT13, Vigenère, Playfair, and Rail Fence transposition ciphers.",
      icon: (
        <svg className="h-6 w-6 text-[#00C2AE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      link: "/visualizer/caesar/",
      glowClass: "hover:border-[#00C2AE]/50 hover:shadow-[0_0_30px_rgba(0,194,174,0.1)]"
    },
    {
      title: "Symmetric Cryptosystems",
      difficulty: "Intermediate",
      time: "20 min",
      popular: true,
      description:
        "Watch block and stream ciphers like XOR, One-Time Pad, DES, Triple-DES, and standard AES expand keys and encrypt blocks.",
      icon: (
        <svg className="h-6 w-6 text-[#00C2AE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      link: "/visualizer/aes/",
      glowClass: "hover:border-[#00C2AE]/50 hover:shadow-[0_0_30px_rgba(0,194,174,0.1)]"
    },
    {
      title: "Secure Hash Functions",
      difficulty: "Intermediate",
      time: "15 min",
      popular: false,
      description:
        "Analyse compression, round constants, and padding structures of MD5, SHA-256, SHA-512, HMAC, and Bcrypt derivation.",
      icon: (
        <svg className="h-6 w-6 text-[#00C2AE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      link: "/visualizer/sha256/",
      glowClass: "hover:border-[#00C2AE]/50 hover:shadow-[0_0_30px_rgba(0,194,174,0.1)]"
    },
    {
      title: "Asymmetric Cryptography",
      difficulty: "Advanced",
      time: "35 min",
      popular: true,
      description:
        "Demystify RSA encryption, Diffie-Hellman key exchanges (featuring paint mixing), and ECDSA P-256 elliptic signatures.",
      icon: (
        <svg className="h-6 w-6 text-[#00C2AE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      link: "/visualizer/rsa/",
      glowClass: "hover:border-[#00C2AE]/50 hover:shadow-[0_0_30px_rgba(0,194,174,0.1)]"
    },
    {
      title: "Merkle Trees & Integrity",
      difficulty: "Advanced",
      time: "20 min",
      popular: true,
      description:
        "Explore cryptographic hash trees and data integrity. Construct binary trees, generate audit paths, and verify Merkle proofs interactively.",
      icon: (
        <svg className="h-6 w-6 text-[#00C2AE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v4m0 0L8 12m4-8l4 4M8 12h8m-8 0v4m8-4v4" />
        </svg>
      ),
      link: "/merkle/",
      glowClass: "hover:border-[#00C2AE]/50 hover:shadow-[0_0_30px_rgba(0,194,174,0.1)]"
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090B] text-[#F5F5F5] font-sans antialiased">
      <Navbar />
      <Analytics />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#09090B]">
        {/* Unified Design System Vector Ambient Underlay */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00C2AE]/5 blur-[200px]" />
          <div className="absolute -left-40 top-10 h-[450px] w-[450px] rounded-full bg-[#008A7C]/3 blur-[150px]" />
        </div>
 
        {/* Architecture Grid Mesh */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(#2A2A31 1px, transparent 1px),
              linear-gradient(90deg, #2A2A31 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            backgroundPosition: "center center",
            animation: "gridMove 20s linear infinite",
          }}
        />
 
        {/* Floating Particles & Ambient Glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00C2AE]/5 blur-[150px] animate-pulse duration-[6000ms]" />
          <div className="absolute right-[-10%] top-[10%] h-[500px] w-[500px] rounded-full bg-[#008A7C]/10 blur-[180px]" />
 
          <div className="absolute left-10 top-24 h-1.5 w-1.5 rounded-full bg-[#00C2AE] animate-ping opacity-60" />
          <div className="absolute left-72 top-40 h-1 w-1 rounded-full bg-[#14D8C2] animate-pulse opacity-40" />
          <div className="absolute right-40 top-32 h-2 w-2 rounded-full bg-[#008A7C] animate-pulse opacity-50" />
        </div>
 
        <div className="mx-auto max-w-[1400px] px-6 pb-20 lg:px-8 relative z-10">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_520px]">
            {/* Left Content Column */}
            <div>
              <h1 className="text-5xl font-extrabold leading-[1.3] tracking-tight text-[#F5F5F5] pt-8 lg:text-6xl">
                Interact with
                <span className="block mt-1">Modern</span>
                <span className="block w-fit pr-2 bg-gradient-to-r from-[#00C2AE] to-[#14D8C2] bg-clip-text text-transparent">
                  Cryptography
                </span>
              </h1>
 
              <p className="mt-6 max-w-xl text-base leading-relaxed text-[#B3B3B8]">
                Learn encryption, hashing and secure communication through
                beautiful interactive visualisations designed for students,
                developers and security enthusiasts.
              </p>
 
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/visualizer/caesar/"
                  className="group inline-flex items-center justify-center rounded-lg bg-[#00C2AE] hover:bg-[#14D8C2] px-6 py-3.5 text-sm font-semibold text-[#09090B] shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#00C2AE] focus:ring-offset-2 focus:ring-offset-[#09090B]"
                >
                  Open Playground
                  <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform duration-250" />
                </Link>
 
                <a
                  href="/docs"
                  className="rounded-lg border border-[#2A2A31] bg-[#101013] hover:bg-[#16161A] hover:border-[#8A8A94]/30 px-6 py-3.5 text-sm font-semibold text-[#F5F5F5] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#00C2AE] focus:ring-offset-2 focus:ring-offset-[#09090B]"
                >
                  Documentation
                </a>
              </div>
 
              {/* Hero Mini Stats */}
              <div className="mt-8 flex gap-6 text-sm">
                <div className="text-[#8A8A94]">
                  <strong className="text-[#F5F5F5]">24+</strong> Algorithms
                </div>
                <div className="text-[#8A8A94]">
                  <strong className="text-[#F5F5F5]">15+</strong> Modules
                </div>
                <div className="text-[#8A8A94]">
                  <strong className="text-[#F5F5F5]">100+</strong> Examples
                </div>
              </div>
 
              {/* Minimal Core Features */}
              <div className="mt-12 pt-6 grid grid-cols-3 gap-4">
                <div className="group rounded-xl border border-[#2A2A31] bg-[#16161A] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#00C2AE]/40">
                  <Zap className="mb-3 text-[#00C2AE] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" size={20} />
                  <h4 className="text-sm font-semibold text-[#F5F5F5]">Interactive</h4>
                  <p className="mt-1 text-xs text-[#8A8A94]">Live playground execution</p>
                </div>
 
                <div className="group rounded-xl border border-[#2A2A31] bg-[#16161A] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#00C2AE]/40">
                  <ShieldCheck className="mb-3 text-[#00C2AE] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" size={20} />
                  <h4 className="text-sm font-semibold text-[#F5F5F5]">Secure</h4>
                  <p className="mt-1 text-xs text-[#8A8A94]">Standard algorithms</p>
                </div>
 
                <div className="group rounded-xl border border-[#2A2A31] bg-[#16161A] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#00C2AE]/40">
                  <BookOpen className="mb-3 text-[#00C2AE] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" size={20} />
                  <h4 className="text-sm font-semibold text-[#F5F5F5]">Learn</h4>
                  <p className="mt-1 text-xs text-[#8A8A94]">Step-by-step analytics</p>
                </div>
              </div>
            </div>
 
            {/* Right Side Illustration */}
            <div className="relative flex items-center justify-center overflow-visible">
              <HeroIllustration />
            </div>
          </div>
        </div>
      </section>
 
      {/* Library Grid Section */}
      <section className="w-full py-24 bg-[#101013] border-y border-[#2A2A31] transition-colors duration-300">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#F5F5F5]">Algorithm Library</h2>
            <p className="mt-4 text-[#8A8A94]">Dive into our comprehensive collection of interactive cipher modules.</p>
          </div>
 
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {isLoading
              ? Array.from({ length: 5 }).map((_, idx) => <SkeletonCard key={idx} />)
              : categories.map((cat, idx) => (
                <div
                  key={idx}
                  className={`group relative flex flex-col justify-between rounded-xl border border-[#2A2A31] bg-[#16161A] p-6 shadow-sm transition-all duration-250 hover:-translate-y-1 hover:bg-[#1A1A1F] ${cat.glowClass}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#101013] border border-[#2A2A31]">
                        {cat.icon}
                      </div>
                      <div className="flex items-center space-x-2">
                        {cat.popular && (
                          <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#09090B] bg-[#00C2AE] rounded">
                            Popular
                          </span>
                        )}
                        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#F5F5F5] bg-[#101013] border border-[#2A2A31] rounded">
                          {cat.difficulty}
                        </span>
                        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8A8A94] bg-[#101013] border border-[#2A2A31] rounded">
                          {cat.time}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-[#F5F5F5] transition-colors group-hover:text-[#00C2AE]">
                      {cat.title}
                    </h3>
                    <p className="mt-2 text-sm text-[#B3B3B8] leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-[#2A2A31] pt-4 flex items-center justify-between">
                    <Link
                      href={cat.link}
                      className="inline-flex items-center text-xs font-semibold tracking-wider text-[#00C2AE] hover:text-[#14D8C2]"
                    >
                      Explore Category
                    </Link>
                    <ArrowRight size={14} className="text-[#00C2AE] transition-transform duration-250 group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      <LearningJourney />
      <InteractivePreview />
      <StatisticsRow />
      <WhyCryptoViz />
      <Footer />

      {/* Background Grid Animation Style */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes gridMove {
              0% { background-position: 0 0; }
              100% { background-position: 60px 60px; }
            }
          `,
        }}
      />
    </div>
  );
}