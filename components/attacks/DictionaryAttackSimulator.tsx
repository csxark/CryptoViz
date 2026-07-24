"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_DICTIONARY,
  HASH_ALGORITHM_LABELS,
  buildDemoTarget,
  hashCandidate,
  parseDictionaryText,
  runDictionaryAttack,
  type DictionaryAttackResult,
  type DictionaryHashAlgorithm,
} from "../../lib/attacks/dictionaryAttack";

const defaultDictionaryText = DEFAULT_DICTIONARY.join("\n");
const samplePasswords = [
  "password123",
  "student",
  "correcthorsebatterystaple",
  "not-in-dictionary",
];

function riskBadgeClass(risk: DictionaryAttackResult["estimatedRisk"]) {
  if (risk === "high") return "border-red-500/40 bg-red-500/10 text-red-200";
  if (risk === "medium")
    return "border-amber-500/40 bg-amber-500/10 text-amber-100";
  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";
}

export default function DictionaryAttackSimulator() {
  const [algorithm, setAlgorithm] =
    useState<DictionaryHashAlgorithm>("fnv1a32");
  const [demoPassword, setDemoPassword] = useState("password123");
  const [targetHash, setTargetHash] = useState(() =>
    buildDemoTarget("password123", "fnv1a32"),
  );
  const [dictionaryText, setDictionaryText] = useState(defaultDictionaryText);
  const [result, setResult] = useState<DictionaryAttackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo(
    () => parseDictionaryText(dictionaryText),
    [dictionaryText],
  );
  const previewHash = useMemo(() => {
    try {
      return demoPassword.trim()
        ? hashCandidate(demoPassword.trim(), algorithm)
        : "";
    } catch {
      return "";
    }
  }, [algorithm, demoPassword]);

  function handleGenerateTarget() {
    setError(null);
    try {
      setTargetHash(buildDemoTarget(demoPassword, algorithm));
      setResult(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to generate target hash.",
      );
    }
  }

  function handleRunAttack() {
    setError(null);
    try {
      setResult(runDictionaryAttack({ targetHash, candidates, algorithm }));
    } catch (caught) {
      setResult(null);
      setError(
        caught instanceof Error ? caught.message : "Attack simulation failed.",
      );
    }
  }

  function handleLoadSample(password: string) {
    setDemoPassword(password);
    setTargetHash(buildDemoTarget(password, algorithm));
    setResult(null);
    setError(null);
  }

  function handleAlgorithmChange(value: DictionaryHashAlgorithm) {
    setAlgorithm(value);
    setTargetHash(buildDemoTarget(demoPassword, value));
    setResult(null);
    setError(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/30">
        <div className="relative isolate px-6 py-10 sm:px-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_32%)]" />
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
            Attack simulator
          </p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl">
                Dictionary Attack Simulator
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                Explore how attackers test a target hash against a list of
                likely passwords. This simulator is intentionally local,
                rate-limited, and educational so students can understand why
                common passwords are risky.
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
              <p className="text-sm font-semibold text-cyan-100">
                Safe learning note
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Use only the demo hashes generated on this page. Do not use this
                tool against accounts, leaked hashes, or systems you do not own
                or have permission to test.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
          <h2 className="text-2xl font-bold text-white">1. Configure target</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Generate a demo hash from a password, or paste another demo hash
            produced by the same selected algorithm.
          </p>

          <label className="mt-6 block text-sm font-semibold text-slate-200">
            Demo hash algorithm
          </label>
          <select
            value={algorithm}
            onChange={(event) =>
              handleAlgorithmChange(
                event.target.value as DictionaryHashAlgorithm,
              )
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
          >
            {Object.entries(HASH_ALGORITHM_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <label className="mt-5 block text-sm font-semibold text-slate-200">
            Demo password
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              value={demoPassword}
              onChange={(event) => setDemoPassword(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-cyan-400/40 placeholder:text-slate-500 focus:ring-2"
              placeholder="password123"
            />
            <button
              type="button"
              onClick={handleGenerateTarget}
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              Generate hash
            </button>
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/80 p-3 text-sm text-slate-300">
            Preview hash:{" "}
            <code className="font-mono text-cyan-200">
              {previewHash || "—"}
            </code>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {samplePasswords.map((password) => (
              <button
                key={password}
                type="button"
                onClick={() => handleLoadSample(password)}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/60 hover:text-cyan-100"
              >
                {password}
              </button>
            ))}
          </div>

          <label className="mt-6 block text-sm font-semibold text-slate-200">
            Target hash
          </label>
          <input
            value={targetHash}
            onChange={(event) => {
              setTargetHash(event.target.value);
              setResult(null);
            }}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none ring-cyan-400/40 placeholder:text-slate-500 focus:ring-2"
            placeholder="Paste demo hash"
          />

          {error ? (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100"
            >
              {error}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
          <h2 className="text-2xl font-bold text-white">
            2. Try candidate dictionary
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            One candidate per line. The simulator hashes each candidate and
            stops when a hash matches the target.
          </p>

          <label className="mt-6 block text-sm font-semibold text-slate-200">
            Dictionary candidates ({candidates.length})
          </label>
          <textarea
            value={dictionaryText}
            onChange={(event) => {
              setDictionaryText(event.target.value);
              setResult(null);
            }}
            className="mt-2 min-h-72 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-sm leading-6 text-white outline-none ring-cyan-400/40 placeholder:text-slate-500 focus:ring-2"
          />

          <button
            type="button"
            onClick={handleRunAttack}
            className="mt-5 w-full rounded-xl bg-violet-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-violet-300"
          >
            Run dictionary attack simulation
          </button>
        </section>
      </div>

      <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              3. Result timeline
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Each row shows one password guess, its computed demo hash, and
              whether it matched.
            </p>
          </div>
          {result ? (
            <span
              className={`rounded-full border px-4 py-2 text-sm font-bold ${riskBadgeClass(result.estimatedRisk)}`}
            >
              Risk: {result.estimatedRisk}
            </span>
          ) : null}
        </div>

        {result ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Status
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {result.found ? "Password found" : "No match"}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {result.found
                  ? `Matched "${result.matchedPassword}" after ${result.attempts.length} attempt(s).`
                  : `Searched ${result.attempts.length} candidate(s) without a match.`}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Target
              </p>
              <p className="mt-2 break-all font-mono text-sm text-cyan-200">
                {result.targetHash}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {HASH_ALGORITHM_LABELS[result.algorithm]}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Timing
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {result.elapsedMs.toFixed(2)} ms
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Educational local simulation; real attack speed depends on hash
                cost and hardware.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-400">
            Run the simulation to see attempt-by-attempt matching.
          </div>
        )}

        {result ? (
          <div className="mt-6 max-h-96 overflow-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Computed hash</th>
                  <th className="px-4 py-3">Match</th>
                </tr>
              </thead>
              <tbody>
                {result.attempts.map((attempt) => (
                  <tr
                    key={`${attempt.index}-${attempt.candidate}`}
                    className={
                      attempt.matched
                        ? "border-t border-emerald-500/30 bg-emerald-500/10"
                        : "border-t border-white/5"
                    }
                  >
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {attempt.index + 1}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {attempt.candidate}
                    </td>
                    <td className="px-4 py-3 font-mono text-cyan-100">
                      {attempt.hash}
                    </td>
                    <td className="px-4 py-3">
                      {attempt.matched ? (
                        <span className="rounded-full bg-emerald-400 px-2.5 py-1 text-xs font-black text-slate-950">
                          matched
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm leading-7 text-slate-300 md:grid-cols-3">
        <div>
          <h3 className="font-bold text-white">What it teaches</h3>
          <p className="mt-2">
            Dictionary attacks are effective when users choose common passwords
            that appear in likely-word lists.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-white">How to defend</h3>
          <p className="mt-2">
            Use long unique passwords, password managers, rate limits, MFA, and
            slow password hashing such as bcrypt, scrypt, or Argon2.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-white">Why this is safe</h3>
          <p className="mt-2">
            The simulator uses local demo hashes only and caps dictionary size
            to avoid turning the page into a real cracking tool.
          </p>
        </div>
      </section>
    </div>
  );
}
