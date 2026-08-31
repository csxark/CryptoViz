"use client";

import { useMemo, useState } from "react";
import {
  DEMO_GROUP,
  buildSigmaProtocolChecklist,
  cheatingProver,
  extractWitness,
  fiatShamirSign,
  fiatShamirVerify,
  forgeWeakFiatShamir,
  honestTranscript,
  keygen,
  runCheatingExperiment,
  simulateTranscript,
} from "../../lib/protocols/sigmaProtocols";

function formatBigint(value: bigint): string {
  return value.toString();
}

export default function SigmaProtocolPlayground() {
  const [witness, setWitness] = useState(5);
  const [nonce, setNonce] = useState(3);
  const [challenge, setChallenge] = useState(2);
  const [message, setMessage] = useState("CryptoViz zero knowledge");

  const model = useMemo(() => {
    try {
      const x = BigInt(witness);
      const r = BigInt(nonce);
      const c = BigInt(challenge);
      const keys = keygen(DEMO_GROUP, x);
      const honest = honestTranscript(DEMO_GROUP, x, r, c);
      const second = honestTranscript(DEMO_GROUP, x, r, (c + 1n) % 8n);
      const extracted = extractWitness(DEMO_GROUP, honest, second);
      const simulated = simulateTranscript(DEMO_GROUP, keys.y, c, 7n);
      const cheat = runCheatingExperiment(DEMO_GROUP, keys.y, 96);
      const guessed = cheatingProver(DEMO_GROUP, keys.y, c, 4n);
      const signature = fiatShamirSign(DEMO_GROUP, x, message, r);
      const signatureValid = fiatShamirVerify(
        DEMO_GROUP,
        keys.y,
        message,
        signature,
      );
      const tamperValid = fiatShamirVerify(
        DEMO_GROUP,
        keys.y,
        `${message}!`,
        signature,
      );
      const weakForgery = forgeWeakFiatShamir(DEMO_GROUP, keys.y, message, 6n);

      return {
        error: null,
        keys,
        honest,
        second,
        extracted,
        simulated,
        cheat,
        guessed,
        signature,
        signatureValid,
        tamperValid,
        weakForgery,
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Unable to run sigma protocol demo.",
      };
    }
  }, [witness, nonce, challenge, message]);

  const checklist = buildSigmaProtocolChecklist();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
          <div className="relative isolate px-6 py-10 sm:px-10">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.24),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.22),transparent_34%)]" />
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
              Protocol playground
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
              Zero-Knowledge / Sigma-Protocol Playground
            </h1>
            <p className="mt-5 max-w-4xl text-base leading-8 text-slate-300">
              Explore Schnorr identification as a three-move
              commit–challenge–response protocol. Run completeness, special
              soundness, zero-knowledge simulation, and the Fiat–Shamir
              transform in one place.
            </p>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Demo controls</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Small group: p={formatBigint(DEMO_GROUP.p)}, q=
              {formatBigint(DEMO_GROUP.q)}, g={formatBigint(DEMO_GROUP.g)}.
              Values stay small so each formula is readable.
            </p>

            <div className="mt-6 grid gap-4">
              <NumberInput
                label="Witness x"
                value={witness}
                min={1}
                max={10}
                onChange={setWitness}
              />
              <NumberInput
                label="Nonce r"
                value={nonce}
                min={0}
                max={10}
                onChange={setNonce}
              />
              <NumberInput
                label="Challenge c"
                value={challenge}
                min={0}
                max={7}
                onChange={setChallenge}
              />
              <label className="block text-sm font-bold text-slate-200">
                Fiat-Shamir message
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
                />
              </label>
            </div>

            {model.error ? (
              <div
                role="alert"
                className="mt-6 rounded-2xl border border-rose-300/40 bg-rose-300/10 p-4 text-sm font-bold text-rose-100"
              >
                {model.error}
              </div>
            ) : null}
          </aside>

          {model.error === null ? (
            <section className="grid gap-4">
              <Metric
                label="Public key y = g^x mod p"
                value={formatBigint(model.keys.y)}
              />
              <Metric
                label="Honest transcript accepted"
                value={model.honest.accepted ? "Yes" : "No"}
              />
              <Metric
                label="Extracted witness"
                value={formatBigint(model.extracted.witness)}
              />
              <Metric
                label="Simulated transcript accepted"
                value={model.simulated.accepted ? "Yes" : "No"}
              />
            </section>
          ) : null}
        </section>

        {model.error === null ? (
          <>
            <section className="grid gap-6 lg:grid-cols-2">
              <Panel
                title="1. Interactive run"
                subtitle="Completeness: the honest prover convinces the verifier."
              >
                <TranscriptCard
                  title="Honest transcript"
                  transcript={model.honest}
                />
              </Panel>

              <Panel
                title="2. Soundness"
                subtitle="Two accepting transcripts on one commitment recover the witness."
              >
                <div className="grid gap-3">
                  <TranscriptCard
                    title="Challenge A"
                    transcript={model.honest}
                    compact
                  />
                  <TranscriptCard
                    title="Challenge B"
                    transcript={model.second}
                    compact
                  />
                  <Metric
                    label="Extractor formula"
                    value={`x = ${formatBigint(model.extracted.witness)}`}
                  />
                  <Metric
                    label="Cheating success"
                    value={`${model.cheat.successes}/${model.cheat.attempts} observed ≈ ${model.cheat.theoreticalProbability}`}
                  />
                </div>
              </Panel>

              <Panel
                title="3. Zero-knowledge"
                subtitle="A simulator creates accepting transcripts without the witness."
              >
                <TranscriptCard
                  title="Simulated transcript"
                  transcript={model.simulated}
                />
              </Panel>

              <Panel
                title="4. Fiat-Shamir"
                subtitle="A hash challenge turns the interaction into a signature."
              >
                <div className="grid gap-3">
                  <Metric
                    label="Signature commitment"
                    value={formatBigint(model.signature.commitment)}
                  />
                  <Metric
                    label="Signature challenge"
                    value={formatBigint(model.signature.challenge)}
                  />
                  <Metric
                    label="Signature response"
                    value={formatBigint(model.signature.response)}
                  />
                  <Metric
                    label="Verification"
                    value={model.signatureValid ? "Valid" : "Invalid"}
                  />
                  <Metric
                    label="Tampered message"
                    value={model.tamperValid ? "Still valid" : "Rejected"}
                  />
                  <Metric
                    label="Weak transform pitfall"
                    value={`Forgeable commitment ${formatBigint(model.weakForgery.commitment)}`}
                  />
                </div>
              </Panel>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-2xl font-black text-white">Trace</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Every operation uses the same label, formula, substituted, note
                structure used by other CryptoViz explainers.
              </p>

              <div className="mt-5 overflow-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                  <thead className="bg-slate-900 text-xs uppercase tracking-[0.18em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Label</th>
                      <th className="px-4 py-3">Formula</th>
                      <th className="px-4 py-3">Substituted</th>
                      <th className="px-4 py-3">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ...model.honest.trace,
                      ...model.simulated.trace,
                      ...model.extracted.trace,
                      ...model.signature.trace,
                    ].map((row, index) => (
                      <tr
                        key={`${row.label}-${index}`}
                        className="border-t border-white/5"
                      >
                        <td className="px-4 py-3 font-bold text-white">
                          {row.label}
                        </td>
                        <td className="px-4 py-3 font-mono text-cyan-100">
                          {row.formula}
                        </td>
                        <td className="px-4 py-3 font-mono text-amber-100">
                          {row.substituted}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}

        <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-black text-white">
            Manual test checklist
          </h2>
          <ol className="mt-5 grid gap-3 md:grid-cols-2">
            {checklist.map((item, index) => (
              <li
                key={item}
                className="flex gap-3 text-sm leading-6 text-slate-300"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-xs font-black text-slate-950">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </aside>
      </section>
    </main>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm font-bold text-slate-200">
      {label}: {value}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full accent-cyan-300"
      />
    </label>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <h2 className="text-2xl font-black text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-all font-mono text-lg font-black text-white">
        {value}
      </p>
    </div>
  );
}

interface TranscriptCardProps {
  title: string;
  transcript: {
    commitment: bigint;
    challenge: bigint;
    response: bigint;
    accepted: boolean;
    simulated?: boolean;
  };
  compact?: boolean;
}

function TranscriptCard({ title, transcript, compact = false }: TranscriptCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
        {title}
      </p>
      <div
        className={`mt-3 grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-4"}`}
      >
        <Metric label="t" value={formatBigint(transcript.commitment)} />
        <Metric label="c" value={formatBigint(transcript.challenge)} />
        <Metric label="s" value={formatBigint(transcript.response)} />
        <Metric label="accepted" value={transcript.accepted ? "yes" : "no"} />
      </div>
      <p className="mt-3 text-sm text-slate-400">
        {transcript.simulated
          ? "No witness was used."
          : "Witness-based transcript."}
      </p>
    </div>
  );
}
