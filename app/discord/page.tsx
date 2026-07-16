"use client";

import React, { useState, useMemo } from "react";
import Navbar from "../../components/layout/Navbar";
import {
  Hash,
  Send,
  Search,
  ChevronDown,
  ChevronUp,
  Trophy,
  Users,
  Info
} from "lucide-react";

// Mock Discord Channels Data
interface ChatMessage {
  id: string;
  author: string;
  avatarColor: string;
  role: "moderator" | "developer" | "member" | "bot";
  time: string;
  content: string;
}

const CHANNELS_DATA: Record<string, ChatMessage[]> = {
  announcements: [
    { id: "1", author: "CryptoVizBot", avatarColor: "bg-teal-500 text-black", role: "bot", time: "Today at 9:00 AM", content: "📢 Welcome to CryptoViz 2.0! We have launched the new Interactive API Sandbox and Blog pages. Check them out under the footer Links!" },
    { id: "2", author: "Dr. Elena Vance", avatarColor: "bg-purple-600 text-white", role: "moderator", time: "Today at 10:15 AM", content: "Great work team! Next week we will host a live cipher cracking workshop using our Padding Oracle Attack simulation. RSVP in `#general-crypto`." }
  ],
  "general-crypto": [
    { id: "1", author: "Alice", avatarColor: "bg-blue-500 text-white", role: "member", time: "Yesterday at 4:32 PM", content: "Does anyone know if NIST is planning to standardize any new signature models besides ML-DSA this year?" },
    { id: "2", author: "Anya Petrova", avatarColor: "bg-indigo-600 text-white", role: "developer", time: "Yesterday at 4:45 PM", content: "@Alice Yes! NIST is evaluating additional signature candidates in round 4, focusing on stateful hash-based signatures like LMS/XMSS and other signature schemes like Falcon." },
    { id: "3", author: "Bob", avatarColor: "bg-amber-500 text-white", role: "member", time: "Today at 1:12 PM", content: "Working on a CTF challenge with custom Vigenère encryption... CryptoViz visualizer helped me check my intermediate state. Super cool tool!" }
  ],
  "cipher-help": [
    { id: "1", author: "Charlie", avatarColor: "bg-rose-500 text-white", role: "member", time: "Today at 11:22 AM", content: "I'm trying to run the AES key expansion visualizer but my custom 256-bit key keeps failing. Any help?" },
    { id: "2", author: "Nils Johansson", avatarColor: "bg-emerald-600 text-white", role: "developer", time: "Today at 11:40 AM", content: "@Charlie Double check if you are inputting exactly 32 hex bytes (64 hex characters) or a 32-character ASCII string. If it's shorter, the visualizer padding needs to be enabled in settings." }
  ],
  "pqc-migration": [
    { id: "1", author: "Marc Devries", avatarColor: "bg-cyan-600 text-white", role: "moderator", time: "Yesterday at 2:05 PM", content: "For anyone migrating legacy TLS tunnels, we recommend setting up hybrid key exchanges (X25519 + ML-KEM) to prevent harvest-now-decrypt-later vectors." },
    { id: "2", author: "Dave", avatarColor: "bg-orange-500 text-white", role: "member", time: "Yesterday at 3:10 PM", content: "Thanks @Marc. Are there standard OIDs defined for ML-KEM hybrid modes in X.509 certificates yet?" }
  ]
};

// Automated Bot Responses
const BOT_REPLIES: Record<string, string> = {
  announcements: "I am a read-only channel bot for alerts! Head over to `#general-crypto` to start chatting with the community.",
  "general-crypto": "Hello cipher analyst! Thanks for participating in general discussions. Remember to check out the benchmark tab to see the execution speed of these algorithms on your local CPU!",
  "cipher-help": "Beep boop! If you are having issues with AES or RSA, please make sure your input blocks conform to the standard byte alignments (16 bytes for AES blocks).",
  "pqc-migration": "Quantum threat incoming! Transitioning to ML-KEM or ML-DSA is vital. You can read our latest blog post on Post-Quantum Cryptography for more details!"
};

