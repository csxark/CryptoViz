"use client";

import React, { useState, useMemo } from "react";
import Navbar from "../../components/layout/Navbar";
import {
  GitPullRequest,
  ChevronRight,
  TrendingUp,
  Cpu,
  Clock,
  Sparkles,
  GitCommit,
  ThumbsUp,
  Calendar,
  AlertCircle
} from "lucide-react";

// Changelog releases data
interface ReleaseInfo {
  version: string;
  date: string;
  title: string;
  badge: "Major" | "Minor" | "Patch";
  summary: string;
  commits: {
    hash: string;
    description: string;
    diffKey: string;
  }[];
  changes: {
    category: "Features" | "Security" | "Performance" | "Fixes";
    items: string[];
  }[];
}

const RELEASES_DATA: ReleaseInfo[] = [
  {
    version: "v2.0.0",
    date: "July 15, 2026",
    title: "The Sandbox & Community Release",
    badge: "Major",
    summary: "Introducing the new Client-side API Sandbox Engine, Security Intelligence Blog, and the Interactive Community Hub page.",
    commits: [
      { hash: "8fa21b", description: "feat: add interactive api reference page and ClientSandbox", diffKey: "api-sandbox" },
      { hash: "7c11a9", description: "feat: add fully responsive cryptography blog and modal reader", diffKey: "blog-modal" }
    ],
    changes: [
      {
        category: "Features",
        items: [
          "Interactive API Sandbox: Live endpoint mock triggers connected to real Web Crypto routines.",
          "Dynamic Blog Hub: Inline modal reader, commenting engine, and security post databases.",
          "Community Hub: Live Discord-like mock chat room and solver leaderboards."
        ]
      },
      {
        category: "Performance",
        items: [
          "Optimized static rendering build configurations.",
          "Cleaned up unused TypeScript imports to achieve zero ESLint warning build status."
        ]
      }
    ]
  },
  {
    version: "v1.5.0",
    date: "June 10, 2026",
    title: "Web Workers Multi-threading Update",
    badge: "Minor",
    summary: "Offloaded computationally heavy cipher routines (like Padding Oracle attacks and RSA prime search) to background Web Workers.",
    commits: [
      { hash: "4d9e2b", description: "perf: refactor padding oracle simulation to Web Workers", diffKey: "padding-workers" },
      { hash: "9a3f12", description: "perf: optimize vigenere index offset formulas", diffKey: "vigenere-perf" }
    ],
    changes: [
      {
        category: "Performance",
        items: [
          "Background Worker offloading: Prevents the main UI thread from freezing during deep recursion attacks.",
          "Reduced average execution latency for block cipher visualizers by 45%."
        ]
      },
      {
        category: "Security",
        items: [
          "Disabled unsafe fallback evaluation scripts in the Caesar sandbox."
        ]
      }
    ]
  },
  {
    version: "v1.0.0",
    date: "April 01, 2026",
    title: "The Genesis Release",
    badge: "Major",
    summary: "Initial public launch of CryptoViz. Visualizers for Classical, Symmetric, Asymmetric ciphers, and secure hash functions.",
    commits: [
      { hash: "1a0b3f", description: "feat: initial commit with core cipher visualizer engines", diffKey: "genesis" }
    ],
    changes: [
      {
        category: "Features",
        items: [
          "Core Visualizers: Step-by-step trace animations for Caesar, AES-128, and SHA-256.",
          "Compare Arena: Side-by-side security benchmarking sandbox."
        ]
      }
    ]
  }
];

// Mock git diffs mapping
interface GitDiff {
  filename: string;
  deletions: string[];
  additions: string[];
}

