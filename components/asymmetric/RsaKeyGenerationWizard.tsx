"use client";

import { useMemo, useState, useEffect } from "react";
import {
  DEFAULT_RSA_WIZARD_INPUT,
  RSA_DEMO_PRIMES,
  buildRsaWizardManualChecklist,
  generateRsaWizard,
  getRecommendedPublicExponents,
  type RsaWizardInput,
} from "../../lib/asymmetric/rsaKeyGenerationWizard";
import { cryptoWorkerClient } from "../../lib/workers/cryptoWorkerClient";
import Link from "next/link";

export default function RsaKeyGenerationWizard() {
  const [input, setInput] = useState<RsaWizardInput>(DEFAULT_RSA_WIZARD_INPUT);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ value: ReturnType<typeof generateRsaWizard> | null; error: string | null }>({
    value: null,
    error: null,
  });

  useEffect(() => {
    let active = true;
    const calculate = async () => {
      setLoading(true);
      try {
        const res = await cryptoWorkerClient.runCryptoOperation<ReturnType<typeof generateRsaWizard>>("rsaWizard", input);
        if (active) setResult({ value: res, error: null });
      } catch (caught) {
        if (active) {
          setResult({
            value: null,
            error: caught instanceof Error ? caught.message : "Unable to generate RSA key pair.",
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    calculate();
    return () => { active = false; };
  }, [input]);
  const recommendedExponents = useMemo(() => {
    const totient = (input.primeP - 1) * (input.primeQ - 1);
    return Number.isFinite(totient)
      ? getRecommendedPublicExponents(totient)
      : [];
  }, [input.primeP, input.primeQ]);

  const activeStep =
    result.value?.steps[
      Math.min(activeStepIndex, result.value.steps.length - 1)
    ];
  const manualChecklist = buildRsaWizardManualChecklist();

  function updateInput<K extends keyof RsaWizardInput>(key: K, value: number) {
    setActiveStepIndex(0);
    setInput((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
          <div className="relative isolate px-6 py-10 sm:px-10">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.2),transparent_32%)]" />
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
              Asymmetric cryptography
            </p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Interactive RSA Key Generation Wizard
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                  Build a toy RSA key pair step by step. Choose two primes,
                  calculate the modulus and totient, pick a valid public
                  exponent, and derive the matching private exponent.
                </p>
              </div>
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
                <p className="text-sm font-bold text-amber-100">
                  Educational demo only
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  These tiny keys are intentionally insecure. Real RSA key
                  generation must use audited cryptographic libraries and large
                  random primes.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">
              Choose key inputs
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Use the presets or type your own small demo primes.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <label className="block text-sm font-bold text-slate-200">
                Prime p
                <input
                  type="number"
                  value={input.primeP}
                  onChange={(event) =>
                    updateInput("primeP", Number(event.target.value))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
                />
              </label>
              <label className="block text-sm font-bold text-slate-200">
                Prime q
                <input
                  type="number"
                  value={input.primeQ}
                  onChange={(event) =>
                    updateInput("primeQ", Number(event.target.value))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
                />
              </label>
              <label className="block text-sm font-bold text-slate-200">
                Public exponent e
                <input
                  type="number"
                  value={input.publicExponent}
                  onChange={(event) =>
                    updateInput("publicExponent", Number(event.target.value))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
                />
              </label>
            </div>

            <div className="mt-6">
              <p className="text-sm font-bold text-slate-200">
                Demo prime presets
              </p>
              <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-auto rounded-2xl border border-white/10 bg-slate-900/60 p-3">
                {RSA_DEMO_PRIMES.map((prime) => (
                  <button
                    key={prime}
                    type="button"
                    onClick={() =>
                      updateInput(
                        input.primeP === prime ? "primeQ" : "primeP",
                        prime,
                      )
                    }
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-cyan-300/60 hover:text-cyan-100"
                  >
                    {prime}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-bold text-slate-200">
                Valid exponent suggestions
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {recommendedExponents.length > 0 ? (
                  recommendedExponents.map((exponent) => (
                    <button
                      key={exponent}
                      type="button"
                      onClick={() => updateInput("publicExponent", exponent)}
                      className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-100 transition hover:bg-emerald-300/20"
                    >
                      e = {exponent}
                    </button>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">
                    Choose valid distinct primes to see suggestions.
                  </span>
                )}
              </div>
            </div>

            <Link
              href="/modular-arithmetic"
              className="mt-4 block w-full rounded-xl border border-teal-300/40 bg-teal-300/10 px-4 py-3 text-center text-sm font-bold text-teal-200 transition hover:bg-teal-300/20"
            >
              Verify p and q with Miller-Rabin
            </Link>

            <button
              type="button"
              onClick={() => {
                setInput(DEFAULT_RSA_WIZARD_INPUT);
                setActiveStepIndex(0);
              }}
              className="mt-6 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-300/50 hover:text-cyan-100"
            >
              Reset to classic 61 × 53 demo
            </button>

            {result.error ? (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100"
              >
                {result.error}
              </div>
            ) : null}
          </aside>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">
              Generated key pair
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Metric label="Modulus n" value={result.value?.modulus ?? "—"} />
              <Metric label="φ(n)" value={result.value?.totient ?? "—"} />
              <Metric
                label="Public key (n, e)"
                value={result.value?.publicKey ?? "—"}
                mono
              />
              <Metric
                label="Private key (n, d)"
                value={result.value?.privateKey ?? "—"}
                mono
              />
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <h3 className="text-xl font-black text-white">Wizard steps</h3>
              <div className="mt-4 grid gap-3">
                {result.value?.steps.map((step, index) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveStepIndex(index)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      index === activeStepIndex
                        ? "border-cyan-300/70 bg-cyan-300/10"
                        : "border-white/10 bg-slate-950/60 hover:border-cyan-300/50"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                      Step {index + 1}
                    </p>
                    <p className="mt-1 font-black text-white">{step.title}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </section>

        {activeStep ? (
          <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-300">
                Active explanation
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">
                {activeStep.title}
              </h2>
              <div className="mt-6 rounded-2xl border border-violet-300/20 bg-violet-400/10 p-5">
                <p className="text-sm font-bold text-violet-100">Formula</p>
                <p className="mt-3 break-all font-mono text-lg text-white">
                  {activeStep.formula}
                </p>
              </div>
              <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-bold text-cyan-100">Result</p>
                <p className="mt-3 break-all font-mono text-lg text-white">
                  {activeStep.result}
                </p>
              </div>
              <p className="mt-5 text-base leading-8 text-slate-300">
                {activeStep.explanation}
              </p>
            </article>

            <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-black text-white">Security notes</h2>
              <div className="mt-5 flex flex-col gap-3">
                {result.value?.securityNotes.map((note) => (
                  <div
                    key={note}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm leading-7 text-slate-300"
                  >
                    {note}
                  </div>
                ))}
              </div>
            </aside>
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-black text-white">
            Manual testing checklist
          </h2>
          <ol className="mt-5 grid gap-3 md:grid-cols-2">
            {manualChecklist.map((item, index) => (
              <li
                key={item}
                className="flex gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm leading-6 text-slate-300"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-xs font-black text-slate-950">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </section>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-3 break-all ${
          mono
            ? "font-mono text-base text-cyan-200"
            : "text-3xl font-black text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
