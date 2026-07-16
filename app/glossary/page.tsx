"use client";

import React, { useState, useMemo } from "react";
import Navbar from "../../components/layout/Navbar";
import {
  Search,
  BookOpen,
  RotateCcw,
  CheckCircle,
  XCircle,
  HelpCircle as QuizIcon,
  ChevronRight,
  Flame,
  Zap,
  Lightbulb
} from "lucide-react";

// Glossary terms database
interface GlossaryTerm {
  term: string;
  category: "Symmetric" | "Asymmetric" | "Hashing" | "Key Exchange" | "Protocols" | "Math";
  definition: string;
  formula?: string;
  example: string;
}

const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: "Symmetric Encryption",
    category: "Symmetric",
    definition: "An encryption method where the same secret key is used for both encrypting the plaintext and decrypting the ciphertext.",
    formula: "Ciphertext = E(Key, Plaintext); Plaintext = D(Key, Ciphertext)",
    example: "AES-GCM encrypting HTTPS traffic, or ChaCha20 securing mobile chat payloads."
  },
  {
    term: "Asymmetric Encryption",
    category: "Asymmetric",
    definition: "A cryptographic system that uses pairs of keys: Public keys which may be disseminated widely, and Private keys which are known only to the owner.",
    formula: "Ciphertext = Encrypt(PublicKey, Plaintext); Plaintext = Decrypt(PrivateKey, Ciphertext)",
    example: "RSA-4096 or ECC secp256k1 used in TLS handshakes to securely exchange symmetric keys."
  },
  {
    term: "Cryptographic Hash Function",
    category: "Hashing",
    definition: "A mathematical algorithm that maps data of arbitrary size to a bit array of a fixed size (a hash value) which is practically infeasible to invert.",
    formula: "Hash = H(Message)",
    example: "SHA-256 verifying file integrity, or MD5 (now deprecated due to collision vulnerability)."
  },
  {
    term: "Zero-Knowledge Proof (ZKP)",
    category: "Protocols",
    definition: "A method by which one party (the prover) can prove to another party (the verifier) that a given statement is true, without conveying any information beyond the statement itself.",
    example: "zk-SNARKs proving that a cryptocurrency transaction is valid without revealing the sender, recipient, or balance."
  },
  {
    term: "Salt",
    category: "Hashing",
    definition: "Random data that is used as an additional input to a one-way function that hashes data, a password, or passphrase to safeguard against rainbow table attacks.",
    formula: "Hash = PBKDF(Password + Salt)",
    example: "Argon2id adding a 16-byte random salt to password strings before hashing and saving them in database rows."
  },
  {
    term: "Initialization Vector (IV)",
    category: "Symmetric",
    definition: "An input block of random data used in block cipher modes to introduce entropy and ensure that repeating plaintexts do not produce repeating ciphertexts.",
    example: "AES-CBC requiring a unique 16-byte random IV for every encryption session."
  },
  {
    term: "Entropy",
    category: "Math",
    definition: "A measure of randomness or uncertainty in a system, representing the average amount of information contained in each message received.",
    formula: "H(X) = -Σ P(xi) log2 P(xi)",
    example: "A cryptographically secure pseudorandom number generator (CSPRNG) collecting high entropy from hardware noise sources."
  },
  {
    term: "Diffie-Hellman Key Exchange",
    category: "Key Exchange",
    definition: "A mathematical method of securely agreeing upon a shared secret over an public, unencrypted communications channel without sending the secret itself.",
    formula: "SharedSecret = (g^a mod p)^b mod p = g^(ab) mod p",
    example: "ECDH (Elliptic Curve Diffie-Hellman) creating a transient symmetric key for HTTPS."
  },
  {
    term: "Post-Quantum Cryptography (PQC)",
    category: "Protocols",
    definition: "Cryptographic algorithms (usually based on high-dimensional lattices) designed to be secure against attacks by both classical and quantum computers.",
    example: "ML-KEM (Kyber) and ML-DSA (Dilithium) selected by NIST to replace RSA and ECC key setups."
  },
  {
    term: "Forward Secrecy",
    category: "Protocols",
    definition: "A feature of key-agreement protocols that guarantees that session keys will not be compromised even if the long-term private keys of the servers are compromised in the future.",
    example: "Ephemeral Diffie-Hellman (DHE) generating unique, single-use session keys that are deleted immediately after the connection closes."
  }
];