// FAQ Data
interface FAQItem {
  id: string;
  category: "ciphers" | "sandbox" | "performance" | "general";
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: "faq-1",
    category: "general",
    question: "Can I use CryptoViz ciphers in my production code?",
    answer: "The ciphers visualized inside the interactive app are designed primarily for educational and demonstration purposes. For production security, always rely on standard audited cryptographic libraries like Web Crypto API (built into modern browsers), OpenSSL, or Node.js native 'crypto' modules."
  },
  {
    id: "faq-2",
    category: "performance",
    question: "How fast are the web-worker cipher executions?",
    answer: "All complex ciphers and attack simulations (like our Padding Oracle attack script) are executed inside separate web workers to prevent locking the browser's main UI thread. They typically compute within milliseconds on standard client devices, which you can verify in our live Benchmark page."
  },
  {
    id: "faq-3",
    category: "sandbox",
    question: "How do I authenticate with the API Sandbox?",
    answer: "The API Sandbox uses mock API keys generated dynamically on the client side. You don't need to sign up for an account; you can copy the generated key directly from the API Reference dashboard and test endpoints inline instantly."
  },
  {
    id: "faq-4",
    category: "ciphers",
    question: "Does CryptoViz support elliptic curves (ECC) visualization?",
    answer: "Yes! In the Asymmetric Cryptography section under the ciphers visualizer, you can explore the mathematics of Weierstrass curves, point addition, point doubling, and witness key agreements visually."
  },
  {
    id: "faq-5",
    category: "general",
    question: "How can I contribute a new cipher visualizer?",
    answer: "Contributions are highly encouraged! Please review our Contribution Guidelines on the GitHub repository. To add a cipher, you would declare the cipher schema under `lib/cipher/registry.ts` and implement a corresponding steps visualizer under `components/visualizer/`."
  }
];

// Leaderboard Data
interface LeaderboardEntry {
  rank: number;
  name: string;
  challengesSolved: number;
  score: number;
  badge: string;
}

