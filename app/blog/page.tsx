"use client";

import React, { useState, useMemo } from "react";
import Navbar from "../../components/layout/Navbar";
import {
  Search,
  Clock,
  User,
  Calendar,
  Heart,
  MessageSquare,
  Send,
  Sparkles,
  Cpu,
  X,
  ThumbsUp,
  Award,
  Zap,
  CheckCircle2
} from "lucide-react";

// Structure for Blog Posts
interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: "Symmetric" | "Asymmetric" | "Hash" | "Zero-Knowledge" | "Post-Quantum";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  readTime: string;
  date: string;
  author: string;
  authorRole: string;
  coverGradient: string;
  content: {
    introduction: string;
    sections: {
      title: string;
      text: string;
      codeSnippet?: string;
      codeLang?: string;
      callout?: string;
    }[];
    conclusion: string;
  };
}

// Blog Posts Database
const BLOG_POSTS: BlogPost[] = [
  {
    id: "aes-deep-dive",
    title: "Demystifying AES: How the Rijndael Cipher Protects the Modern Web",
    excerpt: "Take an interactive journey through the mathematical rounds of AES-128. Understand SubBytes, ShiftRows, and the key scheduling architecture.",
    category: "Symmetric",
    difficulty: "Intermediate",
    readTime: "6 min read",
    date: "July 12, 2026",
    author: "Dr. Elena Vance",
    authorRole: "Principal Security Architect",
    coverGradient: "from-blue-600 to-indigo-800",
    content: {
      introduction: "The Advanced Encryption Standard (AES) is the workhorse of digital security. Standardized by NIST in 2001 after a multi-year competition won by Belgian cryptographers Joan Daemen and Vincent Rijmen, it encrypts everything from your TLS web sessions to secure chats. In this article, we break down the 10 internal processing rounds that secure a 128-bit block.",
      sections: [
        {
          title: "The State Matrix: Operating on 16 Bytes",
          text: "Unlike stream ciphers, AES processes data in fixed 128-bit blocks (16 bytes). These 16 bytes are arranged in a 4x4 matrix, called the State. Every step of the algorithm manipulates this matrix sequentially.",
          codeSnippet: "// AES State Matrix Layout\n[\n  [S0,0, S0,1, S0,2, S0,3],\n  [S1,0, S1,1, S1,2, S1,3],\n  [S2,0, S2,1, S2,2, S2,3],\n  [S3,0, S3,1, S3,2, S3,3]\n]",
          codeLang: "javascript"
        },
        {
          title: "The Four Operations of a Single Round",
          text: "Each of the main rounds (9 for AES-128, 11 for AES-192, and 13 for AES-256) performs four mathematical operations:",
          callout: "1. SubBytes: Non-linear byte substitution using a lookup table (S-Box) to provide 'confusion'.\n2. ShiftRows: Transposing rows of the state to provide 'diffusion'.\n3. MixColumns: Multiplying matrix columns by a fixed polynomial in Galois Field GF(2^8).\n4. AddRoundKey: XORing each byte of the state with the round key schedule."
        },
        {
          title: "Why MixColumns is Essential",
          text: "Without the MixColumns step, each byte in the block would be encrypted independently of the other columns. This would make the cipher vulnerable to localized analysis. MixColumns provides vertical diffusion across bytes, ensuring that changing a single bit in the input plaintext completely changes every byte of the resulting ciphertext."
        }
      ],
      conclusion: "AES is mathematically sound, highly optimized in hardware (via AES-NI instructions), and has resisted all practical cryptanalysis for over two decades. Understanding its round-based structure helps developers write side-channel resistant implementations."
    }
  },
  {
    id: "rsa-vs-ecc",
    title: "Why RSA is Shrinking and Elliptic Curves (ECC) are Taking Over",
    excerpt: "Compare the mathematical underpinnings of RSA and ECC. Explore why a 256-bit ECC key offers equivalent security to a massive 3072-bit RSA key.",
    category: "Asymmetric",
    difficulty: "Advanced",
    readTime: "8 min read",
    date: "July 8, 2026",
    author: "Nils Johansson",
    authorRole: "Cryptographic Researcher",
    coverGradient: "from-teal-600 to-emerald-800",
    content: {
      introduction: "For decades, RSA (Rivest-Shamir-Adleman) was the default algorithm for key exchange and digital signatures. However, as computational power grew, the size of keys required to keep RSA secure exploded. Enter Elliptic Curve Cryptography (ECC), which uses the geometry of curves over finite fields to provide superior security with tiny keys.",
      sections: [
        {
          title: "The Key Size Crisis",
          text: "RSA relies on the difficulty of factoring the product of two large prime numbers. Unfortunately, algorithms like the General Number Field Sieve (GNFS) make it easier to factor large numbers than to solve generic discrete logarithm problems. Consequently, to maintain standard security levels, RSA key lengths must grow exponentially.",
          callout: "Security Equivalences:\n- 128-bit Security: RSA 3072-bit vs ECC 256-bit\n- 256-bit Security: RSA 15360-bit vs ECC 521-bit"
        },
        {
          title: "The Math of ECC: Points on a Curve",
          text: "Instead of prime multiplication, ECC operates over the equation y^2 = x^3 + ax + b. Key generation involves choosing a generator point G, and multiplying it by a private key scalar d to obtain a public key point Q = dG. Reversing this operation (finding d given Q and G) is the Elliptic Curve Discrete Logarithm Problem (ECDLP), for which no sub-exponential algorithm is known.",
          codeSnippet: "# Python EC Point Addition Mockup\ndef add_points(P, Q):\n    # Calculate slope lambda and intercept\n    # Return point R = P + Q\n    pass",
          codeLang: "python"
        }
      ],
      conclusion: "ECC allows mobile phones, IoT sensors, and smartcards to perform fast cryptographic handshakes with low battery drain and minimal bandwidth. If you are starting a new system today, use Ed25519 or ECDSA over NIST curves instead of RSA."
    }
  },
  {
    id: "post-quantum-pqc",
    title: "Understanding the Quantum Menace: A Beginner's Guide to PQC",
    excerpt: "Shor's algorithm can break RSA and ECC in minutes. Discover how NIST's newly standardized lattice-based ciphers defend our secrets.",
    category: "Post-Quantum",
    difficulty: "Advanced",
    readTime: "7 min read",
    date: "June 28, 2026",
    author: "Anya Petrova",
    authorRole: "Quantum Vulnerability Analyst",
    coverGradient: "from-purple-600 to-indigo-900",
    content: {
      introduction: "Quantum computers don't just speed up calculations; they solve fundamental mathematical problems in completely different ways. Shor's algorithm, running on a sufficiently large quantum computer, will render RSA, ECC, and DH entirely useless. We must prepare now by migrating to Post-Quantum Cryptography (PQC).",
      sections: [
        {
          title: "Shor's Algorithm: The Asymmetric Killer",
          text: "Shor's algorithm solves the discrete logarithm and integer factorization problems in polynomial time. Once large-scale quantum systems exist (possessing several thousand logical qubits), all encrypted traffic recorded today could be decrypted retroactively. This is known as the 'Harvest Now, Decrypt Later' threat."
        },
        {
          title: "Lattice-Based Cryptography: The Defense",
          text: "To defeat quantum attacks, cryptographers turned to high-dimensional geometry. Lattice-based cryptography relies on the difficulty of finding the shortest vector in an n-dimensional lattice grid of points. Even quantum computers cannot solve these problems efficiently.",
          callout: "NIST PQC Standardizations (2024):\n- ML-KEM (formerly Kyber) for Key Encapsulation\n- ML-DSA (formerly Dilithium) for Digital Signatures"
        }
      ],
      conclusion: "The migration to post-quantum standards represents the largest infrastructure upgrade in history. Developers should begin planning hybrid ciphers (combining ECC and ML-KEM) to guarantee safety today and tomorrow."
    }
  },
  {
    id: "zero-knowledge-proofs",
    title: "The Magic of Zero-Knowledge Proofs: Proving Secrets Without Sharing Them",
    excerpt: "Explore the cryptography of ZKPs. Learn about zk-SNARKs and how they power privacy-preserving blockchain networks.",
    category: "Zero-Knowledge",
    difficulty: "Intermediate",
    readTime: "9 min read",
    date: "June 20, 2026",
    author: "Marc Devries",
    authorRole: "Lead Cryptographer, ZK-Labs",
    coverGradient: "from-rose-600 to-pink-850",
    content: {
      introduction: "Imagine proving that you know the password to a safe without opening it, or proving that your credit score is above 750 without revealing your exact score. Zero-Knowledge Proofs (ZKPs) allow a Prover to mathematically convince a Verifier that a statement is true, without leaking any additional information.",
      sections: [
        {
          title: "The Three Core Properties of ZKPs",
          text: "A protocol must satisfy three properties to be considered zero-knowledge:",
          callout: "1. Completeness: If the statement is true, an honest verifier will be convinced by an honest prover.\n2. Soundness: If the statement is false, a cheating prover cannot convince the verifier except with negligible probability.\n3. Zero-Knowledge: If the statement is true, the verifier learns nothing other than this fact."
        },
        {
          title: "What are zk-SNARKs?",
          text: "zk-SNARK stands for 'Zero-Knowledge Succinct Non-Interactive Argument of Knowledge'. They allow proof generation that is small (succinct) and can be verified in milliseconds, without requiring constant back-and-forth communication between the prover and verifier.",
          codeSnippet: "// Concept zk-SNARK constraint\n// Proving knowledge of secret inputs x and y such that:\nx * y === 42",
          codeLang: "javascript"
        }
      ],
      conclusion: "ZKPs are transforming privacy in decentralized finance, self-sovereign identity, and trustless database queries. They represent the frontier of modern cryptographic application."
    }
  }
];