const DIFFS_DB: Record<string, GitDiff> = {
  "api-sandbox": {
    filename: "lib/sandbox/ClientSandbox.ts",
    deletions: [
      "- function mockExecute(endpoint) {",
      "-   return { status: 200, body: 'mock' };",
      "- }"
    ],
    additions: [
      "+ export async function mockExecute(endpoint: string, params: any) {",
      "+   const latency = Math.random() * 200 + 100;",
      "+   await new Promise(r => setTimeout(r, latency));",
      "+   switch(endpoint) {",
      "+     case 'aes': return encryptAES(params.text, params.key);",
      "+     default: throw new Error('Unsupported sandbox endpoint');",
      "+   }",
      "+ }"
    ]
  },
  "blog-modal": {
    filename: "app/blog/page.tsx",
    deletions: [
      "- // TODO: Add blog overlay modal router link"
    ],
    additions: [
      "+ const [selectedPostId, setSelectedPostId] = useState<string | null>(null);",
      "+ // Render responsive modal inline overlay to preserve state",
      "+ {selectedPostId && activePost && (",
      "+   <ModalContainer onClose={() => setSelectedPostId(null)}>",
      "+     <ArticleContent post={activePost} />",
      "+   </ModalContainer>",
      "+ )}"
    ]
  },
  "padding-workers": {
    filename: "lib/workers/attack.worker.ts",
    deletions: [
      "- function runPaddingOracleAttack(ciphertext) {",
      "-   // blocking logic in main process",
      "- }"
    ],
    additions: [
      "+ self.addEventListener('message', (event) => {",
      "+   const { ciphertext, iv } = event.data;",
      "+   const result = executeDecryptRoutines(ciphertext, iv);",
      "+   self.postMessage({ type: 'DONE', payload: result });",
      "+ });"
    ]
  },
  "vigenere-perf": {
    filename: "lib/cipher/vigenere.ts",
    deletions: [
      "- let index = (char.charCodeAt(0) - 65 + keyIndex) % 26;"
    ],
    additions: [
      "+ // Fix Vigenere character boundaries and ignore space indexes",
      "+ const keyShift = keyChar.toUpperCase().charCodeAt(0) - 65;",
      "+ let index = (char.toUpperCase().charCodeAt(0) - 65 + keyShift) % 26;"
    ]
  },
  "genesis": {
    filename: "package.json",
    deletions: [],
    additions: [
      "+ \"name\": \"cryptoviz\",",
      "+ \"version\": \"1.0.0\",",
      "+ \"dependencies\": {",
      "+   \"next\": \"^16.0.0\",",
      "+   \"react\": \"^19.0.0\"",
      "+ }"
    ]
  }
};

// Proposed Feature Roadmap Voting Data
interface RoadmapFeature {
  id: string;
  title: string;
  description: string;
  votes: number;
  category: "Visualizer" | "Attacks" | "Platform";
}

