import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CipherDefinition, CipherOptionValue } from '../../lib/cipher/registry'
import type { CipherResult } from '../../lib/cipher/types'
import type { CipherErrorCode } from '../../lib/utils/errors'
import { useCipherWorker } from '@/hooks/useCipherWorker'
import type { AnimationSpeed } from '../cipher/StepAnimator'
import {
  loadConversionHistory,
  saveConversionHistory,
  type ConversionHistoryEntry,
} from '../../lib/utils/conversionHistory'
import {
  buildVisualizerPermalink,
  clampStepIndex,
  parseVisualizerPermalink,
  updateStepInCurrentUrl,
} from '../../lib/utils/visualizerPermalink'
import {
  traceToCipherResult,
  type CipherTraceFile,
} from '../../lib/utils/cipherTrace'

const isBooleanOptionValue = (value: CipherOptionValue): value is boolean => typeof value === 'boolean'
const isNumberOptionValue = (value: CipherOptionValue): value is number => typeof value === 'number'
const isStringOptionValue = (value: CipherOptionValue): value is string => typeof value === 'string'

interface UseSandboxStateProps {
  cipher: CipherDefinition
}

interface UseSandboxStateResult {
  // State
  input: string
  setInput: (value: string) => void
  key: string
  setKey: (value: string) => void
  action: "encrypt" | "decrypt"
  setAction: (value: "encrypt" | "decrypt") => void
  autoCompute: boolean
  setAutoCompute: (value: boolean) => void
  hexInput: boolean
  setHexInput: (value: boolean) => void
  rounds: number
  setRounds: (value: number) => void
  demoMode: boolean
  setDemoMode: (value: boolean) => void
  bobSecret: string
  setBobSecret: (value: string) => void
  aesMode: string
  setAesMode: (value: string) => void
  padding: boolean
  setPadding: (value: boolean) => void
  result: CipherResult | null
  setResult: (value: CipherResult | null) => void
  error: string | null
  setError: (value: string | null) => void
  currentStep: number
  setCurrentStep: (value: number) => void
  animationSpeed: AnimationSpeed
  setAnimationSpeed: (value: AnimationSpeed) => void
  activeTab: "result" | "history"
  setActiveTab: (value: "result" | "history") => void
  history: ConversionHistoryEntry[]
  setHistory: (value: ConversionHistoryEntry[]) => void
  // Derived
  loading: boolean
  workerError: string | null
  workspaceOptions: Record<string, unknown>
  traceOptions: Record<string, unknown>
  // Actions
  handleRun: () => Promise<void>
  handleTraceImport: (trace: CipherTraceFile) => void
  handleStepChange: (step: number) => void
  handleCopyStepLink: () => Promise<void>
}

