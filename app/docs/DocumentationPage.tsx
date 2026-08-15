"use client";

import type { Metadata } from "next";

import React, { useState, useEffect, useRef, useMemo } from "react";

import Link from "next/link";
import {
  docCategories,
  DocCategory,
  CipherDocCategory,
  GeneralDocCategory,
  getDocSlug,
  getDocsForTrack,
  type LearningTrack,
} from "./data";
import { DocumentationSection } from "./components/DocumentationSection";
import { MathBlock } from "./components/MathBlock";
import { CodeBlock } from "./components/CodeBlock";
import { ExampleCard } from "./components/ExampleCard";
import { PlaygroundCard } from "./components/PlaygroundCard";
import { ReferenceList } from "./components/ReferenceList";
import { LearningProgressPanel } from "./components/LearningProgressPanel";
import { useDocumentationProgress } from "./components/useDocumentationProgress";
import {
  getTitleScore,
  getDescriptionScore,
} from "../../lib/utils/fuzzySearch";
import GlossaryTextRenderer from "../../components/glossary/GlossaryTextRenderer";

interface SearchItem {
  category: DocCategory;
  field: string;
  snippet: string;
  score?: number;
}

export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState<DocCategory>(
    docCategories[0],
  );
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTrack, setActiveTrack] = useState<LearningTrack | null>(null);

  // Search and highlighting states
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Table of Contents tracking
  const [activeHeadingId, setActiveHeadingId] = useState("overview");

  // Filter docs based on active learning track
  const filteredDocs = useMemo(() => {
    if (!activeTrack) return docCategories;
    return getDocsForTrack(activeTrack);
  }, [activeTrack]);

  const filteredGeneralDocs = useMemo(
    () => filteredDocs.filter((c) => c.type === "general"),
    [filteredDocs],
  );
  const filteredCipherDocs = useMemo(
    () => filteredDocs.filter((c) => c.type === "cipher"),
    [filteredDocs],
  );

  const generalDocs = filteredGeneralDocs;
  const cipherDocs = filteredCipherDocs;

  const docSlugs = useMemo(
    () => docCategories.map((category) => getDocSlug(category.title)),
    [],
  );

  const {
    progress,
    hasLoaded,
    toggleBookmark,
    toggleCompleted,
    clear,
    percent,
  } = useDocumentationProgress(docSlugs);

  // Calculate progress for filtered docs
  const filteredProgress = useMemo(() => {
    const completedInFiltered = filteredDocs.filter((doc) =>
      progress.completed.includes(getDocSlug(doc.title)),
    ).length;
    return {
      completed: completedInFiltered,
      total: filteredDocs.length,
      percent:
        filteredDocs.length > 0
          ? Math.round((completedInFiltered / filteredDocs.length) * 100)
          : 0,
    };
  }, [filteredDocs, progress.completed]);

  const activeSlug = getDocSlug(activeSection.title);
  const isBookmarked = progress.bookmarks.includes(activeSlug);
  const isCompleted = progress.completed.includes(activeSlug);

  // Automatic reading progress detection
  useEffect(() => {
    if (!hasLoaded || isCompleted) return;

    let timeoutId: NodeJS.Timeout;

    const checkCompletion = () => {
      const scrollPos = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      // 95% threshold or close to bottom
      if (scrollPos >= docHeight * 0.95 || docHeight - scrollPos < 100) {
        toggleCompleted(activeSlug);
      }
    };

    const handleScroll = () => {
      clearTimeout(timeoutId);
      // Debounce: ensure user has stopped scrolling (reading) for 1 second near the bottom
      timeoutId = setTimeout(checkCompletion, 1000);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Initial check for short documents
    timeoutId = setTimeout(checkCompletion, 2000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
    };
  }, [activeSlug, isCompleted, hasLoaded, toggleCompleted]);

  // Next / Previous Navigation items
  const currentIndex = filteredDocs.findIndex(
    (c) => c.title === activeSection.title,
  );
  const prevSection = currentIndex > 0 ? filteredDocs[currentIndex - 1] : null;
  const nextSection =
    currentIndex < filteredDocs.length - 1
      ? filteredDocs[currentIndex + 1]
      : null;

  // Generate dynamic TOC elements
  const tocItems = useMemo(() => {
    return activeSection.type === "general"
      ? [
          { id: "overview", title: "Overview" },
          { id: "unit-tests", title: "Unit Tests" },
        ]
      : [
          { id: "overview", title: "Overview" },
          { id: "mathematics", title: "Mathematics" },
          { id: "worked-example", title: "Worked Example" },
          { id: "complexity-security", title: "Complexity & Security" },
          { id: "real-world-applications", title: "Real-world Applications" },
          { id: "implementation-snippets", title: "Implementation Snippets" },
          { id: "interactive-playground", title: "Interactive Playground" },
          { id: "references", title: "References" },
        ];
  }, [activeSection.type]);

  // Inline MDX-like Parser + Search Highlighter
  const renderFormattedText = (text: string, query?: string) => {
    if (!text) return null;

    let processedText = text;
    if (query && query.trim().length > 1) {
      const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`(${escapedQuery})`, "gi");
      processedText = text.replace(regex, "___HL_START___$1___HL_END___");
    }

    const tokenRegex = /(\*\*|`|\[|\]|\(|\)|___HL_START___|___HL_END___)/g;
    const parts = processedText.split(tokenRegex);

    let isBold = false;
    let isCode = false;
    let isHighlight = false;

    let inLinkText = false;
    let linkText = "";
    let inLinkUrl = false;
    let linkUrl = "";

    const result: React.ReactNode[] = [];

    for (let idx = 0; idx < parts.length; idx++) {
      const part = parts[idx];
      if (part === "") continue;

      if (part === "**") {
        isBold = !isBold;
        continue;
      }
      if (part === "`") {
        isCode = !isCode;
        continue;
      }
      if (part === "___HL_START___") {
        isHighlight = true;
        continue;
      }
      if (part === "___HL_END___") {
        isHighlight = false;
        continue;
      }
      if (part === "[") {
        inLinkText = true;
        linkText = "";
        continue;
      }
      if (part === "]") {
        inLinkText = false;
        continue;
      }
      if (part === "(" && idx > 0 && parts[idx - 1] === "]") {
        inLinkUrl = true;
        linkUrl = "";
        continue;
      }
      if (part === ")") {
        inLinkUrl = false;
        result.push(
          <a
            key={`link-${idx}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 dark:text-teal-400 hover:text-teal-500 underline decoration-teal-500/30 hover:decoration-teal-500 underline-offset-4 font-semibold transition-all"
          >
            {linkText}
          </a>,
        );
        continue;
      }

      if (inLinkText) {
        linkText += part;
      } else if (inLinkUrl) {
        linkUrl += part;
      } else {
        let node: React.ReactNode = part;

        if (isCode) {
          node = (
            <code
              key={`code-${idx}-${part}`}
              className="bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 rounded font-mono text-xs text-rose-600 dark:text-rose-455"
            >
              {node}
            </code>
          );
        } else if (typeof part === "string") {
          node = (
            <GlossaryTextRenderer key={`text-${idx}-${part}`} content={part} />
          );
          if (isBold) {
            node = (
              <strong
                key={`bold-${idx}-${part}`}
                className="font-semibold text-zinc-900 dark:text-white"
              >
                {node}
              </strong>
            );
          }
        } else if (isBold) {
          node = (
            <strong
              key={`bold-obj-${idx}`}
              className="font-semibold text-zinc-900 dark:text-white"
            >
              {node}
            </strong>
          );
        }

        if (isHighlight) {
          node = (
            <mark
              key={`hl-${idx}-${typeof node === "string" ? node.slice(0, 10) : "object"}`}
              className="bg-yellow-200/80 dark:bg-yellow-500/35 text-zinc-950 dark:text-yellow-100 px-0.5 rounded shadow-xs font-semibold"
            >
              {node}
            </mark>
          );
        }

        result.push(node);
      }
    }

    return <>{result}</>;
  };

  const handleCopy = (text: string, index: number) => {
    const cleanText = text.replace(/^\d+\.\s*/, "");
    navigator.clipboard.writeText(cleanText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Keyboard shortcut listener for Ctrl+K search toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Autofocus input when search command palette opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Handle Search Input matching with useMemo to avoid setState in effect
  const searchResults = useMemo<SearchItem[]>(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return [];
    }
    const q = searchQuery.toLowerCase().trim();
    const results: SearchItem[] = [];

    filteredDocs.forEach((cat) => {
      // Check title with fuzzy scoring
      const titleScore = getTitleScore(q, cat.title);
      if (titleScore > 0) {
        results.push({
          category: cat,
          field: "Title",
          snippet: cat.title,
          score: titleScore,
        });
      }

      // Check description with fuzzy scoring
      const descScore = getDescriptionScore(q, cat.description);
      if (descScore > 0) {
        results.push({
          category: cat,
          field: "Description",
          snippet: cat.description,
          score: descScore,
        });
      }

      if (cat.type === "general") {
        const general = cat as GeneralDocCategory;
        if (general.content.toLowerCase().includes(q)) {
          const index = general.content.toLowerCase().indexOf(q);
          const start = Math.max(0, index - 30);
          const end = Math.min(general.content.length, index + q.length + 30);
          const snippet =
            (start > 0 ? "..." : "") +
            general.content.substring(start, end) +
            (end < general.content.length ? "..." : "");
          results.push({ category: cat, field: "Content", snippet, score: 40 });
        }
      } else {
        const cipher = cat as CipherDocCategory;

        if (cipher.overview.history.toLowerCase().includes(q)) {
          const text = cipher.overview.history;
          const index = text.toLowerCase().indexOf(q);
          const start = Math.max(0, index - 30);
          const end = Math.min(text.length, index + q.length + 30);
          const snippet =
            (start > 0 ? "..." : "") +
            text.substring(start, end) +
            (end < text.length ? "..." : "");
          results.push({
            category: cat,
            field: "Overview",
            snippet,
            score: 40,
          });
        }

        if (cipher.overview.description.toLowerCase().includes(q)) {
          const text = cipher.overview.description;
          const index = text.toLowerCase().indexOf(q);
          const start = Math.max(0, index - 30);
          const end = Math.min(text.length, index + q.length + 30);
          const snippet =
            (start > 0 ? "..." : "") +
            text.substring(start, end) +
            (end < text.length ? "..." : "");
          results.push({
            category: cat,
            field: "Overview",
            snippet,
            score: 40,
          });
        }

        cipher.mathematics.explanation.forEach((exp) => {
          if (exp.toLowerCase().includes(q)) {
            results.push({
              category: cat,
              field: "Mathematics",
              snippet: exp,
              score: 40,
            });
          }
        });

        cipher.workedExample.steps.forEach((step) => {
          if (step.description.toLowerCase().includes(q)) {
            results.push({
              category: cat,
              field: "Worked Example",
              snippet: step.description,
              score: 40,
            });
          }
        });

        cipher.securityAnalysis.advantages.forEach((adv) => {
          if (adv.toLowerCase().includes(q)) {
            results.push({
              category: cat,
              field: "Advantage",
              snippet: adv,
              score: 40,
            });
          }
        });

        cipher.securityAnalysis.weaknesses.forEach((weak) => {
          if (weak.toLowerCase().includes(q)) {
            results.push({
              category: cat,
              field: "Weakness",
              snippet: weak,
              score: 40,
            });
          }
        });

        cipher.realWorldApplications.forEach((app) => {
          if (app.toLowerCase().includes(q)) {
            results.push({
              category: cat,
              field: "Applications",
              snippet: app,
              score: 40,
            });
          }
        });
      }
    });

    results.sort((a, b) => (b.score || 0) - (a.score || 0));

    return results.slice(0, 8);
  }, [searchQuery, filteredDocs]);

  // Navigate Search results with Keyboard (Arrow keys & Enter)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(
        (prev) => (prev - 1 + searchResults.length) % searchResults.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults[activeIndex]) {
        handleSelectResult(searchResults[activeIndex]);
      }
    }
  };

  const handleSelectResult = (result: SearchItem) => {
    setActiveSection(result.category);
    setActiveQuery(searchQuery);
    setSearchOpen(false);
    setSearchQuery("");

    // Smooth scroll to the target section or field if matched
    setTimeout(() => {
      const fieldId = result.field.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const targetEl = document.getElementById(fieldId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);
  };

  // Observe active headers for the Table of Contents scroll indicator
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveHeadingId(entry.target.id);
          }
        });
      },
      { rootMargin: "-10% 0px -75% 0px", threshold: 0 },
    );

    tocItems.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => {
      tocItems.forEach((item) => {
        const el = document.getElementById(item.id);
        if (el) observer.unobserve(el);
      });
    };
  }, [activeSection, tocItems]);

  const handleTocClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveHeadingId(id);
    }
  };

  const renderGeneralContent = () => {
    if (activeSection.type === "cipher") return null;

    return (
      <section id="overview" className="scroll-mt-20">
        <div className="text-zinc-600 dark:text-zinc-300 space-y-4 text-sm font-sans leading-relaxed">
          {activeSection.content.split("\n").map((paragraph, idx) => {
            if (paragraph.startsWith("•")) {
              return (
                <div
                  key={`bullet-${idx}-${paragraph.slice(0, 20)}`}
                  className="flex items-center gap-3 pl-2 py-1 text-zinc-650 dark:text-zinc-300 font-sans"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                  <span>
                    {renderFormattedText(
                      paragraph.replace("• ", ""),
                      activeQuery,
                    )}
                  </span>
                </div>
              );
            }

            if (
              paragraph.includes("git clone") ||
              paragraph.includes("npm install") ||
              paragraph.includes("npm run")
            ) {
              return (
                <div
                  key={`command-${idx}-${paragraph.slice(0, 20)}`}
                  className="bg-zinc-50 dark:bg-zinc-950 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 font-mono text-xs text-teal-600 dark:text-teal-400 flex justify-between items-center group shadow-sm dark:shadow-inner my-4 transition-colors"
                >
                  <code className="break-all select-text">{paragraph}</code>
                  <button
                    onClick={() => handleCopy(paragraph, idx)}
                    className="text-[10px] bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 hover:border-teal-500/50 px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-800 transition-all font-mono flex items-center gap-1 cursor-pointer active:scale-95 shrink-0 ml-4"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <svg
                          className="w-3.5 h-3.5 text-emerald-500"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <rect
                            x="8"
                            y="2"
                            width="8"
                            height="4"
                            rx="1"
                            ry="1"
                          />
                          <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                        </svg>
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              );
            }

            return (
              <p
                key={`paragraph-${idx}-${paragraph.slice(0, 20)}`}
                className="whitespace-pre-line"
              >
                {renderFormattedText(paragraph, activeQuery)}
              </p>
            );
          })}
        </div>
      </section>
    );
  };

  const renderCipherContent = () => {
    if (activeSection.type !== "cipher") return null;
    const cipher = activeSection as CipherDocCategory;

    return (
      <div className="text-zinc-650 dark:text-zinc-300 space-y-8 text-sm font-sans leading-relaxed">
        <DocumentationSection title="Overview">
          <p>
            <strong>History:</strong>{" "}
            {renderFormattedText(cipher.overview.history, activeQuery)}
          </p>
          <p>{renderFormattedText(cipher.overview.description, activeQuery)}</p>
        </DocumentationSection>

        <DocumentationSection title="Mathematics">
          <p className="text-zinc-500 dark:text-zinc-400 mb-2">
            Encryption Formula:
          </p>
          <MathBlock
            formula={cipher.mathematics.encryptionFormula}
            explanations={cipher.mathematics.explanation.map(
              (definition, index) => ({
                symbol: `Step ${index + 1}`,
                definition,
              }),
            )}
          />

          <p className="text-zinc-500 dark:text-zinc-400 mt-6 mb-2">
            Decryption Formula:
          </p>
          <MathBlock formula={cipher.mathematics.decryptionFormula} />
          <ul className="list-disc list-inside space-y-2 mt-4 text-zinc-500 dark:text-zinc-400">
            {cipher.mathematics.explanation.map((exp, idx) => (
              <li key={`math-exp-${idx}-${exp.slice(0, 20)}`} className="pl-1">
                {renderFormattedText(exp, activeQuery)}
              </li>
            ))}
          </ul>
        </DocumentationSection>

        <DocumentationSection title="Worked Example">
          <ExampleCard
            plaintext={cipher.workedExample.plaintext}
            parameters={cipher.workedExample.parameters}
            steps={cipher.workedExample.steps.map((step) => ({
              ...step,
              description: step.description, // Worked example highlights
            }))}
            finalCiphertext={cipher.workedExample.finalCiphertext}
          />
        </DocumentationSection>

        <DocumentationSection title="Complexity & Security">
          <p>
            <strong>Complexity:</strong>{" "}
            {renderFormattedText(cipher.complexity, activeQuery)}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/50 rounded-lg p-4 transition-colors">
              <h4 className="text-teal-600 dark:text-teal-500 font-mono text-xs font-bold uppercase tracking-widest mb-3">
                Advantages
              </h4>
              <ul className="space-y-2">
                {cipher.securityAnalysis.advantages.map((adv, idx) => (
                  <li
                    key={`adv-${idx}-${adv.slice(0, 20)}`}
                    className="flex gap-2 items-start"
                  >
                    <span className="text-teal-500 select-none">✓</span>
                    <span className="text-zinc-600 dark:text-zinc-400 text-xs">
                      {renderFormattedText(adv, activeQuery)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4 transition-colors">
              <h4 className="text-red-600 dark:text-red-500 font-mono text-xs font-bold uppercase tracking-widest mb-3">
                Weaknesses
              </h4>
              <ul className="space-y-2">
                {cipher.securityAnalysis.weaknesses.map((weak, idx) => (
                  <li
                    key={`weak-${idx}-${weak.slice(0, 20)}`}
                    className="flex gap-2 items-start"
                  >
                    <span className="text-red-500 select-none">✗</span>
                    <span className="text-zinc-600 dark:text-zinc-400 text-xs">
                      {renderFormattedText(weak, activeQuery)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </DocumentationSection>

        <DocumentationSection title="Real-world Applications">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {cipher.realWorldApplications.map((app, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
                    <span className="text-sm font-bold">{idx + 1}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Real-world usage
                  </h3>
                </div>

                <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {renderFormattedText(app, activeQuery)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Security Status
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Based on the documented security analysis
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  cipher.securityAnalysis.weaknesses.length === 0
                    ? "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                }`}
              >
                {cipher.securityAnalysis.weaknesses.length === 0
                  ? "No documented weaknesses"
                  : "Security concerns documented"}
              </span>
            </div>

            <ul className="space-y-2">
              {cipher.securityAnalysis.weaknesses
                .slice(0, 3)
                .map((weak, idx) => (
                  <li
                    key={idx}
                    className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                  >
                    <span className="mt-0.5 text-amber-600">!</span>
                    <span>{renderFormattedText(weak, activeQuery)}</span>
                  </li>
                ))}
            </ul>
          </div>

          {cipher.references.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                References & Protocol Resources
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {cipher.references.map((reference, idx) => (
                  <a
                    key={idx}
                    href={reference.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-teal-700 transition-colors hover:border-teal-400 hover:bg-teal-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-teal-400 dark:hover:bg-teal-950/30"
                  >
                    <span className="font-medium">{reference.title}</span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      Open reference →
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </DocumentationSection>

        <DocumentationSection title="Implementation Snippets">
          <p className="text-zinc-500 dark:text-zinc-400 mb-2">Python:</p>
          <CodeBlock code={cipher.codeSnippets.python} language="python" />

          <p className="text-zinc-500 dark:text-zinc-400 mt-6 mb-2">
            JavaScript:
          </p>
          <CodeBlock
            code={cipher.codeSnippets.javascript}
            language="javascript"
          />
        </DocumentationSection>

        <DocumentationSection title="Interactive Playground">
          <PlaygroundCard link={cipher.playgroundLink} />
        </DocumentationSection>

        <DocumentationSection title="References">
          <ReferenceList references={cipher.references} />
        </DocumentationSection>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-teal-200 dark:selection:bg-teal-500 selection:text-zinc-900 flex flex-col transition-colors duration-300">
      {/* Search Overlay / Command Palette */}
      {searchOpen && (
        <div
          className="fixed inset-0 bg-zinc-900/60 dark:bg-black/80 backdrop-blur-xs z-50 flex items-start justify-center pt-20 px-4"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[500px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input Row */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <svg
                className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                role="combobox"
                aria-expanded={searchOpen}
                aria-controls="search-listbox"
                aria-activedescendant={
                  searchResults.length > 0
                    ? `search-option-${activeIndex}`
                    : undefined
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search documentation (ciphers, setups, architectures)..."
                className="w-full text-sm font-sans bg-transparent border-0 outline-none text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
              />
              <span className="text-[10px] font-mono font-semibold text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 rounded shrink-0 select-none">
                ESC
              </span>
            </div>

            {/* Results list */}
            <div className="overflow-y-auto flex-1 py-2">
              {searchResults.length > 0 ? (
                <div
                  id="search-listbox"
                  role="listbox"
                  className="px-2 space-y-1"
                >
                  {searchResults.map((item, idx) => {
                    const isFocused = idx === activeIndex;
                    return (
                      <button
                        key={`${item.category.title}-${item.field}-${item.snippet.slice(0, 20)}`}
                        id={`search-option-${idx}`}
                        role="option"
                        aria-selected={isFocused}
                        onClick={() => handleSelectResult(item)}
                        className={`w-full text-left p-3 rounded-lg flex flex-col gap-1 transition-all ${
                          isFocused
                            ? "bg-teal-500/10 border-l-2 border-teal-500 dark:bg-teal-500/5 pl-4"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800/40 border-l-2 border-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-teal-650 dark:text-teal-400 uppercase tracking-wider">
                            {item.category.title}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-800/80 px-1 py-0.2 rounded bg-zinc-50 dark:bg-zinc-950 uppercase">
                            {item.field}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans line-clamp-2">
                          {renderFormattedText(item.snippet, searchQuery)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : searchQuery.trim().length >= 2 ? (
                <div className="py-8 text-center text-zinc-400 dark:text-zinc-500 font-sans text-xs">
                  No matching documentation articles found.
                </div>
              ) : (
                <div className="py-8 text-center text-zinc-400 dark:text-zinc-500 font-sans text-xs flex flex-col gap-2 justify-center items-center select-none">
                  <svg
                    className="w-6 h-6 text-zinc-300 dark:text-zinc-700"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <span>Type at least 2 characters to search...</span>
                </div>
              )}
            </div>

            {/* Keyboard guidance footer */}
            <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
              <div className="flex gap-2">
                <span>↑↓ to navigate</span>
                <span>•</span>
                <span>Enter to select</span>
              </div>
              <span>CryptoViz Docs Search</span>
            </div>
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="w-full h-14 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-850 px-6 flex items-center justify-between sticky top-0 z-40 transition-colors">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-mono text-zinc-500 hover:text-teal-500 transition-colors cursor-pointer"
          >
            ← Home
          </Link>
          <span className="font-mono text-xs text-teal-650 dark:text-teal-400 font-bold tracking-widest uppercase">
            CryptoViz // Docs
          </span>
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
            v1.0.0
          </span>
        </div>

        {/* Trigger Search Box */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-400 dark:text-zinc-500 text-xs font-mono hover:border-teal-500/50 hover:text-zinc-650 dark:hover:text-zinc-300 transition-all cursor-pointer select-none"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden md:inline bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-1 py-0.2 rounded text-[10px] text-zinc-400 dark:text-zinc-500">
            Ctrl + K
          </kbd>
        </button>
      </div>

      <div className="flex-1 w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row">
        {/* Navigation Sidebar */}
        <aside className="w-full lg:w-64 bg-zinc-50 dark:bg-zinc-900/40 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-850 p-6 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] overflow-y-auto shrink-0 flex flex-col gap-8 transition-colors">
          <div>
            {hasLoaded && (
              <div className="mb-8">
                <LearningProgressPanel
                  completedCount={progress.completed.length}
                  bookmarkedCount={progress.bookmarks.length}
                  totalCount={docCategories.length}
                  percent={percent}
                  onClear={() => {
                    if (
                      window.confirm(
                        "Clear all documentation bookmarks and completion progress?",
                      )
                    ) {
                      clear();
                    }
                  }}
                />
              </div>
            )}
            <h3 className="text-xs font-mono font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-widest mb-3 px-2">
              Overview
            </h3>
            <nav className="space-y-1">
              {generalDocs.map((category) => {
                const isSelected = activeSection.title === category.title;
                const slug = getDocSlug(category.title);
                const bookmarked = progress.bookmarks.includes(slug);
                const completed = progress.completed.includes(slug);

                return (
                  <button
                    key={category.title}
                    type="button"
                    onClick={() => {
                      setActiveSection(category);
                      setActiveQuery("");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                      isSelected
                        ? "bg-teal-500/10 font-semibold text-teal-700 dark:text-teal-300"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
                    }`}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span>{category.title}</span>
                      <span
                        className="flex shrink-0 gap-1"
                        aria-label="Article status"
                      >
                        {bookmarked && (
                          <span title="Bookmarked" aria-label="Bookmarked">
                            ★
                          </span>
                        )}
                        {completed && (
                          <span
                            title="Completed"
                            aria-label="Completed"
                            className="text-emerald-600 dark:text-emerald-400"
                          >
                            ✓
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div>
            <h3 className="text-xs font-mono font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-widest mb-3 px-2">
              Ciphers
            </h3>
            <nav className="space-y-1">
              {cipherDocs.map((category) => {
                const isSelected = activeSection.title === category.title;
                const slug = getDocSlug(category.title);
                const bookmarked = progress.bookmarks.includes(slug);
                const completed = progress.completed.includes(slug);

                return (
                  <button
                    key={category.title}
                    type="button"
                    onClick={() => {
                      setActiveSection(category);
                      setActiveQuery("");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                      isSelected
                        ? "bg-teal-500/10 font-semibold text-teal-700 dark:text-teal-300"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
                    }`}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span>{category.title}</span>
                      <span
                        className="flex shrink-0 gap-1"
                        aria-label="Article status"
                      >
                        {bookmarked && (
                          <span title="Bookmarked" aria-label="Bookmarked">
                            ★
                          </span>
                        )}
                        {completed && (
                          <span
                            title="Completed"
                            aria-label="Completed"
                            className="text-emerald-600 dark:text-emerald-400"
                          >
                            ✓
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 w-full max-w-none lg:max-w-3xl overflow-y-auto">
          {/* Highlight indicator banner */}
          {activeQuery && (
            <div className="mb-6 px-4 py-2.5 bg-yellow-500/10 border border-yellow-500/25 rounded-lg flex items-center justify-between text-xs font-sans text-yellow-800 dark:text-yellow-250 transition-all">
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                </span>
                Highlighting matching search term: &ldquo;
                <strong className="font-semibold">{activeQuery}</strong>&rdquo;
              </span>
              <button
                onClick={() => setActiveQuery("")}
                className="text-[10px] font-mono bg-white dark:bg-zinc-900 border border-yellow-500/20 hover:border-yellow-500 text-yellow-800 dark:text-yellow-400 px-2 py-0.5 rounded cursor-pointer transition-all"
              >
                Clear Highlights
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 dark:text-zinc-500 mb-6 select-none">
            <span>Docs</span>
            <span>/</span>
            <span>
              {activeSection.type === "cipher" ? "Ciphers" : "Architecture"}
            </span>
            <span>/</span>
            <span className="text-teal-655 dark:text-teal-400">
              {activeSection.title}
            </span>
          </div>

          <h1 className="text-3xl font-mono font-bold text-zinc-900 dark:text-white tracking-tight mb-2 select-text">
            {activeSection.title}
          </h1>
          <p className="text-sm font-sans text-zinc-550 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-6 mb-6 leading-relaxed select-text">
            {renderFormattedText(activeSection.description, activeQuery)}
          </p>

          {activeSection.type === "general"
            ? renderGeneralContent()
            : renderCipherContent()}
        </main>
      </div>
    </div>
  );
}
