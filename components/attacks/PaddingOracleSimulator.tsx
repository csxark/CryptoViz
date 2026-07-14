"use client";

import { useMemo, useRef, useState } from "react";
import {
  PaddingOracle,
  recoverPlaintext,
  type AttackStep,
  type OracleMode,
  BLOCK_SIZE,
} from "@/lib/attacks/paddingOracle";
import { useAttackWorker } from "@/lib/hooks/useAttackWorker";
import { toByteArray, fromByteArray } from "@/lib/utils";

// Ciphertext/IV fields are always hex here (that's the format the AES/CBC
// visualizer already produces). The key field is passed straight through
// as a string to PaddingOracle/decrypt(), since the app's own decrypt()
// accepts either a hex key or a utf8 passphrase and sniffs which one it
// got — we don't need to know which here.
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/\s+/g, "");
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) {
    throw new Error("Ciphertext/IV must be valid hex.");
  }
  return toByteArray(clean, "hex");
}
function bytesToHex(bytes: Uint8Array): string {
  return fromByteArray(bytes, "hex");
}
function bytesToPrintable(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : "."))
    .join("");
}

const PLAYBACK_MS = 4; // per-step animation delay; total steps can be large

type RunState = "idle" | "running" | "done" | "error";

export default function PaddingOracleSimulator() {
  const [keyHex, setKeyHex] = useState("");
  const [ivHex, setIvHex] = useState("");
  const [ciphertextHex, setCiphertextHex] = useState("");
  const [mode, setMode] = useState<OracleMode>("vulnerable");

  const [runState, setRunState] = useState<RunState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [visibleSteps, setVisibleSteps] = useState<AttackStep[]>([]);
  const [recoveredHex, setRecoveredHex] = useState<string | null>(null);
  const [queryCount, setQueryCount] = useState(0);

  const cancelRef = useRef(false);

  const allSteps = useMemo(() => [] as AttackStep[], []); // populated per-run below

  const { recoverPlaintextConcurrently, cancel, loading } = useAttackWorker();

  async function runAttack() {
    setError(null);
    setVisibleSteps([]);
    setRecoveredHex(null);
    setQueryCount(0);
    cancelRef.current = false;

    let iv: Uint8Array, ciphertext: Uint8Array;
    const key = keyHex; // passed through as-is; decrypt() accepts hex or a utf8 passphrase
    try {
      iv = hexToBytes(ivHex);
      ciphertext = hexToBytes(ciphertextHex);
    } catch (e) {
      setError((e as Error).message);
      setRunState("error");
      return;
    }
    if (ciphertext.length % BLOCK_SIZE !== 0 || ciphertext.length === 0) {
      setError(`Ciphertext must be a positive multiple of ${BLOCK_SIZE} bytes.`);
      setRunState("error");
      return;
    }
    if (iv.length !== BLOCK_SIZE) {
      setError(`IV must be exactly ${BLOCK_SIZE} bytes.`);
      setRunState("error");
      return;
    }

    setRunState("running");

    const steps: AttackStep[] = [];

    try {
      const { plaintext, queryCount: totalQueries } = await recoverPlaintextConcurrently(
        key,
        iv,
        ciphertext,
        mode,
        (step) => {
          if (!cancelRef.current) {
            steps.push(step);
            // Throttle updates or just add to array. Realtime updates for all blocks in parallel!
            // To keep React from choking, we can update visible steps periodically.
          }
        }
      );

      setQueryCount(totalQueries);
      await playback(steps, cancelRef);
      setRecoveredHex(bytesToHex(plaintext));
      setRunState("done");
    } catch (e) {
      setError((e as Error).message);
      setRunState("error");
      await playback(steps, cancelRef);
      return;
    }

    async function playback(stepsToShow: AttackStep[], cancelled: { current: boolean }) {
      const sortedSteps = [...stepsToShow].sort((a, b) => {
        if (a.blockIndex !== b.blockIndex) return a.blockIndex - b.blockIndex;
        // Inner blocks logic (wait, the steps are from parallel workers, so we just sort them roughly by progress)
        return 0;
      });
      const chunkSize = Math.max(1, Math.floor(sortedSteps.length / 400)); // cap animation frames
      for (let i = 0; i < sortedSteps.length; i += chunkSize) {
        if (cancelled.current) return;
        const next = sortedSteps.slice(0, i + chunkSize);
        setVisibleSteps(next);
        await new Promise((r) => setTimeout(r, PLAYBACK_MS));
      }
      setVisibleSteps(sortedSteps);
    }
  }

  function stop() {
    cancelRef.current = true;
    cancel();
  }

  const lastStep = visibleSteps[visibleSteps.length - 1];
  const recoveredBytesSoFar = visibleSteps.filter((s) => s.recoveredPlaintextByte !== undefined).length;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Educational simulation only.</strong> This attack runs entirely in your
        browser against CryptoViz&apos;s own sandboxed <code>decrypt()</code> function.
        It has no network component and cannot be used against a real server —
        it exists to make the CBC padding-oracle vulnerability (the class behind
        POODLE and related TLS/SSL exploits) tangible, not to attack anything.
      </div>

      <div className="grid gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Key (same value used to encrypt — hex or passphrase)
          <input
            className="rounded border px-2 py-1 font-mono"
            value={keyHex}
            onChange={(e) => setKeyHex(e.target.value)}
            placeholder="e.g. 000102030405060708090a0b0c0d0e0f, or a passphrase"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          IV (hex, {BLOCK_SIZE} bytes)
          <input
            className="rounded border px-2 py-1 font-mono"
            value={ivHex}
            onChange={(e) => setIvHex(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Ciphertext (hex, from the AES/CBC visualizer)
          <textarea
            className="rounded border px-2 py-1 font-mono"
            rows={3}
            value={ciphertextHex}
            onChange={(e) => setCiphertextHex(e.target.value)}
          />
        </label>

        <div className="flex items-center gap-3 text-sm">
          <span>Oracle:</span>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={mode === "vulnerable"}
              onChange={() => setMode("vulnerable")}
            />
            Vulnerable (distinct padding errors)
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={mode === "fixed"}
              onChange={() => setMode("fixed")}
            />
            Fixed (constant-time)
          </label>
        </div>

        <div className="flex gap-2">
          <button
            className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            onClick={runAttack}
            disabled={runState === "running"}
          >
            {runState === "running" ? "Attacking…" : "Run attack"}
          </button>
          {runState === "running" && (
            <button className="rounded border px-4 py-2 text-sm" onClick={stop}>
              Stop
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {mode === "fixed" ? (
            <>
              <strong>Attack defeated.</strong> {error}
            </>
          ) : (
            error
          )}
        </div>
      )}

      {runState !== "idle" && (
        <div className="rounded-lg border p-4">
          <div className="mb-2 flex justify-between text-sm text-slate-600">
            <span>
              Oracle queries so far: <strong>{queryCount || visibleSteps.length}</strong>
            </span>
            <span>
              Plaintext bytes recovered: <strong>{recoveredBytesSoFar}</strong>
            </span>
          </div>

          {lastStep && (
            <div className="mb-3 font-mono text-xs text-slate-700">
              block {lastStep.blockIndex} · byte from end {lastStep.byteIndexFromEnd} ·
              guess 0x{lastStep.guess.toString(16).padStart(2, "0")} →{" "}
              {lastStep.isValidPadding ? "valid padding" : "invalid padding"}
              {lastStep.recoveredPlaintextByte !== undefined && (
                <> ✓ recovered 0x{lastStep.recoveredPlaintextByte.toString(16).padStart(2, "0")}</>
              )}
            </div>
          )}

          <div className="max-h-48 overflow-y-auto rounded bg-slate-950 p-2 font-mono text-[11px] leading-5 text-green-400">
            {visibleSteps.slice(-200).map((s, i) => (
              <div key={i}>
                [blk {s.blockIndex}][byte {17 - s.byteIndexFromEnd}] guess=0x
                {s.guess.toString(16).padStart(2, "0")} →{" "}
                {s.isValidPadding ? "VALID" : "invalid"}
                {s.recoveredPlaintextByte !== undefined &&
                  ` -> plaintext byte 0x${s.recoveredPlaintextByte
                    .toString(16)
                    .padStart(2, "0")}`}
              </div>
            ))}
          </div>

          {recoveredHex && (
            <div className="mt-4 rounded bg-slate-100 p-3">
              <div className="text-xs uppercase text-slate-500">Recovered plaintext</div>
              <div className="font-mono text-sm">{recoveredHex}</div>
              <div className="font-mono text-sm text-slate-600">
                {bytesToPrintable(hexToBytes(recoveredHex))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}