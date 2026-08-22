"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { CipherDefinition } from "../../lib/cipher/registry";
import type { CipherResult } from "../../lib/cipher/types";
import type { AnimationSpeed } from "./StepAnimator";
import WorkspacePresetManager from "./WorkspacePresetManager";
import ConversionHistory from "./ConversionHistory";
import WhereIsThisUsed from "./WhereIsThisUsed";
import TraceTransferControls from "./TraceTransferControls";
import CipherLifecycleBadge from "./CipherLifecycleBadge";
import DataProvenanceBadge from "../ui/DataProvenanceBadge";
import CipherInputPanel from "./CipherInputPanel";
import CipherOptionsPanel from "./CipherOptionsPanel";
import CipherVisualizerHost from "./CipherVisualizerHost";
import { usePermalinkController } from "./PermalinkController";
import { useCipherExecutionController } from "./CipherExecutionController";
import { loadConversionHistory, type ConversionHistoryEntry } from "../../lib/utils/conversionHistory";
import { traceToCipherResult, type CipherTraceFile } from "../../lib/utils/cipherTrace";
import { clampStepIndex } from "../../lib/utils/visualizerPermalink";
import { resolveProvenance } from "../../lib/provenance/resolve";
import type { DataProvenanceMetadata } from "../../lib/provenance";
import { createStableStepId, getScopeAnnotations, loadStepAnnotationStore, clearScopeAnnotations, removeStepNote, toggleStepBookmark, updateStepNote, type StepAnnotationStore } from "../../lib/utils/stepAnnotations";

const StepAnimator = dynamic(() => import("./StepAnimator"), { ssr: false });
const UniversalCipherDebugger = dynamic(() => import("./UniversalCipherDebugger"), { ssr: false });

interface CipherLayoutProps { cipher: CipherDefinition }

const KEYLESS_CIPHERS = ["atbash", "rot13", "sha256", "sha512", "md5", "xxhash32", "bloomfilter", "bloom-filter"] as const;

