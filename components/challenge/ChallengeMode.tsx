'use client'

import { useState, useEffect, useCallback, useRef } from "react";
import { useCipherWorker } from "../../lib/hooks/useCipherWorker";
import { generateChallengeData, type ChallengeData, type ChallengeDifficulty } from "../../lib/challenge/generator";
import { CIPHER_REGISTRY } from "../../lib/cipher/registry";

const TOTAL_QUESTIONS = 10;
const TIME_LIMIT = 60;

export default function ChallengeMode() {
  const [answer, setAnswer] = useState("");
  const [expectedCiphertext, setExpectedCiphertext] = useState("");
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [copied, setCopied] = useState(false);
  const [score, setScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [bestScore, setBestScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isHydrated, setIsHydrated] = useState(false);
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>('medium');
  const [started, setStarted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  
  const { runCipher, loading, error } = useCipherWorker();
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load best score safely
  useEffect(() => {
    const saved = localStorage.getItem('cryptoviz_best_score');
    if (saved) {
      setBestScore(parseInt(saved, 10));
    }
    setIsHydrated(true);
  }, []);

  const generateNextChallenge = useCallback(async (isMounted: () => boolean) => {
    try {
      if (isMounted()) {
        setExpectedCiphertext("");
        setTimeLeft(TIME_LIMIT);
        setShowHint(false);
      }
      
      const newChallenge = generateChallengeData(difficulty);
      if (isMounted()) setChallenge(newChallenge);
      
      const result = await runCipher('encrypt', newChallenge.cipherId, newChallenge.plaintext, newChallenge.key);
      if (isMounted()) {
        setExpectedCiphertext(result.output);
      }
    } catch (err) {
      console.error("Worker failed to generate challenge:", err);
    }
  }, [runCipher, difficulty]);

  // Initial load - only once the player has picked a difficulty and started
  useEffect(() => {
    if (!started) return;
    let mounted = true;
    generateNextChallenge(() => mounted);
    
    return () => {
      mounted = false;
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, [generateNextChallenge, started]);

  // Save best score when session completes
  useEffect(() => {
    if (currentQuestion > TOTAL_QUESTIONS && isHydrated) {
      setBestScore(prev => {
        if (score > prev) {
          localStorage.setItem('cryptoviz_best_score', score.toString());
          return score;
        }
        return prev;
      });
    }
  }, [currentQuestion, score, isHydrated]);

  const advanceChallenge = useCallback(() => {
    if (currentQuestion < TOTAL_QUESTIONS) {
      setCurrentQuestion(q => q + 1);
      generateNextChallenge(() => true);
    } else {
      setCurrentQuestion(q => q + 1);
    }
  }, [currentQuestion, generateNextChallenge]);

  const handleTimeout = useCallback(() => {
    setFeedback('idle');
    setAnswer('');
    advanceChallenge();
  }, [advanceChallenge]);

  // Countdown timer effect
  useEffect(() => {
    if (!challenge || currentQuestion > TOTAL_QUESTIONS || feedback === 'correct' || loading) return;
    
    if (timeLeft === 0) {
      handleTimeout();
      return;
    }
    
    const timer = setTimeout(() => {
      setTimeLeft(t => t - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [challenge, currentQuestion, feedback, loading, timeLeft, handleTimeout]);

  const resetSession = () => {
    setCurrentQuestion(1);
    setScore(0);
    setFeedback('idle');
    setAnswer('');
    setChallenge(null);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    generateNextChallenge(() => true);
  };

  if (!isHydrated) {
    return (
      <div className="max-w-3xl mx-auto flex justify-center items-center h-64">
        <span className="text-zinc-500 dark:text-zinc-400 animate-pulse font-medium text-sm">
          Initializing Challenge Engine…
        </span>
      </div>
    );
  }

  if (!started) {
    const options: { value: ChallengeDifficulty; label: string; desc: string }[] = [
      { value: 'easy', label: 'Easy', desc: 'Short words, simple ciphers, no key needed.' },
      { value: 'medium', label: 'Medium', desc: 'Word-length input with keyword ciphers.' },
      { value: 'hard', label: 'Hard', desc: 'Short phrases, multi-word keys, Playfair included.' },
    ];

    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Choose Your Difficulty</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Pick a difficulty to start the challenge.
          </p>
          <div
            role="radiogroup"
            aria-label="Challenge difficulty"
            className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={difficulty === opt.value}
                onClick={() => setDifficulty(opt.value)}
                className={`rounded-xl border p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  difficulty === opt.value
                    ? 'border-teal-500 bg-teal-50 dark:border-teal-400 dark:bg-teal-950/30'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700'
                }`}
              >
                <div className="text-sm font-bold text-zinc-900 dark:text-white">{opt.label}</div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{opt.desc}</div>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 active:scale-[0.98] dark:bg-teal-500 dark:hover:bg-teal-400 dark:focus:ring-offset-zinc-900"
          >
            Start Challenge
          </button>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="max-w-3xl mx-auto flex justify-center items-center h-64">
        <span className="text-zinc-500 dark:text-zinc-400 animate-pulse font-medium text-sm">
          Generating challenge…
        </span>
      </div>
    );
  }

  const cipherName = CIPHER_REGISTRY.find(c => c.id === challenge.cipherId)?.name || 'Cipher';
  const progressPercent = Math.round(((currentQuestion - 1) / TOTAL_QUESTIONS) * 100);
  const timePercent = (timeLeft / TIME_LIMIT) * 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || !challenge || loading || !!error) return;

    if (answer.toUpperCase() === challenge.plaintext.toUpperCase()) {
      setFeedback('correct');
      setScore(s => s + 100);
      
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => {
        setCurrentQuestion(q => q + 1);
        setAnswer("");
      }, 1500);
    } else {
      setFeedback('incorrect');
    }
  };

  const handleCopy = () => {
    if (!expectedCiphertext) return;
    navigator.clipboard.writeText(expectedCiphertext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Completion Screen ────────────────────────────────────────────────
  if (currentQuestion > TOTAL_QUESTIONS) {
    const questionsAnswered = TOTAL_QUESTIONS;
    const correctAnswers = score / 100;
    const isNewBest = score > 0 && score >= bestScore;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 dark:border-zinc-800 dark:bg-zinc-900/40">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-950/30">
              <svg className="h-7 w-7 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Challenge Complete
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              You completed all {questionsAnswered} questions. Here&apos;s your session summary.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Final Score */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-center dark:border-zinc-800 dark:bg-zinc-950/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Final Score
              </span>
              <div className="mt-2 text-3xl font-bold text-teal-600 dark:text-teal-400">
                {score}
              </div>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">points</span>
            </div>

            {/* Best Score */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-center dark:border-zinc-800 dark:bg-zinc-950/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Best Score
              </span>
              <div className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
                {bestScore}
              </div>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">all-time</span>
            </div>

            {/* Correct Answers */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-center dark:border-zinc-800 dark:bg-zinc-950/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Correct
              </span>
              <div className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
                {correctAnswers}<span className="text-lg text-zinc-400 dark:text-zinc-500">/{questionsAnswered}</span>
              </div>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">questions</span>
            </div>
          </div>

          {isNewBest && (
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-900/20 dark:text-emerald-400">
              🏆 New personal best!
            </div>
          )}

          {/* Play Again */}
          <div className="mt-8 text-center">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 active:scale-[0.98] dark:bg-teal-500 dark:hover:bg-teal-400 dark:focus:ring-offset-zinc-900"
              onClick={() => { setStarted(false); resetSession(); }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active Challenge UI ──────────────────────────────────────────────
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Left Column ───────────────────────────────────────────── */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* ── Checkpoint 2: Dashboard Metric Cards ───────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Category */}
        <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Category</div>
            <div className="mt-0.5 text-sm font-bold text-teal-600 dark:text-teal-400 truncate">Classical Ciphers</div>
          </div>
        </div>

        {/* Current Score */}
        <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Score</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums text-zinc-900 dark:text-white truncate">
              {score} <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">pts</span>
            </div>
          </div>
        </div>

        {/* Best Score */}
        <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Best Score</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums text-zinc-900 dark:text-white truncate">
              {bestScore} <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">pts</span>
            </div>
          </div>
        </div>

        {/* Time Remaining */}
        <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
            {/* SVG Timer Ring */}
            <svg className="absolute inset-0 h-12 w-12 -rotate-90 transform" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-20" />
              <circle
                cx="24"
                cy="24"
                r="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="138.2"
                strokeDashoffset={138.2 - (138.2 * (timeLeft / TIME_LIMIT))}
                className="transition-all duration-1000 ease-linear"
                style={{ stroke: timeLeft <= 10 ? '#ef4444' : 'currentColor' }}
              />
            </svg>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Time Left</div>
            <div className={`mt-0.5 text-lg font-mono font-bold tabular-nums truncate ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-zinc-900 dark:text-white'}`}>
              00:{timeLeft.toString().padStart(2, '0')}
            </div>
          </div>
        </div>
      </div>



      {/* ── Checkpoints 4–7: Challenge Card ────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-zinc-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
              Challenge
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              {cipherName}
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
              challenge.difficulty === 'easy'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400'
                : challenge.difficulty === 'hard'
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400'
                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400'
            }`}>
              {challenge.difficulty}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Instructions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-lg">
              Decrypt the following ciphertext using the provided key and enter the original plaintext.
            </p>
            {challenge.key && (
              <div className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/50">
                <span className="text-xl leading-none">🔑</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Key</span>
                <span className="font-mono text-sm font-bold text-zinc-900 dark:text-white">{challenge.key}</span>
              </div>
            )}
          </div>

          {/* ── Checkpoint 5: Ciphertext Display ───────────────────────── */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Ciphertext
              </label>
              {expectedCiphertext && !loading && !error && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  title="Copy ciphertext"
                >
                  {copied ? (
                    <>
                      <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950 shadow-inner dark:border-zinc-800">
              {/* Subtle left accent bar */}
              <div className="absolute inset-y-0 left-0 w-1 bg-teal-500 dark:bg-teal-400" />
              <div className="px-5 py-6 sm:px-8">
                {error ? (
                  <span className="font-mono text-sm text-red-400">{error}</span>
                ) : loading || !expectedCiphertext ? (
                  <div className="flex items-center gap-3">
                    <span className="flex h-3 w-3">
                      <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-teal-500"></span>
                    </span>
                    <span className="font-mono text-sm text-zinc-400">Encrypting payload...</span>
                  </div>
                ) : (
                  <div className="font-mono text-lg leading-loose tracking-[0.25em] text-zinc-100 break-all sm:text-xl selection:bg-teal-500/30">
                    {expectedCiphertext}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Checkpoint 6: Input & Submit ────────────────────────────── */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 mt-6">
            <label htmlFor="answer" className="mb-3 block text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Your Answer
            </label>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  id="answer"
                  type="text"
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value);
                    if (feedback !== 'idle') setFeedback('idle');
                  }}
                  placeholder="Enter decrypted plaintext..."
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3.5 font-mono text-base text-zinc-900 uppercase shadow-sm outline-none transition-all placeholder:text-zinc-400 placeholder:normal-case focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-teal-500 dark:focus:bg-zinc-900 dark:focus:ring-teal-500/20"
                  autoComplete="off"
                  spellCheck="false"
                  disabled={loading || !!error || feedback === 'correct'}
                />
                <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-500">
                  Enter letters and spaces only. Punctuation is ignored.
                </p>
              </div>
              
              <button
                type="submit"
                disabled={loading || !!error || feedback === 'correct' || !answer.trim()}
                className="flex h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-teal-600 px-8 font-semibold text-white shadow-sm transition-all hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400 dark:focus:ring-offset-zinc-900"
              >
                <span>Submit</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>

            {/* ── Checkpoint 7: Feedback ──────────────────────────────── */}
            <div className="mt-4 empty:hidden">
              {feedback === 'correct' && (
                <div
                  aria-live="polite"
                  className="flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 animate-[fadeIn_0.3s_ease-out] dark:border-emerald-800/30 dark:bg-emerald-900/20 dark:text-emerald-400"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Correct! Well done.
                </div>
              )}

              {feedback === 'incorrect' && (
                <div
                  aria-live="polite"
                  className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 animate-[shakeX_0.4s_ease-out] dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-400"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Incorrect. Try again!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Checkpoint 7: Bottom Tip Banner ────────────────────────────── */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900/30 dark:bg-blue-900/10 transition-all hover:shadow-md">
        <div className="flex gap-4">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-blue-900 dark:text-blue-100">
              Pro Tip
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-blue-800 dark:text-blue-300">
              Classical ciphers often preserve word lengths. Look for single-letter words like &quot;A&quot; or &quot;I&quot;, or common short words like &quot;THE&quot; to crack the code faster.
            </p>
          </div>
        </div>
      </div>

    </div>

    {/* ── Right Column: Sidebar ───────────────────────────────────── */}
      <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* 1. Your Progress */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 transition-all hover:shadow-md">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Your Progress
            </h3>
            <div className="flex items-center justify-between text-sm font-semibold text-zinc-900 dark:text-white">
              <span>Question {currentQuestion} of {TOTAL_QUESTIONS}</span>
              <span className="text-teal-600 dark:text-teal-400">{progressPercent}%</span>
            </div>
            <div className="mt-4 flex h-2 w-full gap-1">
              {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-full flex-1 rounded-full transition-colors ${
                    i < currentQuestion - 1
                      ? 'bg-teal-500 dark:bg-teal-400'
                      : i === currentQuestion - 1
                      ? 'bg-teal-200 dark:bg-teal-500/30'
                      : 'bg-zinc-100 dark:bg-zinc-800'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 2. How to Play */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 transition-all hover:shadow-md">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              How to Play
            </h3>
            <ol className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-900 dark:bg-zinc-800 dark:text-white">1</span>
                <span>Read the ciphertext and the given key.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-900 dark:bg-zinc-800 dark:text-white">2</span>
                <span>Decrypt the ciphertext mentally or on paper.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-900 dark:bg-zinc-800 dark:text-white">3</span>
                <span>Enter the original plaintext before time runs out.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-900 dark:bg-zinc-800 dark:text-white">4</span>
                <span>Earn points and beat your best score!</span>
              </li>
            </ol>
          </div>

          {/* 3. Challenge Tips (formerly Lifeline) */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Challenge Tips
              </h3>
              <div className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            {showHint && challenge.hints[0] ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4" aria-live="polite">
                {challenge.hints[0]}
              </p>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Stuck on this cipher? Reveal a hint to help you learn.
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowHint(true)}
              disabled={showHint || !challenge.hints[0]}
              className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 dark:bg-teal-500 dark:hover:bg-teal-400 dark:disabled:bg-zinc-800/50 dark:disabled:text-zinc-600"
            >
              {showHint ? 'Hint Revealed' : 'Show Hint'}
            </button>
          </div>

          {/* 4. Recent Performance */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 transition-all hover:shadow-md">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Recent Performance
            </h3>
            <div className="flex items-center gap-1.5 mb-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-3 w-3 rounded-full bg-zinc-100 border border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-700/50" />
              ))}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              Session analytics coming soon.
            </p>
          </div>

        </div>
      </div>

      {/* Timer progress bar — visual indicator at page bottom */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${timeLeft <= 10 ? 'bg-red-500' : 'bg-teal-600 dark:bg-teal-500'}`}
          style={{ width: `${timePercent}%` }}
        />
      </div>
    </div>
  );
}