export default function BlogPage() {
  // Navigation & filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  
  // Reading Mode State
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Interaction State for Comments
  const [comments, setComments] = useState<Record<string, { author: string; text: string; date: string }[]>>({
    "aes-deep-dive": [
      { author: "CrypticFox", text: "Excellent breakdown of the MixColumns matrix multiplication! Really clarifies the diffusion aspect.", date: "July 13, 2026" },
      { author: "ByteMe", text: "Is there any risk of side-channel attacks on hardware-level AES engines?", date: "July 14, 2026" }
    ],
    "rsa-vs-ecc": [
      { author: "KeyGenMaster", text: "ECC has made my IoT system so much faster. RSA handshake latency was killing the battery.", date: "July 9, 2026" }
    ]
  });
  const [newCommentName, setNewCommentName] = useState("");
  const [newCommentText, setNewCommentText] = useState("");

  // Reactions State (persisted locally in React state)
  const [reactions, setReactions] = useState<Record<string, { heart: number; clap: number; mindblown: number }>>({
    "aes-deep-dive": { heart: 24, clap: 18, mindblown: 12 },
    "rsa-vs-ecc": { heart: 32, clap: 42, mindblown: 29 },
    "post-quantum-pqc": { heart: 45, clap: 36, mindblown: 54 },
    "zero-knowledge-proofs": { heart: 61, clap: 55, mindblown: 72 }
  });

  // Simulator State: ECC Slider comparison
  const [eccRsaSlider, setEccRsaSlider] = useState(2); // 1 = 80-bit, 2 = 128-bit, 3 = 192-bit, 4 = 256-bit security

  // Simulator State: ZKP Simple Challenge
  const [zkpGuess, setZkpGuess] = useState("");
  const [zkpResult, setZkpResult] = useState<string | null>(null);

  // Newsletter states
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  // Computed post list
  const filteredPosts = useMemo(() => {
    return BLOG_POSTS.filter((post) => {
      const matchesSearch =
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.introduction.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        activeCategory === "All" || post.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const activePost = useMemo(() => {
    return BLOG_POSTS.find((p) => p.id === selectedPostId) || null;
  }, [selectedPostId]);

  // Handle reaction clicks
  const triggerReaction = (postId: string, type: "heart" | "clap" | "mindblown") => {
    setReactions((prev) => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        [type]: prev[postId][type] + 1
      }
    }));
  };

  // Submit Comments
  const handleCommentSubmit = (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!newCommentName.trim() || !newCommentText.trim()) return;

    const newComment = {
      author: newCommentName.trim(),
      text: newCommentText.trim(),
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    };

    setComments((prev) => ({
      ...prev,
      [postId]: [newComment, ...(prev[postId] || [])]
    }));

    setNewCommentName("");
    setNewCommentText("");
  };

  // Handle Newsletter Form
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterSuccess(true);
    setTimeout(() => {
      setNewsletterEmail("");
    }, 3000);
  };

  // ECC Security comparison lookup table
  const ECC_RSA_COMPARISON = [
    { security: "80-bit (Legacy)", rsa: "1024-bit", ecc: "160-bit", timeToCrack: "Minutes by a supercomputer cluster" },
    { security: "128-bit (Standard)", rsa: "3072-bit", ecc: "256-bit", timeToCrack: "Trillions of years (Age of the universe)" },
    { security: "192-bit (Top Secret)", rsa: "7680-bit", ecc: "384-bit", timeToCrack: "Beyond physical limits of computational energy" },
    { security: "256-bit (Military Grade)", rsa: "15360-bit", ecc: "512-bit", timeToCrack: "Mathematically secure until thermodynamics fail" }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090B] font-sans text-zinc-900 dark:text-[#F5F5F5] transition-colors duration-300">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-[#00C2AE] mb-4">
            Security Intelligence
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-950 dark:from-white dark:via-zinc-300 dark:to-white">
            The CryptoViz Chronicles
          </h1>
          <p className="mt-4 text-base text-zinc-500 dark:text-[#8A8A94] leading-relaxed">
            Delve into high-fidelity cryptographic explanations, tutorials, and post-quantum migration advice written by researchers and security engineers.
          </p>
        </div>

        {/* Filter Navigation & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-[#2A2A31] pb-6 mb-10">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {["All", "Symmetric", "Asymmetric", "Hash", "Zero-Knowledge", "Post-Quantum"].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === cat
                    ? "bg-teal-500 text-white dark:bg-[#00C2AE] dark:text-black border-transparent shadow-sm"
                    : "bg-white dark:bg-[#101013] border-zinc-200 dark:border-[#2A2A31] text-zinc-500 dark:text-[#8A8A94] hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#101013] border border-zinc-200 dark:border-[#2A2A31] rounded-xl text-sm focus:outline-none focus:border-teal-500 dark:focus:border-[#00C2AE] text-zinc-800 dark:text-zinc-200"
            />
          </div>
        </div>

        {/* Grid List of Articles */}
        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            {filteredPosts.map((post) => (
              <article
                key={post.id}
                className="group relative flex flex-col rounded-3xl border border-zinc-200/60 dark:border-[#2A2A31] bg-white dark:bg-[#101013] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                {/* Header Cover Image/Gradient */}
                <div className={`h-40 w-full bg-gradient-to-br ${post.coverGradient} p-6 flex flex-col justify-between text-white relative`}>
                  <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
                  <div className="relative z-10 flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-black/35 px-2.5 py-1 rounded-full backdrop-blur-md">
                      {post.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      post.difficulty === "Beginner"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : post.difficulty === "Intermediate"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-rose-500/20 text-rose-400"
                    }`}>
                      {post.difficulty}
                    </span>
                  </div>
                  <div className="relative z-10 flex items-center gap-2 text-xs opacity-90">
                    <Clock size={12} />
                    <span>{post.readTime}</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-[#00C2AE] transition-colors leading-snug">
                      {post.title}
                    </h2>
                    <p className="mt-3 text-sm text-zinc-500 dark:text-[#8A8A94] line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>

                  <div className="mt-6 pt-5 border-t border-zinc-150 dark:border-[#2A2A31]/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-teal-600 dark:text-[#00C2AE]">
                        {post.author.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{post.author}</p>
                        <p className="text-[10px] text-zinc-400">{post.date}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedPostId(post.id)}
                      className="inline-flex items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-teal-500 dark:hover:bg-[#00C2AE] text-white dark:text-zinc-200 hover:text-white dark:hover:text-black font-semibold text-xs py-2.5 px-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      Read Article
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-[#101013] rounded-3xl border border-zinc-200 dark:border-[#2A2A31] mb-20">
            <p className="text-zinc-500 dark:text-[#8A8A94]">No articles matching your search criteria were found.</p>
          </div>
        )}

        {/* Dynamic Concept Simulator widgets (Static section on main page) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
          {/* Simulator 1: Key Strength Equivalence Calculator */}
          <div className="rounded-3xl border border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#101013] p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-2.5 mb-6">
              <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-[#00C2AE]">
                <Cpu size={20} />
              </span>
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                  Interactive Key Size Equivalator
                </h3>
                <p className="text-xs text-zinc-400">
                  Compare security strength scales between RSA and Elliptic Curve Cryptography.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  <span>Target Security bits</span>
                  <span className="text-teal-600 dark:text-[#00C2AE] font-bold">
                    {ECC_RSA_COMPARISON[eccRsaSlider - 1].security}
                  </span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={eccRsaSlider}
                  onChange={(e) => setEccRsaSlider(Number(e.target.value))}
                  className="w-full accent-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-50 dark:bg-black/35 rounded-2xl border border-zinc-200 dark:border-[#2A2A31]/60 p-4 text-center">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                    RSA Key Size
                  </span>
                  <span className="font-mono text-lg font-bold text-zinc-800 dark:text-zinc-200">
                    {ECC_RSA_COMPARISON[eccRsaSlider - 1].rsa}
                  </span>
                </div>

                <div className="bg-zinc-50 dark:bg-black/35 rounded-2xl border border-zinc-200 dark:border-[#2A2A31]/60 p-4 text-center">
                  <span className="text-[10px] text-teal-500 font-bold uppercase tracking-wider block mb-1">
                    ECC Key Size (Recommended)
                  </span>
                  <span className="font-mono text-lg font-bold text-teal-600 dark:text-[#00C2AE]">
                    {ECC_RSA_COMPARISON[eccRsaSlider - 1].ecc}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-zinc-50 dark:bg-black/20 p-4 border border-zinc-200/50 dark:border-[#2A2A31]/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Brute Force Estimate
                </span>
                <p className="text-xs text-zinc-500 dark:text-[#8A8A94] leading-relaxed">
                  {ECC_RSA_COMPARISON[eccRsaSlider - 1].timeToCrack}
                </p>
              </div>
            </div>
          </div>

          {/* Simulator 2: Simple ZKP Alibaba Cave Simulator */}
          <div className="rounded-3xl border border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#101013] p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-2.5 mb-6">
              <span className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                <Sparkles size={20} />
              </span>
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                  Zero-Knowledge Proof Playground
                </h3>
                <p className="text-xs text-zinc-400">
                  Prove you know a hidden key factor without revealing it to the verifier.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-zinc-500 dark:text-[#8A8A94] leading-relaxed">
                Secret Statement: <em>&quot;I know the multiplier that when multiplied by 5 equals the code!&quot;</em>
                <br />
                Our secret code is <strong className="text-zinc-800 dark:text-zinc-150">75</strong>. You want to prove you know the multiplier (15) without outputting the number 15!
              </p>

              <div>
                <label className="block text-xs font-bold text-zinc-450 uppercase mb-2">
                  Enter your Multiplier guess:
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter secret number..."
                    value={zkpGuess}
                    onChange={(e) => setZkpGuess(e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-[#2A2A31] rounded-lg text-sm font-mono focus:outline-none focus:border-teal-500"
                  />
                  <button
                    onClick={() => {
                      const num = Number(zkpGuess);
                      if (num * 5 === 75) {
                        setZkpResult("SUCCESS: ZKP verified! You generated a valid commitment proof (Hash: 0x9f31a2) confirming you know the secret multiplier without revealing it!");
                      } else {
                        setZkpResult("FAILED: The commitment math does not verify. Try again.");
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-800 hover:bg-rose-500 text-white font-semibold text-xs cursor-pointer"
                  >
                    Verify Proof
                  </button>
                </div>
              </div>

              {zkpResult && (
                <div className={`p-4 rounded-xl text-xs leading-relaxed border ${
                  zkpResult.startsWith("SUCCESS")
                    ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/5 border-rose-500/30 text-rose-500"
                }`}>
                  {zkpResult}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Newsletter Subscription Box */}
        <div className="rounded-3xl border border-zinc-200/60 dark:border-[#2A2A31] bg-white dark:bg-[#101013] p-8 md:p-12 shadow-sm text-center relative overflow-hidden max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-purple-500/5 dark:from-[#00C2AE]/5 dark:to-purple-500/5 opacity-80" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <Award className="mx-auto text-teal-500 dark:text-[#00C2AE] mb-4" size={32} />
            <h3 className="text-2xl font-bold text-zinc-950 dark:text-white">
              Subscribe to Cryptographic Dispatch
            </h3>
            <p className="mt-3 text-sm text-zinc-500 dark:text-[#8A8A94] leading-relaxed">
              No spam. Just mathematically sound explanations of consensus algorithms, cipher engineering, and web safety delivered to your inbox once a month.
            </p>

            {newsletterSuccess ? (
              <div className="mt-8 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                <CheckCircle2 size={18} />
                <span>Subscription recorded successfully! Handshake complete.</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  required
                  placeholder="Enter your security address..."
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="flex-1 px-4 py-3 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-[#2A2A31] rounded-xl text-sm focus:outline-none focus:border-teal-500 text-zinc-800 dark:text-zinc-200"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 dark:bg-[#00C2AE] dark:hover:bg-[#14D8C2] text-white dark:text-black font-semibold text-sm shadow-sm hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send size={14} />
                  <span>Join List</span>
                </button>
              </form>
            )}
          </div>
        </div>

      </main>

      {/* Reading Modal (Overlay Reader View) */}
      {selectedPostId && activePost && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-white dark:bg-[#101013] border border-zinc-200 dark:border-[#2A2A31] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className={`p-6 md:p-8 text-white bg-gradient-to-br ${activePost.coverGradient} relative shrink-0`}>
              <div className="absolute inset-0 bg-black/20 mix-blend-multiply" />
              
              <button
                onClick={() => setSelectedPostId(null)}
                className="absolute right-4 top-4 p-2 bg-black/35 rounded-full hover:bg-black/50 transition-colors text-white cursor-pointer z-20"
                aria-label="Close article"
              >
                <X size={16} />
              </button>

              <div className="relative z-10 space-y-3">
                <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <span className="bg-black/35 px-2.5 py-1 rounded-full backdrop-blur-md">
                    {activePost.category}
                  </span>
                  <span className="bg-black/35 px-2.5 py-1 rounded-full backdrop-blur-md">
                    {activePost.difficulty}
                  </span>
                </div>

                <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">
                  {activePost.title}
                </h2>

                <div className="flex items-center gap-4 text-xs opacity-90 pt-2">
                  <div className="flex items-center gap-1">
                    <User size={12} />
                    <span>{activePost.author} ({activePost.authorRole})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>{activePost.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{activePost.readTime}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body (Scrollable Article Content) */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6 text-sm md:text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
              <p className="text-zinc-950 dark:text-white font-medium text-lg border-l-4 border-teal-500 pl-4 py-1">
                {activePost.content.introduction}
              </p>

              {activePost.content.sections.map((section, idx) => (
                <div key={idx} className="space-y-4 pt-4">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    {section.title}
                  </h3>
                  <p>{section.text}</p>
                  
                  {section.codeSnippet && (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-900 p-4 font-mono text-xs text-zinc-300 overflow-x-auto whitespace-pre">
                      <code>{section.codeSnippet}</code>
                    </div>
                  )}

                  {section.callout && (
                    <div className="rounded-xl border border-teal-500/25 dark:border-[#00C2AE]/25 bg-teal-500/5 p-5 text-sm">
                      <pre className="font-sans whitespace-pre-wrap text-zinc-650 dark:text-zinc-300">
                        {section.callout}
                      </pre>
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-6 border-t border-zinc-200 dark:border-[#2A2A31]/50">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
                  Takeaway Conclusion
                </h3>
                <p>{activePost.content.conclusion}</p>
              </div>

              {/* Reactions Box */}
              <div className="py-6 border-y border-zinc-200 dark:border-[#2A2A31]/50 flex items-center justify-between flex-wrap gap-4 bg-zinc-50 dark:bg-black/35 rounded-2xl px-6">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  React to this article
                </span>
                <div className="flex gap-4">
                  <button
                    onClick={() => triggerReaction(activePost.id, "heart")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold cursor-pointer"
                  >
                    <Heart size={14} className="fill-rose-500" />
                    <span>{reactions[activePost.id]?.heart || 0}</span>
                  </button>

                  <button
                    onClick={() => triggerReaction(activePost.id, "clap")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold cursor-pointer"
                  >
                    <ThumbsUp size={14} />
                    <span>{reactions[activePost.id]?.clap || 0}</span>
                  </button>

                  <button
                    onClick={() => triggerReaction(activePost.id, "mindblown")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/25 bg-purple-500/5 hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold cursor-pointer"
                  >
                    <Zap size={14} />
                    <span>{reactions[activePost.id]?.mindblown || 0}</span>
                  </button>
                </div>
              </div>

              {/* Discussions & Comment Section */}
              <div className="space-y-6 pt-6">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <MessageSquare size={18} />
                  Discussions ({comments[activePost.id]?.length || 0})
                </h3>

                {/* Add Comment Form */}
                <form onSubmit={(e) => handleCommentSubmit(e, activePost.id)} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Username / Alias"
                      value={newCommentName}
                      onChange={(e) => setNewCommentName(e.target.value)}
                      className="px-3.5 py-2 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-[#2A2A31] rounded-xl text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
                    />
                  </div>
                  <textarea
                    required
                    placeholder="Contribute to the scientific discussion..."
                    rows={3}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-[#2A2A31] rounded-xl text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-teal-500 dark:bg-[#00C2AE] hover:bg-teal-600 dark:hover:bg-[#14D8C2] text-white dark:text-black font-semibold text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Send size={12} />
                    <span>Submit Comment</span>
                  </button>
                </form>

                {/* Comments List */}
                <div className="space-y-4 pt-4">
                  {comments[activePost.id]?.length > 0 ? (
                    comments[activePost.id].map((comm, idx) => (
                      <div key={idx} className="border-b border-zinc-150 dark:border-[#2A2A31]/40 pb-4 last:border-b-0">
                        <div className="flex items-center gap-2 text-xs mb-1.5">
                          <span className="font-bold text-teal-650 dark:text-teal-400">{comm.author}</span>
                          <span className="text-zinc-400">•</span>
                          <span className="text-zinc-450">{comm.date}</span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-[#B3B3B8] leading-relaxed">
                          {comm.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-500 py-2">No comments yet. Start the conversation!</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 dark:bg-black/50 border-t border-zinc-250 dark:border-[#2A2A31] flex justify-end shrink-0">
              <button
                onClick={() => setSelectedPostId(null)}
                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Back to Articles
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-200/50 dark:border-[#2A2A31]/50 bg-zinc-100/80 dark:bg-[#101013]/40 mt-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-center text-xs text-zinc-400 dark:text-[#8A8A94]">
          CryptoViz Blog Hub. Released under MIT license.
        </div>
      </footer>
    </div>
  );
}