export default function DiscordPage() {
  // Discord Simulator States
  const [activeChannel, setActiveChannel] = useState<string>("general-crypto");
  const [chatLogs, setChatLogs] = useState<Record<string, ChatMessage[]>>(CHANNELS_DATA);
  const [newMessage, setNewMessage] = useState("");
  
  // FAQ Search States
  const [faqSearch, setFaqSearch] = useState("");
  const [activeFaqCat, setActiveFaqCat] = useState<string>("All");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Leaderboard States
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([
    { rank: 1, name: "AliceInCipherland", challengesSolved: 48, score: 2450, badge: "Master Solver" },
    { rank: 2, name: "DrVance", challengesSolved: 42, score: 2100, badge: "Security Guru" },
    { rank: 3, name: "QuantumLeap", challengesSolved: 39, score: 1950, badge: "PQC Specialist" },
    { rank: 4, name: "HashBrowns", challengesSolved: 33, score: 1650, badge: "Derivation Pro" },
    { rank: 5, name: "NilsJ", challengesSolved: 28, score: 1400, badge: "Code Contributor" }
  ]);
  const [newSolverName, setNewSolverName] = useState("");
  const [newSolverCount, setNewSolverCount] = useState("");

  // Handle Discord chat submission
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      author: "You (Cipher Analyst)",
      avatarColor: "bg-teal-600 text-white",
      role: "member",
      time: "Just now",
      content: newMessage.trim()
    };

    const currentChannel = activeChannel;
    setChatLogs((prev) => ({
      ...prev,
      [currentChannel]: [...(prev[currentChannel] || []), userMsg]
    }));

    setNewMessage("");

    // Simulate Bot Response
    setTimeout(() => {
      const botMsg: ChatMessage = {
        id: Math.random().toString(),
        author: "CryptoVizBot",
        avatarColor: "bg-teal-500 text-black",
        role: "bot",
        time: "Just now",
        content: BOT_REPLIES[currentChannel] || "Beep boop! Welcome to the channel."
      };
      setChatLogs((prev) => ({
        ...prev,
        [currentChannel]: [...(prev[currentChannel] || []), botMsg]
      }));
    }, 1200);
  };

  // Filter FAQ items
  const filteredFaqs = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const matchesSearch =
        item.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
        item.answer.toLowerCase().includes(faqSearch.toLowerCase());
      const matchesCat =
        activeFaqCat === "All" || item.category === activeFaqCat;
      return matchesSearch && matchesCat;
    });
  }, [faqSearch, activeFaqCat]);

  // Submit mock leaderboard entry
  const handleLeaderboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSolverName.trim() || !newSolverCount.trim()) return;

    const count = Number(newSolverCount);
    if (isNaN(count) || count < 0) return;

    const newEntry: LeaderboardEntry = {
      rank: 999, // Will sort later
      name: newSolverName.trim(),
      challengesSolved: count,
      score: count * 50,
      badge: count > 40 ? "Master Solver" : count > 25 ? "Expert Cryptanalyst" : "Novice Cracker"
    };

    // Add and sort
    const updated = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    setLeaderboard(updated);
    setNewSolverName("");
    setNewSolverCount("");
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090B] font-sans text-zinc-900 dark:text-[#F5F5F5] transition-colors duration-300">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-[#00C2AE] mb-4">
            Digital Town Square
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-950 dark:from-white dark:via-zinc-300 dark:to-white">
            Community & Support Hub
          </h1>
          <p className="mt-4 text-base text-zinc-500 dark:text-[#8A8A94] leading-relaxed">
            Connect with cryptography students, discuss cipher implementations, view challenges leaderboard, and read our interactive FAQ browser.
          </p>
        </div>

        {/* SECTION 1: Simulated Discord Console */}
        <div className="mb-16">
          <div className="flex items-center gap-2 mb-6">
            <span className="p-1.5 rounded-lg bg-[#5865F2]/10 text-[#5865F2]">
              <Users size={20} />
            </span>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Live Mock Community Chat
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 rounded-3xl border border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#101013] overflow-hidden shadow-sm min-h-[500px]">
            {/* Sidebar Channels Panel */}
            <div className="bg-zinc-50 dark:bg-[#0C0C0E] border-r border-zinc-200 dark:border-[#2A2A31] p-4 flex flex-col justify-between lg:col-span-1">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-4 px-2">
                  Text Channels
                </span>
                <nav className="space-y-1">
                  {Object.keys(chatLogs).map((channel) => (
                    <button
                      key={channel}
                      onClick={() => setActiveChannel(channel)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeChannel === channel
                          ? "bg-zinc-200 text-zinc-900 dark:bg-[#202025] dark:text-[#F5F5F5]"
                          : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-[#15151a] hover:text-zinc-800 dark:hover:text-zinc-300"
                      }`}
                    >
                      <Hash size={14} className="text-zinc-450" />
                      <span>{channel}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Server Metadata */}
              <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-[#2A2A31] px-2">
                <span className="text-[9px] font-bold text-teal-650 dark:text-teal-400 block mb-1">
                  MOCK CRYPTOVIZ SERVER
                </span>
                <div className="flex items-center gap-1.5 text-xs text-zinc-450">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>143 members online</span>
                </div>
              </div>
            </div>

            {/* Chat Box Panel */}
            <div className="flex flex-col justify-between lg:col-span-3 h-[450px] lg:h-auto">
              {/* Channel Header */}
              <div className="px-6 py-4 border-b border-zinc-150 dark:border-[#2A2A31]/50 flex items-center gap-2 bg-zinc-50/50 dark:bg-[#101013]/60">
                <Hash size={16} className="text-zinc-450" />
                <span className="font-bold text-sm text-zinc-800 dark:text-zinc-150 capitalize">
                  {activeChannel}
                </span>
              </div>

              {/* Chat Message Logs */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {chatLogs[activeChannel]?.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full ${msg.avatarColor} flex items-center justify-center font-bold text-xs shrink-0`}>
                      {msg.author.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          {msg.author}
                        </span>
                        
                        {msg.role === "bot" ? (
                          <span className="text-[9px] bg-teal-500 text-black dark:text-zinc-950 font-extrabold px-1.5 py-0.2 rounded uppercase">
                            BOT
                          </span>
                        ) : msg.role === "moderator" || msg.role === "developer" ? (
                          <span className="text-[9px] bg-indigo-500/20 text-[#5865F2] dark:text-indigo-400 font-bold px-1.5 py-0.2 rounded uppercase">
                            STAFF
                          </span>
                        ) : null}

                        <span className="text-[10px] text-zinc-400">
                          {msg.time}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-650 dark:text-[#B3B3B8] leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-150 dark:border-[#2A2A31]/50 bg-zinc-50/50 dark:bg-[#101013]/40 flex gap-2">
                <input
                  type="text"
                  placeholder={`Send a message to #${activeChannel}...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-[#070709] border border-zinc-200 dark:border-[#2A2A31] rounded-xl text-xs focus:outline-none focus:border-teal-500 text-zinc-800 dark:text-zinc-200"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-teal-500 hover:bg-teal-650 dark:bg-[#00C2AE] dark:hover:bg-[#14D8C2] text-white dark:text-black rounded-xl hover:shadow transition-all cursor-pointer flex items-center justify-center shrink-0"
                  aria-label="Send message"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* SECTION 2: Leaderboard and Interactive Accordion FAQ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Interactive FAQ (Col Span 3) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-[#00C2AE]">
                <Info size={20} />
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Frequently Asked Questions
              </h2>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter FAQ questions..."
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#101013] border border-zinc-200 dark:border-[#2A2A31] rounded-xl text-xs focus:outline-none text-zinc-850 dark:text-zinc-200"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 sm:pb-0">
                {["All", "general", "ciphers", "sandbox", "performance"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveFaqCat(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all uppercase tracking-wider cursor-pointer whitespace-nowrap ${
                      activeFaqCat === cat
                        ? "bg-zinc-900 text-white dark:bg-zinc-800 dark:border-transparent"
                        : "bg-white dark:bg-[#101013] border-zinc-200 dark:border-[#2A2A31] text-zinc-450 hover:border-zinc-350"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* FAQ List Accordion */}
            <div className="space-y-3">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="border border-zinc-200 dark:border-[#2A2A31]/80 rounded-2xl bg-white dark:bg-[#101013] overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setExpandedFaqId(expandedFaqId === faq.id ? null : faq.id)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-zinc-900 dark:text-white transition-colors hover:text-teal-600 dark:hover:text-[#00C2AE] cursor-pointer"
                    >
                      <span>{faq.question}</span>
                      {expandedFaqId === faq.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {expandedFaqId === faq.id && (
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm leading-relaxed text-zinc-500 dark:text-[#8A8A94] border-t border-zinc-100 dark:border-[#2A2A31]/40">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 bg-white dark:bg-[#101013] border border-zinc-200 dark:border-[#2A2A31] rounded-2xl">
                  <p className="text-xs text-zinc-400">No FAQ answers match your filter criteria.</p>
                </div>
              )}
            </div>
          </div>

          {/* Solver Leaderboard (Col Span 2) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                <Trophy size={20} />
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Challenge Solver Leaderboard
              </h2>
            </div>

            {/* Scoreboard Table */}
            <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#101013] overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-black/35 border-b border-zinc-200 dark:border-[#2A2A31] text-zinc-400 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3 text-center w-12">Rank</th>
                    <th className="px-4 py-3">Solvers</th>
                    <th className="px-4 py-3 text-center">Solved</th>
                    <th className="px-4 py-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-150 dark:divide-[#2A2A31]/40">
                  {leaderboard.slice(0, 7).map((entry) => (
                    <tr key={entry.name} className="hover:bg-zinc-50/50 dark:hover:bg-black/10">
                      <td className="px-4 py-3 text-center font-bold">
                        {entry.rank <= 3 ? (
                          <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] text-zinc-950 font-extrabold ${
                            entry.rank === 1
                              ? "bg-amber-400"
                              : entry.rank === 2
                              ? "bg-zinc-300"
                              : "bg-orange-400"
                          }`}>
                            {entry.rank}
                          </span>
                        ) : (
                          <span className="text-zinc-450">{entry.rank}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-zinc-800 dark:text-zinc-200">{entry.name}</p>
                        <p className="text-[9px] text-zinc-450">{entry.badge}</p>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-zinc-700 dark:text-zinc-300">
                        {entry.challengesSolved}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-teal-600 dark:text-[#00C2AE]">
                        {entry.score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Input Submission widget */}
            <div className="rounded-2xl border border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#101013] p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                Join the Solver Ranking
              </h3>
              <form onSubmit={handleLeaderboardSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    required
                    placeholder="Nickname / Alias"
                    value={newSolverName}
                    onChange={(e) => setNewSolverName(e.target.value)}
                    className="px-3 py-2 bg-zinc-50 dark:bg-black/35 border border-zinc-200 dark:border-[#2A2A31] rounded-xl text-xs focus:outline-none"
                  />
                  <input
                    type="number"
                    required
                    placeholder="Solved count"
                    value={newSolverCount}
                    onChange={(e) => setNewSolverCount(e.target.value)}
                    className="px-3 py-2 bg-zinc-50 dark:bg-black/35 border border-zinc-200 dark:border-[#2A2A31] rounded-xl text-xs focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-zinc-950 dark:bg-zinc-850 hover:bg-teal-500 dark:hover:bg-[#00C2AE] hover:text-white dark:hover:text-black text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Register Solved Score
                </button>
              </form>
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/50 dark:border-[#2A2A31]/50 bg-zinc-100/80 dark:bg-[#101013]/40 mt-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-center text-xs text-zinc-400 dark:text-[#8A8A94]">
          CryptoViz Discord Hub. Released under MIT license.
        </div>
      </footer>
    </div>
  );
}
