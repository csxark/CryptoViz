'use client';

import React, { useState, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/footer';
import PracticePageTemplate from "@/components/layout/PracticePageTemplate";
import { Search, ShieldAlert, ArrowRight, Bug } from 'lucide-react';
import Link from 'next/link';
import { AutomatedCryptanalysisWorkbench } from '@/components/attacks/AutomatedCryptanalysisWorkbench';
import SideChannelWaveformLab from "@/components/attacks/SideChannelWaveformLab";

export interface AttackDemoItem {
  id: string;
  slug: string;
  title: string;
  category: 'Brute-Force' | 'Cryptanalysis' | 'Protocol' | 'Side-Channel';
  riskLevel: 'Critical' | 'High' | 'Medium';
  summary: string;
  educationalNote: string;
  tags: string[];
}

export const ATTACK_COLLECTION: AttackDemoItem[] = [
  {
    id: 'aead-nonce-reuse',
    slug: 'aead-nonce-reuse',
    title: 'AEAD Nonce-Reuse Catastrophe',
    category: 'Cryptanalysis',
    riskLevel: 'Critical',
    summary: 'Reusing one AES-GCM nonce lets an attacker solve for the GHASH key in GF(2¹²⁸) and forge a tag the real verifier accepts.',
    educationalNote: 'The "forbidden attack" (Joux): the tag pad E_K(J0) depends only on the nonce, so two messages under one nonce cancel it, leaving ΔT = ΔC·H² — a unique GF(2¹²⁸) square root recovers H, then any message can be forged. Never reuse a GCM nonce; AES-GCM-SIV (RFC 8452) survives reuse.',
    tags: ['AES-GCM', 'GHASH', 'GF(2¹²⁸)', 'Nonce Reuse', 'Forgery', 'AEAD'],
  },
  {
    id: 'signature-nonce-reuse',
    slug: 'signature-nonce-reuse',
    title: 'Signature Nonce-Reuse & Malleability',
    category: 'Cryptanalysis',
    riskLevel: 'Critical',
    summary: 'Recovering an ECDSA private key from two secp256k1 signatures that reused the same nonce, plus signature malleability.',
    educationalNote: 'The real bug behind the Sony PS3 signing-key leak in 2010 — reusing k makes r repeat, letting anyone solve for the private key. Fixed by deterministic nonces (RFC 6979) or a CSPRNG.',
    tags: ['ECDSA', 'secp256k1', 'Nonce Reuse', 'Malleability', 'Key Recovery'],
  },
  {
    id: 'automated-cryptanalysis',
    slug: 'automated-cryptanalysis',
    title: 'Automated Cryptanalysis Solver',
    category: 'Cryptanalysis',
    riskLevel: 'High',
    summary: 'Heuristic optimization and quadgram language models automatically breaking monoalphabetic substitution ciphers.',
    educationalNote: 'Demonstrates how statistical patterns in natural languages allow computers to break large cryptographic key spaces in seconds without knowing the key.',
    tags: ['Hill-Climbing', 'Quadgrams', 'Heuristics', 'Substitution'],
  },
  {
    id: 'brute-force',
    slug: 'brute-force',
    title: 'Brute-Force Key Search',
    category: 'Brute-Force',
    riskLevel: 'Critical',
    summary: 'Systematically testing all possible key combinations until the correct key is found.',
    educationalNote: 'Increasing key sizes (e.g. from 56-bit DES to 256-bit AES) exponentially increases search complexity beyond the computational capability of classical computers.',
    tags: ['Key Search', 'Exhaustive', 'Entropy'],
  },
  {
    id: 'dictionary',
    slug: 'dictionary',
    title: 'Dictionary & Rainbow Table Attack',
    category: 'Brute-Force',
    riskLevel: 'High',
    summary: 'Testing common passwords and pre-computed hash lookup tables against credential hashes.',
    educationalNote: 'Defended using salted password hashes (PBKDF2, Argon2, bcrypt) which invalidate pre-computed lookup tables.',
    tags: ['Passwords', 'Precomputed', 'Salt'],
  },
  {
    id: 'ecb-leakage',
    slug: 'ecb-leakage',
    title: 'ECB Pattern Leakage Attack',
    category: 'Cryptanalysis',
    riskLevel: 'High',
    summary: 'Exploiting deterministic block encryption to reveal plaintext visual structures.',
    educationalNote: 'Electronic Codebook (ECB) mode encrypts identical plaintext blocks to identical ciphertext blocks. Always use randomized IV modes like CBC or GCM.',
    tags: ['Block Cipher', 'Determinism', 'ECB vs CBC'],
  },
  {
    id: 'replay-attack',
    slug: 'replay-attack',
    title: 'Replay & Packet Transmission Attack',
    category: 'Protocol',
    riskLevel: 'Critical',
    summary: 'Intercepting and re-sending valid authenticated messages to duplicate transactions.',
    educationalNote: 'Mitigated by appending unique nonces, monotonic sequence numbers, or timestamp expiration windows to signed payload streams.',
    tags: ['Network', 'Nonce', 'Timestamps'],
  },
  {
    id: 'timing',
    slug: 'timing',
    title: 'Timing Side-Channel Attack',
    category: 'Side-Channel',
    riskLevel: 'High',
    summary: 'Measuring microsecond execution delays during string comparisons to deduce secret keys.',
    educationalNote: 'Requires constant-time comparison implementations (`crypto.timingSafeEqual`) to prevent leaking key bytes byte-by-byte.',
    tags: ['Side-Channel', 'Execution Delay', 'Constant-Time'],
  },
  {
    id: 'side-channel-waveform',
    slug: 'side-channel-waveform',
    title: 'Power & Cache Side-Channel Analyzer',
    category: 'Side-Channel',
    riskLevel: 'High',
    summary: 'Interactive RSA SPA waveform, AES DPA correlation, and Flush+Reload cache-line heatmap simulations.',
    educationalNote: 'Shows how secret-dependent power and memory-access patterns can leak information, and why constant-time, cache-oblivious, and hardware-accelerated implementations matter.',
    tags: ['SPA', 'DPA', 'Flush+Reload', 'Cache'],
  },
  {
    id: 'dh-mitm',
    slug: 'dh-mitm',
    title: 'Diffie-Hellman Man-in-the-Middle Attack',
    category: 'Protocol',
    riskLevel: 'Critical',
    summary: 'Eve intercepts and substitutes public keys in unauthenticated Diffie-Hellman, establishing dual shared secrets with Alice and Bob.',
    educationalNote: 'Mitigated by authenticating public keys via digital signatures (Station-to-Station), PKI, or certificates so substitution attempts are detected.',
    tags: ['Diffie-Hellman', 'Key Exchange', 'Key Substitution'],
  },
  {
    id: 'bellcore-crt',
    slug: 'bellcore-crt',
    title: 'RSA-CRT Bellcore Fault Attack',
    category: 'Cryptanalysis',
    riskLevel: 'Critical',
    summary: 'Exploiting hardware transient bit-flips during Chinese Remainder Theorem sub-ring calculations to instantly factor RSA modulus n via Euclidean GCD.',
    educationalNote: 'Demonstrates why production crypto implementations require fault detection checks or randomized RSA blinding to prevent hardware fault injection attacks.',
    tags: ['RSA', 'CRT', 'Fault Injection', 'GCD'],
  },
  {
    id: 'birthday-attack',
    slug: 'birthday-attack',
    title: 'Birthday Paradox & Hash Collision Attack',
    category: 'Cryptanalysis',
    riskLevel: 'High',
    summary: 'Interactive exploration of the birthday paradox demonstrating collision probability growth and testing collision resistance of various hash sizes.',
    educationalNote: 'For an n-bit hash, expect collisions after ~2^(n/2) messages, not 2^n. This underlies birthday attacks on MD5, SHA-1, and smaller hash functions.',
    tags: ['Birthday Paradox', 'Hash Collision', 'Probability', 'MD5', 'SHA-1'],
  },
  {
    id: 'differential-cryptanalysis',
    slug: 'differential-cryptanalysis',
    title: 'Differential Cryptanalysis Demo',
    category: 'Cryptanalysis',
    riskLevel: 'High',
    summary: 'Interactive visualization of differential characteristics in block ciphers showing how input bit differences propagate through encryption rounds.',
    educationalNote: 'Demonstrates how tracking ΔX → ΔY bit patterns through S-boxes can reveal key bits, requiring careful S-box design and mixing functions.',
    tags: ['Block Cipher', 'S-Box', 'Differential', 'DES', 'Characteristics'],
  },
  {
    id: 'entropy-calculator',
    slug: 'entropy-calculator',
    title: 'Shannon Entropy & NIST Randomness Estimator',
    category: 'Cryptanalysis',
    riskLevel: 'Medium',
    summary: 'Calculate Shannon entropy and NIST statistical tests on byte sequences to quantify randomness quality and detect weak entropy sources.',
    educationalNote: 'True entropy should approach 8 bits per byte. Tests like frequency monobit, poker, and runs detect patterns that indicate poor RNG implementations.',
    tags: ['Entropy', 'Randomness', 'NIST', 'Shannon', 'Statistical'],
  },
  {
    id: 'frequency-analysis',
    slug: 'frequency-analysis',
    title: 'Frequency Analysis & Cryptanalysis',
    category: 'Cryptanalysis',
    riskLevel: 'Medium',
    summary: 'Interactive cipher text frequency analysis tool revealing plaintext structure through character and n-gram statistical patterns.',
    educationalNote: 'Demonstrates why simple substitution ciphers are broken — natural language letter frequencies (E, T, A) survive encryption and leak plaintext structure.',
    tags: ['Substitution', 'Frequency', 'Language Model', 'Classical', 'Statistics'],
  },
  {
    id: 'length-extension',
    slug: 'length-extension',
    title: 'Length Extension Attack on MAC & Hash Functions',
    category: 'Cryptanalysis',
    riskLevel: 'High',
    summary: 'Demonstrating how hash functions using Merkle-Damgård construction are vulnerable to appending forged data without knowing the secret key.',
    educationalNote: 'MD5, SHA-1, SHA-2 all vulnerable; HMAC and SHA-3 sponge construction mitigate this. Requires understanding hash state and padding schemes.',
    tags: ['MAC', 'Hash', 'Merkle-Damgård', 'HMAC', 'Forgery'],
  },
  {
    id: 'linear-cryptanalysis',
    slug: 'linear-cryptanalysis',
    title: 'Linear Cryptanalysis Demo',
    category: 'Cryptanalysis',
    riskLevel: 'High',
    summary: 'Interactive visualization showing how linear approximations of S-boxes create statistical biases that can recover key bits from ciphertexts.',
    educationalNote: 'More practical than differential analysis; exploits linear bias in S-box output, requiring careful S-box construction to minimize linear approximation probability.',
    tags: ['Block Cipher', 'S-Box', 'Linear', 'DES', 'Bias'],
  },
  {
    id: 'meet-in-the-middle',
    slug: 'meet-in-the-middle',
    title: 'Meet-in-the-Middle Time-Space Attack',
    category: 'Brute-Force',
    riskLevel: 'High',
    summary: 'Trading computational time for memory by precomputing intermediate values, reducing key recovery time from O(2^n) to O(2^(n/2)).',
    educationalNote: 'Defeats double-encryption and cascade ciphers; demonstrates why 2DES is insecure despite 112-bit key length. Requires ~2^56 storage for DES.',
    tags: ['Double Encryption', 'Key Search', 'Time-Space Tradeoff', 'Memory', 'DES'],
  },
  {
    id: 'padding-oracle',
    slug: 'padding-oracle',
    title: 'Padding Oracle Attack on CBC Mode',
    category: 'Cryptanalysis',
    riskLevel: 'Critical',
    summary: 'Exploiting server responses to invalid padding to decrypt AES-CBC ciphertexts byte-by-byte without knowing the encryption key.',
    educationalNote: 'Real-world attack (CVE-2010-5330, ASP.NET). Uses XOR with known plaintext feedback to craft oracle queries, decrypting entire messages.',
    tags: ['AES-CBC', 'Padding', 'Oracle', 'XOR', 'CPA'],
  },
  {
    id: 'rsa',
    slug: 'rsa',
    title: 'RSA Attack Playground',
    category: 'Cryptanalysis',
    riskLevel: 'Critical',
    summary: 'Interactive demonstrations of RSA vulnerabilities: small public exponent, common factor, small message, and faulty CRT implementations.',
    educationalNote: 'Tests real RSA parameter choices showing why e=65537 with proper padding (OAEP) and fault detection are essential for secure RSA.',
    tags: ['RSA', 'Modulus', 'Public Exponent', 'Padding', 'Attacks'],
  },
  {
    id: 'side-channel',
    slug: 'side-channel',
    title: 'Side-Channel Attack Playground',
    category: 'Side-Channel',
    riskLevel: 'High',
    summary: 'Interactive simulations of power analysis (SPA/DPA), cache attacks (Flush+Reload), and electromagnetic side-channel attacks on cryptographic implementations.',
    educationalNote: 'Shows why constant-time, cache-oblivious, and hardware-accelerated implementations matter. Real-world attacks on OpenSSL, GnuPG, and others.',
    tags: ['Power', 'Cache', 'Flush+Reload', 'DPA', 'Implementation'],
  },
];
export default function AttackCollectionPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredAttacks = useMemo(() => {
    return ATTACK_COLLECTION.filter((attack) => {
      if (selectedCategory !== 'All' && attack.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          attack.title.toLowerCase().includes(q) ||
          attack.summary.toLowerCase().includes(q) ||
          attack.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [searchQuery, searchQuery.length, selectedCategory]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#060816] text-zinc-900 dark:text-white transition-colors duration-300">
      <Navbar />
      <PracticePageTemplate
        title="Attack Simulator Collection"
        description="Explore interactive, safe simulations of real-world cryptographic attacks including automated hill-climbing solvers, brute-force search, and side-channels."
        eyebrow="SAFE EDUCATIONAL SIMULATORS"
        breadcrumbs={[
          { label: "Practice" },
          { label: "Attack Simulators" },
        ]}
        hideHeader
      >
        {/* Hero Section */}
        <section aria-labelledby="attack-hero-title" className="relative overflow-hidden rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-500/10 via-rose-500/5 to-transparent p-8 sm:p-12 backdrop-blur-2xl">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1 text-xs font-bold text-red-600 dark:text-red-400">
              <ShieldAlert className="h-3.5 w-3.5" />
              SAFE EDUCATIONAL SIMULATORS
            </div>
            <h1 id="attack-hero-title" className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
              Attack Simulator <span className="text-red-500">Collection</span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Explore interactive, safe simulations of real-world cryptographic attacks. Understand vulnerabilities and learn industry-standard mitigations.
            </p>
          </div>
        </section>

        {/* Hardware Side-Channel Featured Lab */}
        <section aria-label="Featured Power and Cache Side-Channel Lab" className="space-y-4">
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/5 via-transparent to-transparent p-1">
            <SideChannelWaveformLab />
          </div>
        </section>

        {/* Automated Cryptanalysis Featured Workbench */}
        <section aria-label="Featured Automated Workbench" className="space-y-4">
          <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-r from-teal-500/5 via-transparent to-transparent p-1">
            <AutomatedCryptanalysisWorkbench />
          </div>
        </section>

        {/* Search & Category Filter */}
        <section aria-label="Attack simulator filters" className="space-y-4 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search attack simulations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search attack simulations"
                className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {['All', 'Brute-Force', 'Cryptanalysis', 'Protocol', 'Side-Channel'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-red-500 text-white shadow-md'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Grid of Attack Simulators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAttacks.map((attack) => (
            <div
              key={attack.id}
              className="flex flex-col justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all backdrop-blur-xl space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 border border-red-500/20 uppercase">
                    {attack.category}
                  </span>
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                    Risk: {attack.riskLevel}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Bug className="h-4 w-4 text-red-500" />
                  {attack.title}
                </h3>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {attack.summary}
                </p>

                {/* Educational Note */}
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950 p-3 text-[11px] text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-800">
                  <strong className="text-red-500 font-bold block mb-0.5">Educational Explanation:</strong>
                  {attack.educationalNote}
                </div>
              </div>

              {/* Bottom Action */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {attack.tags.slice(0, 2).map((t) => (
                    <span key={t} className="text-[9px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>

                <Link
                  href={`/attacks/${attack.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                >
                  Launch Simulator
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </PracticePageTemplate>

      <Footer />
    </div>
  );
}
