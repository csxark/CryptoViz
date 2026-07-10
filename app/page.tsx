"use client";

import Image from "next/image";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next"
import Navbar from "../components/layout/Navbar";
import Typewriter from "../components/layout/typewriter";

import Footer from "../components/layout/footer";
export default function Home() {

  const categories = [
    {
      title: "Classical Ciphers",
      description:
        "Explore the foundations of cryptography: Caesar, ROT13, Vigenère, Playfair, and Rail Fence transposition ciphers.",
      icon: (
        <svg
          className="h-6 w-6 text-teal-600 dark:text-teal-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
      link: "/visualizer/caesar/",
      glowClass: "hover:shadow-[0_0_25px_rgba(13,148,136,0.15)] dark:hover:shadow-[0_0_25px_rgba(20,184,166,0.15)]"
    },
    {
      title: "Symmetric Cryptosystems",
      description:
        "Watch block and stream ciphers like XOR, One-Time Pad, DES, Triple-DES, and standard AES expand keys and encrypt blocks.",
      icon: (
        <svg
          className="h-6 w-6 text-indigo-600 dark:text-indigo-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
      link: "/visualizer/aes/",
      glowClass: "hover:shadow-[0_0_25px_rgba(79,70,229,0.15)] dark:hover:shadow-[0_0_25px_rgba(99,102,241,0.15)]"
    },
    {
      title: "Secure Hash Functions",
      description:
        "Analyse compression, round constants, and padding structures of MD5, SHA-256, SHA-512, HMAC, and Bcrypt derivation.",
      icon: (
        <svg
          className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
      link: "/visualizer/sha256/",
      glowClass: "hover:shadow-[0_0_25px_rgba(5,150,105,0.15)] dark:hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]"
    },
    {
      title: "Asymmetric Cryptography",
      description:
        "Demystify RSA encryption, Diffie-Hellman key exchanges (featuring paint mixing), and ECDSA P-256 elliptic signatures.",
      icon: (
        <svg
          className="h-6 w-6 text-rose-600 dark:text-rose-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
      ),
      link: "/visualizer/rsa/",
      glowClass: "hover:shadow-[0_0_25px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_0_25px_rgba(244,63,94,0.15)]"
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans transition-colors duration-300">
      <Navbar />

     <Analytics />
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 left-1/2 -z-10 h-[600px] w-[1000px] -translate-x-1/2 stroke-zinc-200 [mask-image:radial-gradient(100%_100%_at_top,white,transparent)] dark:stroke-zinc-800">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-indigo-500/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-5xl text-center">
  <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-5xl lg:text-6xl">
    
    <span className="block mb-2">Interact with Cryptography,</span>
    
    
    <span className="block text-teal-600 dark:text-teal-400 min-h-[1.2em] sm:min-h-[1.5em]">
      <Typewriter 
        words={[
          "Visualised in Real-Time.",
          "Made Simple.",
          "Explore the World of Cryptography."
        ]}
      />
    </span>
  </h1>
  
  
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js"
              className="font-medium text-zinc-950 dark:text-zinc-50 hover:underline"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn"
              className="font-medium text-zinc-950 dark:text-zinc-50 hover:underline"
            >
              Learning
            </a>{" "}
            center.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/visualizer/caesar/"
              className="rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-teal-500 dark:bg-teal-500 dark:hover:bg-teal-400 hover:scale-[1.02]"
            >
              Open Interactive Playground
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 hover:scale-[1.02]"
            >
              View Documentation
            </a>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="mx-auto max-w-5xl py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {categories.map((cat, idx) => (
                <div
                  key={idx}
                  className={`group relative flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 dark:border-zinc-850 dark:bg-zinc-900/40 ${cat.glowClass}`}
                >
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-950/50">
                      {cat.icon}
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-white transition-colors group-hover:text-teal-600 dark:group-hover:text-teal-400">
                      {cat.title}
                    </h3>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-zinc-100 pt-4 dark:border-zinc-850">
                    <Link
                      href={cat.link}
                      className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-teal-600 hover:text-teal-500 dark:text-teal-400 dark:hover:text-teal-300"
                    >
                      Explore Category 
                      <span className="ml-1 transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
                    </Link>
                  </div>
                </div>
              ))}
        </div>
      </section>

      {/* Tech Stack Info Banner */}
      <section className="mx-auto max-w-5xl py-8 px-4 sm:px-6 lg:px-8 text-center">
        <div className="rounded-2xl border border-zinc-200/60 bg-zinc-50 p-6 dark:border-zinc-850 dark:bg-zinc-900/10">
          <span className="text-2xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Performance & Security Stack
          </span>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-zinc-400 dark:text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> Next.js
              15 Static Export
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> Web
              Worker Parallel Threading
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> Tailwind
              v4 CSS Engine
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> Zero
              Server Overhead
            </span>
          </div>
        </div>
      </section>
       <Footer />


    </div>
  );
}