// Quiz Questions Database
interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: "Which block cipher mode of operation requires an Initialization Vector (IV) to prevent identical plaintext blocks from yielding identical ciphertext blocks?",
    options: [
      "Electronic Codebook (ECB)",
      "Cipher Block Chaining (CBC)",
      "Caesar Substitution",
      "One-Time Pad (OTP)"
    ],
    correctIndex: 1,
    explanation: "Cipher Block Chaining (CBC) XORs each plaintext block with the preceding ciphertext block before encryption, requiring an IV for the first block. Electronic Codebook (ECB) does not use an IV, leaving it vulnerable to pattern analysis."
  },
  {
    id: 2,
    question: "Why does Elliptic Curve Cryptography (ECC) require significantly smaller key sizes than RSA to deliver equivalent cryptographic strength?",
    options: [
      "ECC keys are made of prime factors which are easier to multiply.",
      "The Elliptic Curve Discrete Logarithm Problem (ECDLP) has no known sub-exponential solving algorithms.",
      "ECC operates on plaintext bytes in a stream mode rather than a block mode.",
      "RSA key arithmetic is performed entirely on client-side threads, limiting its performance."
    ],
    correctIndex: 1,
    explanation: "RSA integer factorization can be attacked using sub-exponential algorithms like the General Number Field Sieve (GNFS), forcing key sizes to explode. ECC relies on ECDLP, which only has exponential solvers, allowing smaller keys."
  },
  {
    id: 3,
    question: "What specific attack vector does adding a unique random 'Salt' to password hashes defeat?",
    options: [
      "Distributed Denial of Service (DDoS) requests",
      "Precomputed lookup table attacks (Rainbow Tables)",
      "Quantum computing Shor factorization",
      "SQL injection parameter bypass"
    ],
    correctIndex: 1,
    explanation: "Rainbow tables are precomputed databases of password hashes. Salting passwords makes the output hash unique even for identical passwords, making precomputed hash lookup tables computationally useless."
  },
  {
    id: 4,
    question: "Which post-quantum key encapsulation mechanism was standardized by NIST in 2024 to safeguard key exchange against Shor's algorithm?",
    options: [
      "Ed25519 Ephemeral Curve",
      "ML-KEM (formerly Kyber)",
      "Argon2id Memory Hard",
      "SHA-3 Keccak Core"
    ],
    correctIndex: 1,
    explanation: "ML-KEM (Module-Lattice Key Encapsulation Mechanism, based on Kyber) was officially standardized by NIST in 2024 to offer quantum-resistant key establishment."
  },
  {
    id: 5,
    question: "In Zero-Knowledge Proofs, which parameter guarantees that a cheating prover cannot convince a verifier of a false statement?",
    options: [
      "Completeness",
      "Soundness",
      "Zero-Knowledge",
      "Succinctness"
    ],
    correctIndex: 1,
    explanation: "Soundness is the mathematical property ensuring that if the statement is false, no cheating prover can convince an honest verifier except with a negligibly small probability."
  }
];