export default function CipherLayout({ cipher }: CipherLayoutProps) {
  const [input, setInput] = useState(cipher.defaultInput);
  const [key, setKey] = useState(cipher.defaultKey);
  const [action, setAction] = useState<"encrypt" | "decrypt">("encrypt");
  const [autoCompute, setAutoCompute] = useState(true);
  const [hexInput, setHexInput] = useState(true);
  const [rounds, setRounds] = useState(4);
  const [demoMode, setDemoMode] = useState(true);
  const [bobSecret, setBobSecret] = useState("15");
  const [aesMode, setAesMode] = useState("ECB");
  const [padding, setPadding] = useState(true);
  const [result, setResult] = useState<CipherResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState<AnimationSpeed>(1);
  const [activeTab, setActiveTab] = useState<"result" | "history" | "debugger">("result");
  const [history, setHistory] = useState<ConversionHistoryEntry[]>([]);
  const [annotationStore, setAnnotationStore] = useState<StepAnnotationStore>({ version: 1, scopes: {} });
  const [stepNoteInput, setStepNoteInput] = useState("");

  const options = useMemo(() => ({ hexInput, rounds, demoMode, bobSecret, aesMode, padding, autoCompute }), [hexInput, rounds, demoMode, bobSecret, aesMode, padding, autoCompute]);

  const restorePermalink = useCallback((shared: ReturnType<typeof import("../../lib/utils/visualizerPermalink").parseVisualizerPermalink>) => {
    if (shared.input !== undefined) setInput(shared.input);
    if (shared.key !== undefined) setKey(shared.key);
    if (shared.direction !== undefined && cipher.id !== "dh") setAction(shared.direction);
    if (shared.options.hexInput !== undefined) setHexInput(shared.options.hexInput);
    if (shared.options.rounds !== undefined) setRounds(shared.options.rounds);
    if (shared.options.demoMode !== undefined) setDemoMode(shared.options.demoMode);
    if (shared.options.bobSecret !== undefined) setBobSecret(shared.options.bobSecret);
    if (shared.options.padding !== undefined) setPadding(shared.options.padding);
    if (shared.options.aesMode !== undefined) setAesMode(shared.options.aesMode);
    if (shared.options.autoCompute !== undefined) setAutoCompute(shared.options.autoCompute);
    if (shared.step !== undefined) setCurrentStep(shared.step);
  }, [cipher.id]);

  const { setStep } = usePermalinkController({ cipherId: cipher.id, input, key, action, currentStep, options, onRestore: restorePermalink });

  useEffect(() => setAnnotationStore(loadStepAnnotationStore()), []);
  useEffect(() => setHistory(loadConversionHistory(cipher.id)), [cipher.id]);
  useEffect(() => {
    setInput(cipher.defaultInput);
    setKey(cipher.defaultKey);
    setResult(null);
    setError(null);
    setCurrentStep(0);
    setActiveTab("result");
  }, [cipher]);

  const { run, loading, workerError } = useCipherExecutionController({
    cipher, input, key, action, autoCompute, options, demoMode,
    onResult: setResult,
    onStepRestore: setCurrentStep,
    onHistory: setHistory,
    onError: setError,
  });

  const handleTraceImport = (trace: CipherTraceFile) => {
    setAutoCompute(false);
    setInput(trace.input);
    setKey(trace.key);
    setAction(trace.direction);
    if (typeof trace.options.hexInput === "boolean") setHexInput(trace.options.hexInput);
    if (typeof trace.options.rounds === "number") setRounds(trace.options.rounds);
    if (typeof trace.options.demoMode === "boolean") setDemoMode(trace.options.demoMode);
    if (typeof trace.options.bobSecret === "string") setBobSecret(trace.options.bobSecret);
    if (typeof trace.options.padding === "boolean") setPadding(trace.options.padding);
    setResult(traceToCipherResult(trace));
    setCurrentStep(0);
    setActiveTab("result");
    setError(null);
  };

  const handlePresetLoad = (preset: import("../../lib/utils/workspacePresets").WorkspacePreset) => {
    if (preset.cipherId !== cipher.id) { setError("This preset belongs to a different cipher."); return; }
    setAutoCompute(false); setAction(cipher.id === "dh" ? "encrypt" : preset.direction); setInput(preset.input);
    if (preset.key !== undefined) setKey(preset.key);
    if (typeof preset.options.hexInput === "boolean") setHexInput(preset.options.hexInput);
    if (typeof preset.options.rounds === "number") setRounds(preset.options.rounds);
    if (typeof preset.options.demoMode === "boolean") setDemoMode(preset.options.demoMode);
    if (typeof preset.options.bobSecret === "string") setBobSecret(preset.options.bobSecret);
    if (typeof preset.options.padding === "boolean") setPadding(preset.options.padding);
    setAnimationSpeed(preset.animationSpeed); setResult(null); setCurrentStep(0); setActiveTab("result"); setError(null);
  };

  const direction = cipher.id === "dh" ? "encrypt" : action;
  const activeStep = result?.steps?.[currentStep];
  const annotationScope = { cipherId: cipher.id, direction: direction as "encrypt" | "decrypt" };
  const scopeAnnotations = getScopeAnnotations(annotationStore, annotationScope);
  const activeStepId = activeStep ? createStableStepId(activeStep.label, currentStep) : null;
  const activeAnnotation = activeStepId ? scopeAnnotations.find((item) => item.stepId === activeStepId) : undefined;

  const handleStepChange = (next: number) => {
    const safe = clampStepIndex(next, result?.steps?.length ?? 0);
    setCurrentStep(safe);
    setStep(safe);
  };

  const provenance = resolveProvenance(result?.metadata?.provenance ?? (cipher.id === "dh" || (cipher.id === "rsa" && demoMode) ? { provenance: "simulated", source: "CryptoViz educational simulation" } as DataProvenanceMetadata : undefined));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8">
      <header className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-center dark:border-zinc-800">
        <div><h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-3xl">{cipher.name}</h1><p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">{cipher.description}</p></div>
        <div className="flex flex-wrap items-center gap-2"><CipherLifecycleBadge status={cipher.securityStatus} size="sm" /><span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">{cipher.category}</span></div>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 md:gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-6 lg:col-span-5">
          <CipherInputPanel cipher={cipher} input={input} key={key} onInputChange={setInput} onKeyChange={setKey} keylessCiphers={KEYLESS_CIPHERS} />
          <CipherOptionsPanel cipher={cipher} action={action} autoCompute={autoCompute} hexInput={hexInput} rounds={rounds} demoMode={demoMode} bobSecret={bobSecret} aesMode={aesMode} padding={padding} loading={loading} onActionChange={setAction} onAutoComputeChange={setAutoCompute} onHexInputChange={setHexInput} onRoundsChange={setRounds} onDemoModeChange={setDemoMode} onBobSecretChange={setBobSecret} onAesModeChange={setAesMode} onPaddingChange={setPadding} onRun={() => void run()} />
          <WorkspacePresetManager cipherId={cipher.id} workspace={{ cipherId: cipher.id, direction, input, key, options, animationSpeed }} onLoad={handlePresetLoad} />
          {(error || workerError) && <div role="alert" aria-live="polite" className="rounded-xl border border-red-100 bg-red-50 p-4 text-xs text-red-700 dark:border-red-950/40 dark:bg-red-950/10 dark:text-red-400"><strong>Execution Error</strong><p className="mt-1">{error || workerError?.message || "Unknown error"}</p></div>}
        </div>

        <div className="flex flex-col gap-6 lg:col-span-7">
          <div className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800/80" role="tablist" aria-label="Cipher result views">
            {(["result", "history", ...( ["aes", "des", "3des", "twofish", "serpent", "camellia", "aria"].includes(cipher.id) ? ["debugger"] : [])] as const).map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} aria-selected={activeTab === tab} className={`flex-1 rounded-md py-1.5 text-center text-xs font-semibold ${activeTab === tab ? "bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"}`}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}
          </div>

          {activeTab === "result" && <>
            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40" aria-label="Cipher result">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-2xs font-semibold uppercase tracking-wider text-zinc-400">{cipher.category === "hash" ? "Generated Hash Digest" : "Output Result"}</span><DataProvenanceBadge provenance={provenance} /></div>
              <div className="mt-2 min-h-[48px] overflow-x-auto rounded-lg bg-zinc-50 p-3 font-mono text-sm break-all dark:bg-zinc-950/40">{loading ? "Computing..." : result ? result.output : <span className="italic text-zinc-400">No output yet</span>}</div>
            </section>
            <TraceTransferControls cipherId={cipher.id} direction={direction} input={input} cipherKey={key} options={options} result={result} onImport={handleTraceImport} />
            <CipherVisualizerHost cipherId={cipher.id} result={result} currentStep={currentStep} onStepChange={handleStepChange} />
            {result?.steps?.length ? <section aria-label="Step-by-step trace" className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-1"><span className="text-2xs font-semibold uppercase tracking-wider text-zinc-400">Step-by-Step Mathematical Trace</span><button type="button" onClick={() => activeStep && activeStepId && setAnnotationStore(toggleStepBookmark(annotationStore, annotationScope, activeStepId, activeStep.label))} className="rounded-md border px-2.5 py-1 text-xs">{activeAnnotation?.bookmarked ? "Bookmarked ★" : "Bookmark Step"}</button></div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"><div className="flex gap-2"><input value={stepNoteInput || activeAnnotation?.note || ""} onChange={(event) => setStepNoteInput(event.target.value)} placeholder="Add a personal note to this step..." className="flex-1 rounded-md border px-3 py-1.5 text-xs dark:bg-zinc-950" /><button type="button" onClick={() => { if (activeStep && activeStepId) setAnnotationStore(updateStepNote(annotationStore, annotationScope, activeStepId, activeStep.label, stepNoteInput)); setStepNoteInput(""); }} className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white">Save Note</button></div></div>
              <StepAnimator steps={result.steps} currentStep={currentStep} onStepChange={handleStepChange} speed={animationSpeed} onSpeedChange={setAnimationSpeed} onCopyStepLink={async () => setStep(currentStep)} />
            </section> : null}
          </>}
          {activeTab === "history" && <ConversionHistory cipherId={cipher.id} history={history} onHistoryChange={setHistory} />}
          {activeTab === "debugger" && <UniversalCipherDebugger cipherId={cipher.id} action={action} input={input} key={key} options={options} />}
        </div>
      </div>
      <WhereIsThisUsed cipherId={cipher.id} />
    </div>
  );
}