export default function ChangelogPage() {
  // Diff viewer state
  const [selectedDiffKey, setSelectedDiffKey] = useState<string>("api-sandbox");

  // Feature Voting Poll State
  const [roadmap, setRoadmap] = useState<RoadmapFeature[]>([
    { id: "feat-1", title: "ChaCha20-Poly1305 Stream Cipher Visualizer", description: "Step-by-step key stream expansion and XOR visual walkthrough.", votes: 142, category: "Visualizer" },
    { id: "feat-2", title: "Lattice Cryptography Shortest Vector SVP Sandbox", description: "Interactive 2D lattice coordinate grids demonstrating post-quantum geometry.", votes: 118, category: "Visualizer" },
    { id: "feat-3", title: "Hash Collisions / Birthday Paradox simulator", description: "Probability visual slider showing how fast collision boundaries overlap.", votes: 95, category: "Attacks" },
    { id: "feat-4", title: "Elliptic Curve Diffie-Hellman Paint Mixer", description: "Visual analogy using color mixing to explain public-key agreements.", votes: 84, category: "Platform" }
  ]);
  const [hasVoted, setHasVoted] = useState<Record<string, boolean>>({});

  // Suggest a Feature State
  const [customFeatureTitle, setCustomFeatureTitle] = useState("");
  const [customFeatureDesc, setCustomFeatureDesc] = useState("");

  // Upvote Action
  const handleVote = (id: string) => {
    if (hasVoted[id]) return; // Single vote protection

    setRoadmap((prev) =>
      prev.map((item) => (item.id === id ? { ...item, votes: item.votes + 1 } : item))
    );
    setHasVoted((prev) => ({ ...prev, [id]: true }));
  };

  // Submit custom feature suggestion
  const handleSuggestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFeatureTitle.trim() || !customFeatureDesc.trim()) return;

    const newRoadmapItem: RoadmapFeature = {
      id: Math.random().toString(),
      title: customFeatureTitle.trim(),
      description: customFeatureDesc.trim(),
      votes: 1,
      category: "Platform"
    };

    setRoadmap((prev) => [...prev, newRoadmapItem]);
    setHasVoted((prev) => ({ ...prev, [newRoadmapItem.id]: true }));
    setCustomFeatureTitle("");
    setCustomFeatureDesc("");
  };

  // Sorted roadmap list by votes count
  const sortedRoadmap = useMemo(() => {
    return [...roadmap].sort((a, b) => b.votes - a.votes);
  }, [roadmap]);

  const activeDiff = useMemo(() => {
    return DIFFS_DB[selectedDiffKey] || null;
  }, [selectedDiffKey]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090B] font-sans text-zinc-900 dark:text-[#F5F5F5] transition-colors duration-300">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-[#00C2AE] mb-4">
            Project Development
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-950 dark:from-white dark:via-zinc-300 dark:to-white">
            Changelog & Roadmap Poll
          </h1>
          <p className="mt-4 text-base text-zinc-500 dark:text-[#8A8A94] leading-relaxed">
            Inspect our detailed commit diff logs and vote on upcoming ciphers, visual sandboxes, and attacks we are designing next.
          </p>
        </div>

        {/* SECTION 1: Timeline & Git Diff Console */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-20">
          
          {/* Release Timeline (Col Span 3) */}
          <div className="lg:col-span-3 space-y-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-[#00C2AE]">
                <Clock size={20} />
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Release Timeline
              </h2>
            </div>

            <div className="relative border-l-2 border-zinc-200 dark:border-[#2A2A31] pl-6 ml-3 space-y-12">
              {RELEASES_DATA.map((rel) => (
                <div key={rel.version} className="relative">
                  {/* Bullet Marker */}
                  <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-[#09090B] border-2 border-teal-500 dark:border-[#00C2AE]">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500 dark:bg-[#00C2AE]" />
                  </span>

                  {/* Card content */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-base font-extrabold text-zinc-900 dark:text-white">
                        {rel.version}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        rel.badge === "Major"
                          ? "bg-teal-500/10 text-teal-600 dark:text-[#00C2AE]"
                          : rel.badge === "Minor"
                          ? "bg-indigo-500/15 text-indigo-400"
                          : "bg-zinc-200 text-zinc-650"
                      }`}>
                        {rel.badge}
                      </span>
                      <span className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                        <Calendar size={12} />
                        {rel.date}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      {rel.title}
                    </h3>
                    <p className="text-xs sm:text-sm leading-relaxed text-zinc-500 dark:text-[#8A8A94]">
                      {rel.summary}
                    </p>

                    {/* Git Commits List */}
                    <div className="pt-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                        Commit Diff Logs (Click to inspect diff)
                      </span>
                      <div className="space-y-1.5">
                        {rel.commits.map((commit) => (
                          <button
                            key={commit.hash}
                            onClick={() => setSelectedDiffKey(commit.diffKey)}
                            className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                              selectedDiffKey === commit.diffKey
                                ? "bg-teal-500/5 border-teal-500/25 text-teal-600 dark:text-[#00C2AE] font-semibold"
                                : "bg-white dark:bg-[#101013] border-zinc-200 dark:border-[#2A2A31] hover:border-zinc-350 text-zinc-450 hover:text-zinc-650 dark:hover:text-zinc-300"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <GitCommit size={12} />
                              <strong className="opacity-75">{commit.hash}</strong>
                              <span className="opacity-90">{commit.description}</span>
                            </span>
                            <ChevronRight size={12} className="opacity-60 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Diff Viewer Console (Col Span 2) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-[#5865F2]">
                <Cpu size={20} />
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Git Diff Visualizer
              </h2>
            </div>

            {activeDiff ? (
              <div className="rounded-3xl border border-zinc-200 dark:border-[#2A2A31] bg-zinc-950 overflow-hidden shadow-sm flex flex-col h-[400px]">
                {/* Diff Header */}
                <div className="px-4 py-3 bg-[#0d0d0f] border-b border-zinc-900 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-zinc-400 font-semibold truncate pr-4">
                    {activeDiff.filename}
                  </span>
                  <span className="text-[9px] bg-indigo-500/25 text-indigo-400 font-extrabold px-1.5 py-0.2 rounded uppercase shrink-0">
                    CODE DIFF
                  </span>
                </div>

                {/* Diff Contents */}
                <div className="flex-1 p-4 overflow-y-auto font-mono text-[10px] sm:text-xs space-y-1.5 leading-relaxed scrollbar-thin scrollbar-thumb-zinc-900 scrollbar-track-transparent">
                  {activeDiff.deletions.map((line, idx) => (
                    <div key={`del-${idx}`} className="bg-rose-950/20 text-rose-450 dark:text-rose-400 px-2 py-0.5 rounded border-l-2 border-rose-500">
                      {line}
                    </div>
                  ))}
                  {activeDiff.additions.map((line, idx) => (
                    <div key={`add-${idx}`} className="bg-emerald-950/20 text-emerald-400 px-2 py-0.5 rounded border-l-2 border-emerald-500">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-zinc-950 border border-zinc-900 rounded-3xl text-xs text-zinc-500">
                <AlertCircle className="mx-auto text-zinc-600 mb-2" size={24} />
                <p>Select a commit diff from the timeline to inspect changes.</p>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: Upcoming Feature Voting Poll & Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Roadmap Vote Poll (Col Span 3) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                <TrendingUp size={20} />
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Roadmap Feature Voting Poll
              </h2>
            </div>

            <div className="space-y-3.5">
              {sortedRoadmap.map((item) => {
                const voted = hasVoted[item.id] || false;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#101013] p-5 flex items-center justify-between gap-4 shadow-sm hover:shadow transition-all duration-200"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white">
                          {item.title}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-wider bg-zinc-50 dark:bg-black/35 border border-zinc-200 dark:border-[#2A2A31] px-2 py-0.5 rounded text-zinc-450">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-[#8A8A94] leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleVote(item.id)}
                      className={`flex flex-col items-center justify-center h-16 w-16 border rounded-2xl shrink-0 transition-all cursor-pointer select-none ${
                        voted
                          ? "bg-teal-500/5 border-teal-500/35 text-teal-600 dark:text-[#00C2AE]"
                          : "bg-zinc-50 dark:bg-black/35 border-zinc-200 dark:border-[#2A2A31] hover:border-zinc-350 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                      }`}
                    >
                      <ThumbsUp size={16} className={voted ? "fill-teal-500/20" : ""} />
                      <span className="font-mono text-xs font-bold mt-1">
                        {item.votes}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Suggest a Feature Form (Col Span 2) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-[#00C2AE]">
                <Sparkles size={20} />
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Suggest an Addition
              </h2>
            </div>

            <div className="rounded-3xl border border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#101013] p-6 shadow-sm">
              <p className="text-xs text-zinc-500 dark:text-[#8A8A94] leading-relaxed mb-6">
                Do you have a specific cipher, protocol logic, or interactive mathematical sandbox you would like to see visualized? Submit a suggestion below!
              </p>

              <form onSubmit={handleSuggestSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-450 uppercase mb-2">
                    Proposed Feature Name:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ChaCha20 Stream Visualizer"
                    value={customFeatureTitle}
                    onChange={(e) => setCustomFeatureTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-black/35 border border-zinc-200 dark:border-[#2A2A31] rounded-xl text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-450 uppercase mb-2">
                    Description & Specifications:
                  </label>
                  <textarea
                    required
                    placeholder="Provide a detailed mathematical outline of what should be interactive..."
                    rows={4}
                    value={customFeatureDesc}
                    onChange={(e) => setCustomFeatureDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-black/35 border border-zinc-200 dark:border-[#2A2A31] rounded-xl text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-4 py-3 bg-zinc-950 dark:bg-zinc-850 hover:bg-teal-500 dark:hover:bg-[#00C2AE] hover:text-white dark:hover:text-black text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <GitPullRequest size={14} />
                  <span>Submit to Voting Poll</span>
                </button>
              </form>
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/50 dark:border-[#2A2A31]/50 bg-zinc-100/80 dark:bg-[#101013]/40 mt-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-center text-xs text-zinc-400 dark:text-[#8A8A94]">
          CryptoViz Changelog Index. Released under MIT license.
        </div>
      </footer>
    </div>
  );
}