export default function GlossaryPage() {
  // Navigation & Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Flashcards state
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Quiz state machine
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Computed Glossary List
  const filteredTerms = useMemo(() => {
    return GLOSSARY_TERMS.filter((item) => {
      const matchesSearch =
        item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.definition.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat =
        activeCategory === "All" || item.category === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [searchTerm, activeCategory]);

  // Flashcards Shuffle
  const handleShuffleFlashcards = () => {
    setIsCardFlipped(false);
    setTimeout(() => {
      setFlashcardIndex(Math.floor(Math.random() * GLOSSARY_TERMS.length));
    }, 150);
  };

  // Next Flashcard
  const handleNextFlashcard = () => {
    setIsCardFlipped(false);
    setTimeout(() => {
      setFlashcardIndex((prev) => (prev + 1) % GLOSSARY_TERMS.length);
    }, 150);
  };

  // Prev Flashcard
  const handlePrevFlashcard = () => {
    setIsCardFlipped(false);
    setTimeout(() => {
      setFlashcardIndex((prev) => (prev - 1 + GLOSSARY_TERMS.length) % GLOSSARY_TERMS.length);
    }, 150);
  };

  // Submit answer choice
  const handleSubmitQuizAnswer = () => {
    if (selectedOption === null || quizSubmitted) return;
    setQuizSubmitted(true);
    
    if (selectedOption === QUIZ_QUESTIONS[currentQuestionIdx].correctIndex) {
      setQuizScore((prev) => prev + 1);
    }
  };

  // Next Quiz Question or Complete
  const handleNextQuizQuestion = () => {
    setSelectedOption(null);
    setQuizSubmitted(false);
    
    if (currentQuestionIdx + 1 < QUIZ_QUESTIONS.length) {
      setCurrentQuestionIdx((prev) => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  // Restart Quiz
  const handleRestartQuiz = () => {
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setQuizSubmitted(false);
    setQuizScore(0);
    setQuizFinished(false);
    setQuizStarted(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090B] font-sans text-zinc-900 dark:text-[#F5F5F5] transition-colors duration-300">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-[#00C2AE] mb-4">
            Educational Resources
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-950 dark:from-white dark:via-zinc-300 dark:to-white">
            Glossary & Quiz Arena
          </h1>
          <p className="mt-4 text-base text-zinc-500 dark:text-[#8A8A94] leading-relaxed">
            Master the vocabulary of secure communications. Study key terms with interactive 3D flashcards and verify your understanding in our quiz challenge.
          </p>
        </div>

        {/* SECTION 1: 3D Flashcards and Quiz Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
          
          {/* Flashcard Flipper */}
          <div className="rounded-3xl border border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#101013] p-6 sm:p-8 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BookOpen className="text-teal-600 dark:text-[#00C2AE]" size={20} />
                  <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Interactive Flashcard Deck</span>
                </div>
                <span className="text-xs text-zinc-400 font-mono">
                  {flashcardIndex + 1} / {GLOSSARY_TERMS.length}
                </span>
              </div>

              {/* Flippable Card container (3D effect) */}
              <div className="perspective-1000 h-56 w-full cursor-pointer group" onClick={() => setIsCardFlipped(!isCardFlipped)}>
                <div className={`relative w-full h-full text-center transition-transform duration-500 transform-style-3d ${
                  isCardFlipped ? "rotate-y-180" : ""
                }`}>
                  {/* Card Front */}
                  <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl border border-zinc-200 dark:border-[#2A2A31]/80 bg-zinc-50 dark:bg-black/35 flex flex-col justify-center items-center p-6 shadow-inner">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-650 dark:text-[#00C2AE] mb-3">
                      {GLOSSARY_TERMS[flashcardIndex].category}
                    </span>
                    <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white group-hover:scale-105 transition-transform">
                      {GLOSSARY_TERMS[flashcardIndex].term}
                    </h3>
                    <p className="mt-4 text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <Lightbulb size={12} />
                      Click card to flip
                    </p>
                  </div>

                  {/* Card Back */}
                  <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl border border-teal-500/20 dark:border-[#00C2AE]/20 bg-white dark:bg-[#101013] flex flex-col justify-center p-6 shadow-lg overflow-y-auto">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                      Definition
                    </span>
                    <p className="text-xs sm:text-sm text-zinc-650 dark:text-[#B3B3B8] leading-relaxed">
                      {GLOSSARY_TERMS[flashcardIndex].definition}
                    </p>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-450 mt-4 mb-1">
                      Real-world Example
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-[#8A8A94] italic leading-relaxed">
                      {GLOSSARY_TERMS[flashcardIndex].example}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mt-8 border-t border-zinc-100 dark:border-[#2A2A31]/50 pt-5">
              <button
                onClick={handleShuffleFlashcards}
                className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                Shuffle Deck
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handlePrevFlashcard}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-white text-xs font-semibold cursor-pointer"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextFlashcard}
                  className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 dark:bg-[#00C2AE] dark:hover:bg-[#14D8C2] text-white dark:text-black text-xs font-semibold cursor-pointer"
                >
                  Next Card
                </button>
              </div>
            </div>
          </div>

          {/* Cryptography Mini-Quiz Arena */}
          <div className="rounded-3xl border border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#101013] p-6 sm:p-8 flex flex-col justify-between shadow-sm">
            {!quizStarted ? (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-6 space-y-6">
                <div className="h-14 w-14 rounded-full bg-teal-500/10 text-teal-600 dark:text-[#00C2AE] flex items-center justify-center">
                  <QuizIcon size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    Cryptographic Quiz Arena
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-zinc-500 dark:text-[#8A8A94] max-w-sm">
                    Test your understanding of symmetric systems, hashing salts, key sizes, and quantum resilience in a 5-question multiple-choice quiz.
                  </p>
                </div>
                <button
                  onClick={() => setQuizStarted(true)}
                  className="px-6 py-3 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-teal-500 dark:hover:bg-[#00C2AE] text-white dark:text-zinc-200 hover:text-white dark:hover:text-black font-semibold text-xs transition-colors cursor-pointer"
                >
                  Start Quiz Challenge
                </button>
              </div>
            ) : quizFinished ? (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-6 space-y-6">
                <div className="h-14 w-14 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <Flame size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white">
                    Quiz Completed!
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-zinc-500 dark:text-[#8A8A94]">
                    You solved <strong className="text-teal-600 dark:text-[#00C2AE]">{quizScore}</strong> out of <strong className="text-zinc-800 dark:text-zinc-200">5</strong> questions correctly.
                  </p>
                </div>

                <div className="w-full max-w-xs bg-zinc-50 dark:bg-black/35 rounded-2xl p-4 border border-zinc-200 dark:border-[#2A2A31]/50 text-xs">
                  <p className="font-bold text-zinc-700 dark:text-zinc-350">
                    {quizScore === 5
                      ? "Graduation Level: Master Cryptanalyst 🏆"
                      : quizScore >= 3
                      ? "Graduation Level: Security Practitioner 🛡️"
                      : "Graduation Level: Novice Cracker 🔑"}
                  </p>
                </div>

                <button
                  onClick={handleRestartQuiz}
                  className="px-6 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-teal-500 text-white font-semibold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  <span>Restart Quiz</span>
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between h-full">
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-[#2A2A31]/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-650 dark:text-[#00C2AE]">
                      Question {currentQuestionIdx + 1} of {QUIZ_QUESTIONS.length}
                    </span>
                    <span className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded text-zinc-550">
                      Score: {quizScore}
                    </span>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white mb-4">
                    {QUIZ_QUESTIONS[currentQuestionIdx].question}
                  </h4>

                  {/* Options List */}
                  <div className="space-y-2">
                    {QUIZ_QUESTIONS[currentQuestionIdx].options.map((opt, idx) => {
                      const isSelected = selectedOption === idx;
                      const isCorrect = idx === QUIZ_QUESTIONS[currentQuestionIdx].correctIndex;

                      let optionStyle = "border-zinc-200 dark:border-[#2A2A31] hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-black/20 text-zinc-850 dark:text-zinc-300";
                      if (isSelected) {
                        optionStyle = "border-teal-500 dark:border-[#00C2AE] bg-teal-500/5 text-teal-600 dark:text-[#00C2AE] font-bold";
                      }
                      if (quizSubmitted) {
                        if (isCorrect) {
                          optionStyle = "border-emerald-500 dark:border-emerald-500/80 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold";
                        } else if (isSelected) {
                          optionStyle = "border-rose-500 dark:border-rose-500/80 bg-rose-500/5 text-rose-550 dark:text-rose-400";
                        } else {
                          optionStyle = "border-zinc-200 dark:border-[#2A2A31] bg-zinc-50/50 dark:bg-black/10 text-zinc-400 opacity-60";
                        }
                      }

                      return (
                        <button
                          key={idx}
                          disabled={quizSubmitted}
                          onClick={() => setSelectedOption(idx)}
                          className={`w-full text-left px-4 py-3 rounded-xl border text-xs sm:text-sm transition-all duration-200 flex items-center justify-between ${
                            !quizSubmitted ? "cursor-pointer" : "cursor-default"
                          } ${optionStyle}`}
                        >
                          <span>{opt}</span>
                          {quizSubmitted && isCorrect && <CheckCircle size={14} className="text-emerald-500 shrink-0" />}
                          {quizSubmitted && isSelected && !isCorrect && <XCircle size={14} className="text-rose-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Explanation or Next Button */}
                <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-[#2A2A31]/40 flex flex-col gap-4">
                  {quizSubmitted && (
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-[#2A2A31]/50 text-xs leading-relaxed text-zinc-500 dark:text-[#8A8A94]">
                      <span className="font-bold block mb-1 text-zinc-700 dark:text-zinc-350">Explanation:</span>
                      {QUIZ_QUESTIONS[currentQuestionIdx].explanation}
                    </div>
                  )}

                  <div className="flex justify-end">
                    {!quizSubmitted ? (
                      <button
                        onClick={handleSubmitQuizAnswer}
                        disabled={selectedOption === null}
                        className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all select-none ${
                          selectedOption !== null
                            ? "bg-zinc-950 dark:bg-zinc-800 hover:bg-teal-500 text-white cursor-pointer"
                            : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 cursor-not-allowed"
                        }`}
                      >
                        Submit Answer
                      </button>
                    ) : (
                      <button
                        onClick={handleNextQuizQuestion}
                        className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-650 dark:bg-[#00C2AE] dark:hover:bg-[#14D8C2] text-white dark:text-black text-xs font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <span>{currentQuestionIdx + 1 === QUIZ_QUESTIONS.length ? "Finish Quiz" : "Next Question"}</span>
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: Complete Searchable Glossary Index */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-[#00C2AE]">
              <Zap size={20} />
            </span>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Cryptographic Terms Index
            </h2>
          </div>

          {/* Search filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-[#2A2A31] pb-6">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 md:pb-0">
              {["All", "Symmetric", "Asymmetric", "Hashing", "Key Exchange", "Protocols", "Math"].map((cat) => (
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
                placeholder="Search term vocabulary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#101013] border border-zinc-200 dark:border-[#2A2A31] rounded-xl text-xs focus:outline-none focus:border-teal-500 dark:focus:border-[#00C2AE] text-zinc-800 dark:text-zinc-200"
              />
            </div>
          </div>

          {/* Grid list of Glossary Cards */}
          {filteredTerms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredTerms.map((term, idx) => (
                <div
                  key={idx}
                  className="rounded-3xl border border-zinc-200/60 dark:border-[#2A2A31] bg-white dark:bg-[#101013] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                        {term.term}
                      </h3>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-zinc-50 dark:bg-black/35 border border-zinc-200 dark:border-[#2A2A31] px-2.5 py-1 rounded-full text-zinc-500 dark:text-[#8A8A94]">
                        {term.category}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-zinc-500 dark:text-[#8A8A94] leading-relaxed mb-4">
                      {term.definition}
                    </p>

                    {term.formula && (
                      <div className="bg-zinc-50 dark:bg-black/35 border border-zinc-200 dark:border-[#2A2A31]/40 rounded-xl p-3 font-mono text-[10px] sm:text-xs text-teal-650 dark:text-teal-400 overflow-x-auto whitespace-nowrap mb-4">
                        <code>{term.formula}</code>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-zinc-100 dark:border-[#2A2A31]/40 flex gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-0.5">
                      Example:
                    </span>
                    <p className="text-xs text-zinc-550 dark:text-zinc-400 italic">
                      {term.example}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-[#101013] border border-zinc-200 dark:border-[#2A2A31] rounded-3xl">
              <p className="text-xs text-zinc-400">No glossary terms match your search query.</p>
            </div>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/50 dark:border-[#2A2A31]/50 bg-zinc-100/80 dark:bg-[#101013]/40 mt-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-center text-xs text-zinc-400 dark:text-[#8A8A94]">
          CryptoViz Glossary Index. Released under MIT license.
        </div>
      </footer>

      {/* Add custom 3D card flipping CSS helper directly to avoid global bundle issues */}
      <style dangerouslySetInnerHTML={{__html: `
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}} />
    </div>
  );
}