export function useSandboxState({ cipher }: UseSandboxStateProps): UseSandboxStateResult {
  const { runCipher, loading, error: workerError } = useCipherWorker();
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingSharedStepRef = useRef<number | null>(null);
  const router = useRouter();
  
  const [input, setInput] = useState(cipher.defaultInput);
  const [key, setKey] = useState(cipher.defaultKey);
  const [action, setAction] = useState<"encrypt" | "decrypt">("encrypt");
  const [autoCompute, setAutoCompute] = useState(true);
  
  // Custom options states
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
  const [activeTab, setActiveTab] = useState<"result" | "history">("result");
  const [history, setHistory] = useState<ConversionHistoryEntry[]>([]);

  // Restore a shared visualizer configuration from the URL (runs once per cipher).
   
  useEffect(() => {
    const shared = parseVisualizerPermalink(window.location.search)
    setInput(shared.input ?? cipher.defaultInput)
    setKey(shared.key ?? cipher.defaultKey)
    if (shared.direction !== undefined && cipher.id !== 'dh') {
      setAction(shared.direction)
    }
    if (shared.options.hexInput !== undefined) setHexInput(shared.options.hexInput)
    if (shared.options.rounds !== undefined) setRounds(shared.options.rounds)
    if (shared.options.demoMode !== undefined) setDemoMode(shared.options.demoMode)
    if (shared.options.bobSecret !== undefined) setBobSecret(shared.options.bobSecret)
    if (shared.options.padding !== undefined) setPadding(shared.options.padding)
    if (shared.options.aesMode !== undefined) setAesMode(shared.options.aesMode)
    if (shared.options.autoCompute !== undefined) setAutoCompute(shared.options.autoCompute)
    pendingSharedStepRef.current = shared.step ?? null
  }, [cipher.id, cipher.defaultInput, cipher.defaultKey])
   

  // Sync playground state into the URL (debounced) so refresh/share preserves the session.
  useEffect(() => {
    const debounceId = setTimeout(() => {
      const permalink = buildVisualizerPermalink(window.location.href, {
        input,
        key,
        direction: cipher.id === 'dh' ? 'encrypt' : action,
        step: currentStep,
        options: { hexInput, rounds, demoMode, bobSecret, padding, aesMode, autoCompute },
      })
      router.replace(permalink, { scroll: false })
    }, 300)
    return () => clearTimeout(debounceId)
  }, [input, key, action, hexInput, rounds, demoMode, bobSecret, aesMode, padding, autoCompute, currentStep, cipher.id, router])

  // Reset inputs when cipher changes
   
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const shared = parseVisualizerPermalink(window.location.search);
    setInput(shared.input ?? cipher.defaultInput);
    setKey(shared.key ?? cipher.defaultKey);
    setResult(null);
    setError(null);
    setCurrentStep(0);
    setAnimationSpeed(1);
    setActiveTab("result");
    setHistory(loadConversionHistory(cipher.id));
    // Reset option defaults
    if (cipher.options) {
      cipher.options.forEach((opt) => {
        if (opt.id === "hexInput" && shared.options.hexInput === undefined && isBooleanOptionValue(opt.default)) {
          setHexInput(opt.default);
        }
        if (opt.id === "rounds" && shared.options.rounds === undefined && isNumberOptionValue(opt.default)) {
          setRounds(opt.default);
        }
        if (opt.id === "demoMode" && shared.options.demoMode === undefined && isBooleanOptionValue(opt.default)) {
          setDemoMode(opt.default);
        }
        if (opt.id === "bobSecret" && shared.options.bobSecret === undefined && isStringOptionValue(opt.default)) {
          setBobSecret(opt.default);
        }
        if (opt.id === "padding" && shared.options.padding === undefined && isBooleanOptionValue(opt.default)) {
          setPadding(opt.default);
        }
      });
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [cipher]);
   

  const workspaceOptions: Record<string, unknown> = {
    hexInput,
    rounds,
    demoMode,
    bobSecret,
    padding,
  };

  const traceOptions: Record<string, unknown> = {
    hexInput,
    rounds,
    demoMode,
    bobSecret,
    padding,
  };

  const handleRun = async () => {
    const cleanUrl = updateStepInCurrentUrl(window.location.href, null);
    router.replace(cleanUrl, { scroll: false });
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setError(null);
    try {
      // Gather options
      const options: Record<string, unknown> & { instrument?: boolean; signal?: AbortSignal } = {
        instrument: true, // Always request instrumented steps for visualizer
        signal: controller.signal,
      };
      if (cipher.id === "des" || cipher.id === "3des" || cipher.id === "aes" || cipher.id === "camellia") {
        options.hexInput = hexInput;
      }
      if (cipher.id === "aes" || cipher.id === "camellia") {
        options.mode = aesMode;
      }
      if (cipher.id === "bcrypt") {
        options.rounds = rounds;
      }
      if (cipher.id === "rsa") {
        options.mode = demoMode ? "demo" : "real";
      }
      if (cipher.id === "dh") {
        options.mode = "demo"; // Always demo for paint mixing
        options.bobSecret = bobSecret;
      }
      if (cipher.id === "camellia") {
        options.padding = padding;
      }
      // DH does not support decrypt
      const currentAction = cipher.id === "dh" ? "encrypt" : action;
      const res = await runCipher(
        currentAction,
        cipher.id,
        input,
        key,
        options,
      );
      if (!controller.signal.aborted) {
        setResult(res);
        const restoredStep = pendingSharedStepRef.current;
        setCurrentStep(
          restoredStep === null
            ? 0
            : clampStepIndex(restoredStep, res.steps?.length ?? 0),
        );
        pendingSharedStepRef.current = null;
        if (res?.output !== undefined) {
          const entry: ConversionHistoryEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            cipherId: cipher.id,
            input,
            key,
            action: currentAction,
            output: String(res.output),
            timestamp: new Date().toLocaleString(),
            parameters: cipher.id === 'chacha20-poly1305' && key.split('|')[1]
              ? { nonce: key.split('|')[1].split(':')[0] }
              : cipher.id === 'aes-gcm' && typeof options.iv === 'string'
                ? { iv: options.iv }
                : undefined,
          };
          setHistory((prev) =>
            saveConversionHistory(cipher.id, [entry, ...prev]),
          );
        }
      }
    } catch (err: unknown) {
      if ((err instanceof DOMException || err instanceof Error) && err.name === "AbortError") {
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "An error occurred during calculation.");
      setResult(null);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleTraceImport = (trace: CipherTraceFile) => {
    // Loading a trace only updates local UI state. It does not call runCipher().
    setAutoCompute(false);
    setInput(trace.input);
    setKey(trace.key);
    setAction(trace.direction);
    if (typeof trace.options.hexInput === "boolean") {
      setHexInput(trace.options.hexInput);
    }
    if (typeof trace.options.rounds === "number") {
      setRounds(trace.options.rounds);
    }
    if (typeof trace.options.demoMode === "boolean") {
      setDemoMode(trace.options.demoMode);
    }
    if (typeof trace.options.bobSecret === "string") {
      setBobSecret(trace.options.bobSecret);
    }
    if (typeof trace.options.padding === "boolean") {
      setPadding(trace.options.padding);
    }
    const importedResult = traceToCipherResult(trace);
    setResult(importedResult);
    const restoredStep = pendingSharedStepRef.current;
    setCurrentStep(
      restoredStep === null
        ? 0
        : clampStepIndex(restoredStep, importedResult.steps?.length ?? 0),
    );
    pendingSharedStepRef.current = null;
    setActiveTab("result");
    setError(null);
  };

  // Auto-run with debounce when computation inputs change
  useEffect(() => {
    if (!autoCompute) return;
    const debounceId = setTimeout(() => {
      void handleRun();
    }, 450);
    return () => clearTimeout(debounceId);
  }, [
    autoCompute,
    cipher,
    input,
    key,
    action,
    hexInput,
    rounds,
    demoMode,
    bobSecret,
    aesMode,
    padding,
  ]);

  const handleStepChange = (nextStep: number) => {
    const safeStep = clampStepIndex(nextStep, result?.steps?.length ?? 0)
    setCurrentStep(safeStep)
    if (result?.steps?.length) {
      const nextUrl = updateStepInCurrentUrl(window.location.href, safeStep)
      router.replace(nextUrl, { scroll: false })
    }
  }

  const handleCopyStepLink = async () => {
    const permalink = buildVisualizerPermalink(window.location.href, {
      input,
      key,
      direction: cipher.id === 'dh' ? 'encrypt' : action,
      step: currentStep,
      options: {
        hexInput,
        rounds,
        demoMode,
        bobSecret,
        padding,
      },
    })
    await navigator.clipboard.writeText(permalink)
  }

  return {
    input,
    setInput,
    key,
    setKey,
    action,
    setAction,
    autoCompute,
    setAutoCompute,
    hexInput,
    setHexInput,
    rounds,
    setRounds,
    demoMode,
    setDemoMode,
    bobSecret,
    setBobSecret,
    aesMode,
    setAesMode,
    padding,
    setPadding,
    result,
    setResult,
    error,
    setError,
    currentStep,
    setCurrentStep,
    animationSpeed,
    setAnimationSpeed,
    activeTab,
    setActiveTab,
    history,
    setHistory,
    loading,
    workerError,
    workspaceOptions,
    traceOptions,
    handleRun,
    handleTraceImport,
    handleStepChange,
    handleCopyStepLink,
  }
}
