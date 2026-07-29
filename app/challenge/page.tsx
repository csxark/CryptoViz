import Navbar from "../../components/layout/Navbar";
import ChallengeMode from "../../components/challenge/ChallengeMode";
import DailyQuiz from "../../components/challenge/DailyQuiz";

export default function ChallengePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans transition-colors duration-300">
      <Navbar />
      <main className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        {/* Faint Grid Background */}
        <div className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)]" />

        {/* Subtle background accent — matches homepage radial glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-teal-500/[0.04] blur-3xl dark:bg-teal-500/[0.06]" />
        </div>

        {/* Hero heading */}
        <div className="mb-12 text-center flex flex-col items-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-50/50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-teal-700 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-400">
            Cryptography Lab
          </div>
          <h1 className="flex items-center justify-center gap-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            <svg className="h-8 w-8 text-teal-600 dark:text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Cryptography Challenge
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Decrypt ciphertext against the clock. Test your knowledge of classical ciphers in a timed challenge session.
          </p>
        </div>

        <div className="mb-16">
          <DailyQuiz />
        </div>

        <div className="relative mb-16">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-zinc-50 px-4 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">Or practice infinitely</span>
          </div>
        </div>

        <ChallengeMode />
      </main>
    </div>
  );
}
