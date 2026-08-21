"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type {
  CipherDefinition,
  CipherOptionValue,
} from "../../lib/cipher/registry";
import type {
  CipherResult,
  CipherOptions,
} from "../../lib/cipher/types";
import { useCipherWorker } from "../../lib/hooks/useCipherWorker";
import type { AnimationSpeed } from "./StepAnimator";
import WorkspacePresetManager from "./WorkspacePresetManager";
import ConversionHistory from "./ConversionHistory";
import WhereIsThisUsed from "./WhereIsThisUsed";
import type { WorkspacePreset } from "../../lib/utils/workspacePresets";
import {
  clearScopeAnnotations,
  createStableStepId,
  getScopeAnnotations,
  loadStepAnnotationStore,
  removeStepNote,
  toggleStepBookmark,
  updateStepNote,
  type StepAnnotationStore,
} from "../../lib/utils/stepAnnotations";
import {
  buildVisualizerPermalink,
  clampStepIndex,
  parseVisualizerPermalink,
  updateStepInCurrentUrl,
} from "../../lib/utils/visualizerPermalink";
import TraceTransferControls from "./TraceTransferControls";
import CipherLifecycleBadge from "./CipherLifecycleBadge";
import LessonPackageModal from "./LessonPackageModal";
import LessonPlayerModal from "./LessonPlayerModal";
import type { LessonPackage } from "../../lib/utils/lessonPackage";
import {
  loadConversionHistory,
  saveConversionHistory,
  type ConversionHistoryEntry,
} from "../../lib/utils/conversionHistory";
import {
  traceToCipherResult,
  type CipherTraceFile,
} from "../../lib/utils/cipherTrace";
import {
  getVisualizerComponent,
} from "@/components/visualizers/visualizerComponentRegistry";
import DataProvenanceBadge from "../ui/DataProvenanceBadge";
import { resolveProvenance } from "../../lib/provenance/resolve";
import type { DataProvenanceMetadata } from "../../lib/provenance";

const StepAnimator = dynamic(() => import('./StepAnimator'), { ssr: false })
const PlayfairGrid = dynamic(() => import('./PlayfairGrid'), { ssr: false })
const RailFenceViz = dynamic(() => import('./RailFenceViz'), { ssr: false })
const DHVisualizer = dynamic(() => import('./DHVisualizer'), { ssr: false })
const HmacVisualizer = dynamic(() => import('./HmacVisualizer'), { ssr: false })
const Sm3Visualizer = dynamic(() => import('./Sm3Visualizer'), { ssr: false })
const HillMatrixVisualizer = dynamic(() => import('./HillMatrixVisualizer'), { ssr: false })
const UniversalCipherDebugger = dynamic(() => import('./UniversalCipherDebugger'), { ssr: false })
import ZenModeToggle from './ZenModeToggle'

interface CipherLayoutProps {
  cipher: CipherDefinition;
}


const isBooleanOptionValue = (
  value: CipherOptionValue,
): value is boolean => typeof value === "boolean";

const isNumberOptionValue = (
  value: CipherOptionValue,
): value is number => typeof value === "number";

const isStringOptionValue = (
  value: CipherOptionValue,
): value is string => typeof value === "string";

const isValidHistoryEntry = (
  entry: unknown,
): entry is HistoryEntry => {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "id" in entry &&
    "input" in entry &&
    "key" in entry &&
    "action" in entry &&
    "output" in entry &&
    "timestamp" in entry
  );
};

const isValidHistoryArray = (
  data: unknown,
): data is HistoryEntry[] => {
  return Array.isArray(data) && data.every(isValidHistoryEntry);
};

/**
 * Demo-only execution paths are explicitly simulated.
 *
 * This classification belongs at the presentation boundary because these
 * controls deliberately select educational/demo behavior rather than an
 * authoritative operational implementation.
 */
const isSimulatedCipherExecution = (
  cipherId: string,
  options: {
    demoMode: boolean;
  },
): boolean => {
  return (
    (cipherId === "rsa" && options.demoMode) ||
    cipherId === "dh"
  );
};

/**
 * Resolve the provenance that should be shown to the user.
 *
 * Priority:
 * 1. Explicit simulated execution selected by the UI.
 * 2. Provenance returned by the cipher engine.
 * 3. Shared resolver fallback.
 *
 * The UI never upgrades a result to "verified". Verification must originate
 * from actual provenance evidence supplied by the authoritative module.
 */
const resolveDisplayProvenance = (
  result: CipherResult | null,
  cipherId: string,
  demoMode: boolean,
): DataProvenanceMetadata => {
  if (isSimulatedCipherExecution(cipherId, { demoMode })) {
    return resolveProvenance({
      provenance: "simulated",
      source: "CryptoViz educational simulation",
    } as DataProvenanceMetadata);
  }

  return resolveProvenance(
    result?.metadata?.provenance,
  );
};

export default function CipherLayout({
  cipher,
}: CipherLayoutProps) {
  const {
    runCipher,
    loading,
    error: workerError,
  } = useCipherWorker();

  const abortControllerRef =
    useRef<AbortController | null>(null);

  const pendingSharedStepRef =
    useRef<number | null>(null);

  const [input, setInput] = useState(
    cipher.defaultInput,
  );

  const [key, setKey] = useState(
    cipher.defaultKey,
  );

  const [action, setAction] =
    useState<"encrypt" | "decrypt">("encrypt");

  const [autoCompute, setAutoCompute] =
    useState(true);

  const router = useRouter();

  // Custom options states
  const [hexInput, setHexInput] =
    useState(true);

  const [rounds, setRounds] =
    useState(4);

  const [demoMode, setDemoMode] =
    useState(true);

  const [bobSecret, setBobSecret] =
    useState("15");

  const [aesMode, setAesMode] =
    useState("ECB");

  const [padding, setPadding] =
    useState(true);

  const [result, setResult] =
    useState<CipherResult | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [currentStep, setCurrentStep] =
    useState(0);

  const [animationSpeed, setAnimationSpeed] =
    useState<AnimationSpeed>(1);

  const [activeTab, setActiveTab] =
    useState<"result" | "history">("result");

  const [history, setHistory] =
    useState<ConversionHistoryEntry[]>([]);

  const [annotationStore, setAnnotationStore] =
    useState<StepAnnotationStore>(() => ({
      version: 1,
      scopes: {},
    }));

  const [stepNoteInput, setStepNoteInput] =
    useState("");

  /**
   * Provenance shown next to the computation output.
   *
   * It is intentionally derived on every render instead of stored as
   * independent state, preventing stale provenance when the user changes
   * simulation/operation mode.
   */
  const provenance = resolveDisplayProvenance(
    result,
    cipher.id,
    demoMode,
  );

  const KEYLESS_CIPHERS = [
    "atbash",
    "rot13",
    "sha256",
    "sha512",
    "md5",
    "xxhash32",
    "bloomfilter",
    "bloom-filter",
  ];

  useEffect(() => {
    setAnnotationStore(loadStepAnnotationStore());
  }, []);

  // Restore a shared visualizer configuration from the URL.
  useEffect(() => {
    const shared = parseVisualizerPermalink(
      window.location.search,
    );

    if (shared.input !== undefined) {
      setInput(shared.input);
    }

    if (shared.key !== undefined) {
      setKey(shared.key);
    }

    if (
      shared.direction !== undefined &&
      cipher.id !== "dh"
    ) {
      setAction(shared.direction);
    }

    if (shared.options.hexInput !== undefined) {
      setHexInput(shared.options.hexInput);
    }

    if (shared.options.rounds !== undefined) {
      setRounds(shared.options.rounds);
    }

    if (shared.options.demoMode !== undefined) {
      setDemoMode(shared.options.demoMode);
    }

    if (shared.options.bobSecret !== undefined) {
      setBobSecret(shared.options.bobSecret);
    }

    if (shared.options.padding !== undefined) {
      setPadding(shared.options.padding);
    }

    if (shared.options.aesMode !== undefined) {
      setAesMode(shared.options.aesMode);
    }

    if (shared.options.autoCompute !== undefined) {
      setAutoCompute(shared.options.autoCompute);
    }

    pendingSharedStepRef.current =
      shared.step ?? null;
  }, [cipher.id]);

  // Sync playground state into the URL.
  useEffect(() => {
    const debounceId = setTimeout(() => {
      const permalink = buildVisualizerPermalink(
        window.location.href,
        {
          input,
          key,
          direction:
            cipher.id === "dh"
              ? "encrypt"
              : action,
          step: currentStep,
          options: {
            hexInput,
            rounds,
            demoMode,
            bobSecret,
            padding,
            aesMode,
            autoCompute,
          },
        },
      );

      router.replace(permalink, {
        scroll: false,
      });
    }, 300);

    return () => clearTimeout(debounceId);
  }, [
    input,
    key,
    action,
    hexInput,
    rounds,
    demoMode,
    bobSecret,
    aesMode,
    padding,
    autoCompute,
    currentStep,
    cipher.id,
    router,
  ]);

  // Reset inputs when cipher changes.
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const shared = parseVisualizerPermalink(
      window.location.search,
    );

    setInput(
      shared.input ?? cipher.defaultInput,
    );

    setKey(
      shared.key ?? cipher.defaultKey,
    );

    setResult(null);
    setError(null);
    setCurrentStep(0);
    setAnimationSpeed(1);
    setActiveTab("result");

    setHistory(
      loadConversionHistory(cipher.id),
    );

    if (cipher.options) {
      cipher.options.forEach((opt) => {
        if (
          opt.id === "hexInput" &&
          shared.options.hexInput === undefined &&
          isBooleanOptionValue(opt.default)
        ) {
          setHexInput(opt.default);
        }

        if (
          opt.id === "rounds" &&
          shared.options.rounds === undefined &&
          isNumberOptionValue(opt.default)
        ) {
          setRounds(opt.default);
        }

        if (
          opt.id === "demoMode" &&
          shared.options.demoMode === undefined &&
          isBooleanOptionValue(opt.default)
        ) {
          setDemoMode(opt.default);
        }

        if (
          opt.id === "bobSecret" &&
          shared.options.bobSecret === undefined &&
          isStringOptionValue(opt.default)
        ) {
          setBobSecret(opt.default);
        }

        if (
          opt.id === "padding" &&
          shared.options.padding === undefined &&
          isBooleanOptionValue(opt.default)
        ) {
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

  // Clear sensitive state on component unmount
  useEffect(() => {
    return () => {
      // Abort any pending operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clear sensitive key/passphrase state
      setKey('');
      // Clear derived/execution state that may contain sensitive key material
      setResult(null);
      setError(null);
      setDiagnostic(null);
      setOptionsState((prev) => ({ ...prev, bobSecret: '' }));
    };
  }, []);

  const workspaceOptions: Record<string, unknown> = {
    ...optionsState,
  };

  const handlePresetLoad = (
    preset: WorkspacePreset,
  ) => {
    if (preset.cipherId !== cipher.id) {
      setError(
        "This preset belongs to a different cipher.",
      );
      return;
    }

    setAutoCompute(false);

    setAction(
      cipher.id === "dh"
        ? "encrypt"
        : preset.direction,
    );

    setInput(preset.input);

    if (preset.key !== undefined) {
      setKey(preset.key);
    }

    if (
      typeof preset.options.hexInput ===
      "boolean"
    ) {
      setHexInput(
        preset.options.hexInput,
      );
    }

    if (
      typeof preset.options.rounds ===
      "number"
    ) {
      setRounds(
        preset.options.rounds,
      );
    }

    if (
      typeof preset.options.demoMode ===
      "boolean"
    ) {
      setDemoMode(
        preset.options.demoMode,
      );
    }

    if (
      typeof preset.options.bobSecret ===
      "string"
    ) {
      setBobSecret(
        preset.options.bobSecret,
      );
    }

    if (
      typeof preset.options.padding ===
      "boolean"
    ) {
      setPadding(
        preset.options.padding,
      );
    }

    setAnimationSpeed(
      preset.animationSpeed,
    );

    setResult(null);
    setCurrentStep(0);
    setActiveTab("result");
    setError(null);
  };

  const handleRun = async () => {
    const cleanUrl =
      updateStepInCurrentUrl(
        window.location.href,
        null,
      );

    router.replace(cleanUrl, {
      scroll: false,
    });

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller =
      new AbortController();

    abortControllerRef.current =
      controller;

    setError(null);

    try {
      const options: CipherOptions = {
        instrument: true,
        signal: controller.signal,
        ...optionsState,
      };

      if (
        cipher.id === "des" ||
        cipher.id === "3des" ||
        cipher.id === "aes" ||
        cipher.id === "camellia"
      ) {
        options.hexInput = hexInput;
      }

      if (
        cipher.id === "aes" ||
        cipher.id === "camellia"
      ) {
        options.mode = aesMode;
      }

      if (cipher.id === "bcrypt") {
        options.rounds = rounds;
      }

      if (cipher.id === "rsa") {
        options.mode = demoMode
          ? "demo"
          : "real";
      }

      if (cipher.id === "dh") {
        options.mode = "demo";
        options.bobSecret = bobSecret;
      }

      if (cipher.id === "camellia") {
        options.padding = padding
          ? "PKCS7"
          : "None";
      }

      const currentAction =
        cipher.id === "dh"
          ? "encrypt"
          : action;

      const res = await runCipher(
        currentAction,
        cipher.id,
        input,
        key,
        options,
      );

      if (!controller.signal.aborted) {
        /*
         * Preserve provenance returned by the cipher engine.
         *
         * Demo modes are explicitly simulated. We only assign "simulated"
         * when the UI itself selected an educational simulation path.
         */
        const executionProvenance =
          isSimulatedCipherExecution(
            cipher.id,
            { demoMode },
          )
            ? resolveProvenance({
                provenance: "simulated",
                source:
                  "CryptoViz educational simulation",
              } as DataProvenanceMetadata)
            : resolveProvenance(
                res.metadata?.provenance,
              );

        const resultWithProvenance: CipherResult =
          {
            ...res,
            metadata: {
              ...res.metadata,
              provenance:
                executionProvenance,
            },
          };

        setResult(
          resultWithProvenance,
        );

        const restoredStep =
          pendingSharedStepRef.current;

        setCurrentStep(
          restoredStep === null
            ? 0
            : clampStepIndex(
                restoredStep,
                resultWithProvenance.steps
                  ?.length ?? 0,
              ),
        );

        pendingSharedStepRef.current =
          null;

        if (
          resultWithProvenance.output !==
          undefined
        ) {
          const entry: ConversionHistoryEntry =
            {
              id: `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,
              cipherId: cipher.id,
              input,
              key,
              action: currentAction,
              output: String(
                resultWithProvenance.output,
              ),
              timestamp:
                new Date().toLocaleString(),
            };

          setHistory((prev) =>
            saveConversionHistory(
              cipher.id,
              [entry, ...prev],
            ),
          );
        }
      }
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.name === "AbortError"
      ) {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "An error occurred during calculation.",
      );

      setResult(null);
      
      // Try to generate diagnostic for the error
      if (err && typeof err === 'object' && 'code' in err) {
        const diagnosticResult = diagnoseError(err as any, {
          cipherId: cipher.id,
          fieldName: 'key',
          fieldValue: key,
        });
        setDiagnostic(diagnosticResult);
      } else {
        setDiagnostic(null);
      }
    } finally {
      if (
        abortControllerRef.current ===
        controller
      ) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleTraceImport = (
    trace: CipherTraceFile,
  ) => {
    setAutoCompute(false);

    setInput(trace.input);
    setKey(trace.key);
    setAction(trace.direction);

    if (
      typeof trace.options.hexInput ===
      "boolean"
    ) {
      setHexInput(
        trace.options.hexInput,
      );
    }

    if (
      typeof trace.options.rounds ===
      "number"
    ) {
      setRounds(
        trace.options.rounds,
      );
    }

    if (
      typeof trace.options.demoMode ===
      "boolean"
    ) {
      setDemoMode(
        trace.options.demoMode,
      );
    }

    if (
      typeof trace.options.bobSecret ===
      "string"
    ) {
      setBobSecret(
        trace.options.bobSecret,
      );
    }

    if (
      typeof trace.options.padding ===
      "boolean"
    ) {
      setPadding(
        trace.options.padding,
      );
    }

    /*
     * traceToCipherResult() resolves and preserves the provenance attached
     * to the imported artifact.
     */
    const importedResult =
      traceToCipherResult(trace);

    setResult(importedResult);

    const restoredStep =
      pendingSharedStepRef.current;

    setCurrentStep(
      restoredStep === null
        ? 0
        : clampStepIndex(
            restoredStep,
            importedResult.steps
              ?.length ?? 0,
          ),
    );

    pendingSharedStepRef.current =
      null;

    setActiveTab("result");
    setError(null);
  };

  const handleLessonImported = (lesson: LessonPackage) => {
    setActiveLesson(lesson);
    setAutoCompute(false);
    setInput(lesson.executionContext.input);
    setKey(lesson.executionContext.key);
    setAction(lesson.executionContext.direction);
    setOptionsState((prev) => ({
      ...prev,
      ...lesson.executionContext.options,
    }));
    const importedResult = traceToCipherResult({
      schemaVersion: 1,
      cipherId: lesson.executionContext.algorithmId,
      direction: lesson.executionContext.direction,
      input: lesson.executionContext.input,
      key: lesson.executionContext.key,
      options: lesson.executionContext.options,
      output: lesson.output,
      outputEncoding: lesson.outputEncoding,
      steps: lesson.steps,
      metadata: { name: lesson.metadata.targetCipher, securityStatus: 'secure' },
      durationMs: 0,
      timestamp: lesson.metadata.createdAt,
    });
    setResult(createVirtualizedCipherResult(importedResult));
    setCurrentStep(0);
    setActiveTab("result");
    setError(null);
    setIsLessonPlayerOpen(true);
  };

  const handleLessonStepNavigate = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  useEffect(() => {
    if (!autoCompute) {
      return;
    }

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
    optionsState,
  ]);

  const renderSpecificVisualizer = () => {
    if (
      !result ||
      result.steps.length === 0
    ) {
      return null;
    }

    const activeStep =
      result.steps[currentStep];

    if (!activeStep) {
      return null;
    }

    const Visualizer =
      getVisualizerComponent(
        cipher.id,
      );

    if (!Visualizer) {
      return null;
    }

    return (
      <Visualizer
        cipherId={cipher.id}
        currentStep={currentStep}
        result={result}
        activeStep={activeStep}
        onStepChange={handleStepChange}
      />
    );
  };

  const handleStepChange = (
    nextStep: number,
  ) => {
    const safeStep =
      clampStepIndex(
        nextStep,
        result?.steps?.length ?? 0,
      );

    setCurrentStep(safeStep);

    if (result?.steps?.length) {
      const nextUrl =
        updateStepInCurrentUrl(
          window.location.href,
          safeStep,
        );

      router.replace(nextUrl, {
        scroll: false,
      });
    }
  };

  const handleCopyStepLink =
    async () => {
      const permalink =
        buildVisualizerPermalink(
          window.location.href,
          {
            input,
            key,
            direction:
              cipher.id === "dh"
                ? "encrypt"
                : action,
            step: currentStep,
            options: {
              hexInput,
              rounds,
              demoMode,
              bobSecret,
              padding,
            },
          },
        );

      await navigator.clipboard.writeText(
        permalink,
      );
    };

  const annotationScope = {
    cipherId: cipher.id,
    direction:
      cipher.id === "dh"
        ? ("encrypt" as const)
        : action,
  };

  const activeStep =
    result?.steps?.[currentStep];

  const activeStepId = activeStep
    ? createStableStepId(
        activeStep.label,
        currentStep,
      )
    : null;

  const scopeAnnotations =
    getScopeAnnotations(
      annotationStore,
      annotationScope,
    );

  const activeAnnotation =
    activeStepId
      ? scopeAnnotations.find(
          (item) =>
            item.stepId ===
            activeStepId,
        )
      : undefined;

  const bookmarkedSteps =
    result?.steps
      ? result.steps
          .map((step, index) => {
            const stepId =
              createStableStepId(
                step.label,
                index,
              );

            const annotation =
              scopeAnnotations.find(
                (item) =>
                  item.stepId ===
                    stepId &&
                  item.bookmarked,
              );

            return annotation
              ? {
                  ...annotation,
                  stepIndex: index,
                }
              : null;
          })
          .filter(
            (
              item,
            ): item is NonNullable<
              typeof item
            > => item !== null,
          )
      : [];

  const handleToggleStepBookmark =
    () => {
      if (
        !activeStep ||
        !activeStepId
      ) {
        return;
      }

      setAnnotationStore(
        toggleStepBookmark(
          annotationStore,
          annotationScope,
          activeStepId,
          activeStep.label,
        ),
      );
    };

  const handleSaveStepNote = (
    note: string,
  ) => {
    if (
      !activeStep ||
      !activeStepId
    ) {
      return;
    }

    setAnnotationStore(
      updateStepNote(
        annotationStore,
        annotationScope,
        activeStepId,
        activeStep.label,
        note,
      ),
    );
  };

  const handleDeleteStepNote =
    () => {
      if (!activeStepId) {
        return;
      }

      setAnnotationStore(
        removeStepNote(
          annotationStore,
          annotationScope,
          activeStepId,
        ),
      );
    };

  const handleClearStepAnnotations =
    async () => {
      if (
        !window.confirm(
          "Clear all notes and bookmarks for this cipher and direction?",
        )
      ) {
        return;
      }

      setAnnotationStore(
        clearScopeAnnotations(
          annotationStore,
          annotationScope,
        ),
      );

      const permalink =
        buildVisualizerPermalink(
          window.location.href,
          {
            input,
            key,
            direction:
              cipher.id === "dh"
                ? "encrypt"
                : action,
            step: currentStep,
            options: {
              hexInput,
              rounds,
              demoMode,
              bobSecret,
            },
          },
        );

      await navigator.clipboard.writeText(
        permalink,
      );
    };

  const traceOptions: Record<
    string,
    unknown
  > = {
    hexInput,
    rounds,
    demoMode,
    bobSecret,
    padding,
  };

  return (
    <div className={`mx-auto flex max-w-7xl flex-col gap-6 px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8 ${isZenMode ? 'zen-mode-active' : ''}`}>
      {/* Title & Metadata Card */}
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-center dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-3xl">
            {cipher.name}
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            {cipher.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CipherLifecycleBadge
            status={cipher.securityStatus}
            size="sm"
          />

          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            {cipher.category}
          </span>
          {['aes', 'twofish'].includes(cipher.id) && (
            <a 
              href="/finite-field"
              className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700 hover:bg-teal-100 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300 dark:hover:bg-teal-900 transition-colors"
            >
              Learn the GF(2^8) Math
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 md:gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Controls Column */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          {cipher.category !== "hash" &&
            cipher.id !== "dh" && (
              <div className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800/80">
                <button
                  onClick={() =>
                    setAction("encrypt")
                  }
                  className={`flex-1 rounded-md py-2.5 text-center text-xs font-semibold transition-all duration-200 active:scale-95 ${
                    action === "encrypt"
                      ? "bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  Encrypt / Sign
                </button>

                <button
                  onClick={() =>
                    setAction("decrypt")
                  }
                  className={`flex-1 rounded-md py-2.5 text-center text-xs font-semibold transition-all duration-200 active:scale-95 ${
                    action === "decrypt"
                      ? "bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  Decrypt / Verify
                </button>
              </div>
            )}

          {/* Inputs Section */}
          <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {cipher.id === "ecc" &&
                action === "decrypt"
                  ? "Original Message (to verify)"
                  : "Plaintext / Input Message"}
              </label>

              <textarea
                value={input}
                onChange={(e) =>
                  setInput(e.target.value)
                }
                className="min-h-[120px] w-full resize-y rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 font-mono text-sm leading-relaxed text-zinc-900 outline-none transition-all focus:border-teal-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100 dark:focus:border-teal-400 dark:focus:bg-zinc-950"
                placeholder="Enter input here..."
              />
            </div>

            {KEYLESS_CIPHERS.includes(
              cipher.id,
            ) ? (
              <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  No key required for this cipher
                </span>

                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  This algorithm operates
                  using a fixed transformation
                  or deterministic digest rule.
                </p>
              </div>
            ) : (
              cipher.defaultKey !==
                undefined && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {cipher.id === "ecc"
                      ? action === "encrypt"
                        ? "Private Key (Hex)"
                        : "Signature, Public Key (comma separated)"
                      : cipher.id === "dh"
                        ? "Alice Private Secret (a) & Public Parameters (p, g)"
                        : "Cryptographic Key / Shift"}
                  </label>

                  <input
                    type="text"
                    value={key}
                    onChange={(e) =>
                      setKey(e.target.value)
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 font-mono text-sm text-zinc-900 outline-none transition-all focus:border-teal-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100 dark:focus:border-teal-400 dark:focus:bg-zinc-950"
                    placeholder={
                      cipher.keyPlaceholder ||
                      "Enter key..."
                    }
                  />
                </div>
              )
            )}

            {cipher.id === "bcrypt" && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {cipher.id === "ecc"
                      ? action === "encrypt"
                        ? "Private Key (Hex)"
                        : "Signature, Public Key (comma separated)"
                      : cipher.id === "dh"
                        ? "Alice Private Secret (a) & Public Parameters (p, g)"
                        : "Cryptographic Key / Shift"}
                  </label>

                  <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                    {rounds}
                  </span>
                </div>

                <input
                  type="range"
                  min="4"
                  max="12"
                  value={rounds}
                  onChange={(e) =>
                    setRounds(
                      parseInt(
                        e.target.value,
                        10,
                      ),
                    )
                  }
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-teal-600 dark:bg-zinc-700 dark:accent-teal-400"
                />
              </div>
            )}

            {cipher.id === "dh" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Bob Private Secret (b)
                </label>

                <input
                  type="text"
                  value={bobSecret}
                  onChange={(e) =>
                    setBobSecret(e.target.value)
                  }
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 font-mono text-sm text-zinc-900 outline-none transition-all focus:border-teal-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100 dark:focus:border-teal-400"
                />
              </div>
            )}

            {cipher.id === "rsa" && (
              <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Demo Mode (Square & Multiply walkthrough)
                  </span>

                  {demoMode && (
                    <span className="text-2xs font-medium text-amber-600 dark:text-amber-400">
                      Simulated educational execution
                    </span>
                  )}
                </div>

                <input
                  type="checkbox"
                  checked={demoMode}
                  onChange={(e) =>
                    setDemoMode(
                      e.target.checked,
                    )
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
            )}

            {cipher.id === "dh" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/20">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Educational simulation — values shown here
                  are locally generated for demonstration and
                  are not live protocol state.
                </p>
              </div>
            )}

            {["des", "3des", "aes", "camellia"].includes(
              cipher.id,
            ) && (
              <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Input / Key in Hex Format
                </span>

                <input
                  type="checkbox"
                  checked={hexInput}
                  onChange={(e) =>
                    setHexInput(
                      e.target.checked,
                    )
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
            )}

            {(cipher.id === "aes" ||
              cipher.id === "camellia") && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Mode of Operation
                </label>

                <select
                  value={aesMode}
                  onChange={(e) =>
                    setAesMode(e.target.value)
                  }
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 font-mono text-sm text-zinc-900 outline-none transition-all focus:border-teal-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100 dark:focus:border-teal-400"
                >
                  <option value="ECB">
                    ECB (Electronic Codebook)
                  </option>

                  <option value="CBC">
                    CBC (Cipher Block Chaining)
                  </option>

                  {cipher.id === "aes" && (
                    <>
                      <option value="CTR">
                        CTR (Counter)
                      </option>

                      <option value="CFB">
                        CFB (Cipher Feedback)
                      </option>

                      <option value="OFB">
                        OFB (Output Feedback)
                      </option>
                    </>
                  )}
                </select>
              </div>
            )}

            {cipher.id === "camellia" && (
              <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  PKCS#7 Padding
                </span>

                <input
                  type="checkbox"
                  checked={padding}
                  onChange={(e) =>
                    setPadding(
                      e.target.checked,
                    )
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
            )}

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={handleRun}
                disabled={loading}
                className="flex h-10 w-full items-center justify-center rounded-lg bg-teal-600 text-center text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.01] hover:bg-teal-500 hover:shadow-md focus:outline-none disabled:opacity-50 disabled:hover:scale-100 active:scale-[0.98] dark:bg-teal-500 dark:hover:bg-teal-400 sm:flex-1"
              >
                {loading
                  ? "Running in Web Worker..."
                  : "Run Computation"}
              </button>

              <label
                className={`flex h-10 cursor-pointer select-none items-center gap-3 rounded-lg border px-3.5 text-xs font-semibold transition-all duration-200 ${
                  autoCompute
                    ? "border-teal-500/30 bg-teal-50/10 text-teal-700 dark:border-teal-500/30 dark:bg-teal-950/20 dark:text-teal-400"
                    : "border-zinc-200 bg-zinc-50/30 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/10 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/30"
                }`}
              >
                <span className="tracking-wide">
                  Auto Compute
                </span>

                <input
                  type="checkbox"
                  checked={autoCompute}
                  onChange={(e) =>
                    setAutoCompute(
                      e.target.checked,
                    )
                  }
                  className="relative h-5 w-9 cursor-pointer appearance-none rounded-full border border-zinc-300 bg-zinc-200 transition-all duration-200 before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:shadow-sm before:transition-all before:duration-200 checked:border-teal-600 checked:bg-teal-600 checked:before:translate-x-4 dark:border-zinc-700 dark:bg-zinc-700 dark:before:bg-zinc-100 dark:checked:border-teal-500 dark:checked:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              </label>
            </div>
          </div>

          <WorkspacePresetManager
            cipherId={cipher.id}
            workspace={{
              cipherId: cipher.id,
              direction:
                cipher.id === "dh"
                  ? "encrypt"
                  : action,
              input,
              key,
              options:
                workspaceOptions,
              animationSpeed,
            }}
            onLoad={handlePresetLoad}
          />

          {diagnostic && (
            <CryptoDiagnosticBanner
              diagnostic={diagnostic}
              onRemediation={handleDiagnosticRemediation}
            />
          )}

          {(error || workerError) && !diagnostic && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-950/40 dark:bg-red-950/10">
              <div className="flex gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <h4 className="text-xs font-bold text-red-800 dark:text-red-300">
                    Execution Error
                  </h4>

                  <p className="text-xs text-red-700 dark:text-red-400">
                    {error ||
                      workerError?.message ||
                      workerError?.code ||
                      "Unknown error"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Output & Trace Column */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          <div className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800/80">
            <button
              onClick={() =>
                setActiveTab("result")
              }
              className={`flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-all duration-200 active:scale-95 ${
                activeTab === "result"
                  ? "bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Result
            </button>

            <button
              onClick={() =>
                setActiveTab("history")
              }
              className={`flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-all duration-200 active:scale-95 ${
                activeTab === "history"
                  ? "bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              History
            </button>
            {['aes', 'des', '3des', 'twofish', 'serpent', 'camellia', 'aria'].includes(cipher.id) && (
              <button
                onClick={() => setActiveTab("debugger")}
                className={`flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-all duration-200 active:scale-95 ${
                  activeTab === "debugger"
                    ? "bg-white text-zinc-950 shadow dark:bg-zinc-900 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Debugger
              </button>
            )}
          </div>

          {activeTab === "result" ? (
            <>
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {cipher.category === "hash"
                      ? "Generated Hash Digest"
                      : "Output Result"}
                  </span>

                  <DataProvenanceBadge
                    provenance={provenance}
                  />
                </div>

                <div className="mt-2 min-h-[48px] overflow-x-auto rounded-lg bg-zinc-50 p-3 font-mono text-sm leading-relaxed break-all text-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
                  {loading ? (
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      Computing...
                    </span>
                  ) : result ? (
                    result.output
                  ) : (
                    <span className="italic text-zinc-400">
                      No output yet
                    </span>
                  )}
                </div>
              </div>

              <TraceTransferControls
                cipherId={cipher.id}
                direction={
                  cipher.id === "dh"
                    ? "encrypt"
                    : action
                }
                input={input}
                cipherKey={key}
                options={traceOptions}
                result={result}
                onImport={
                  handleTraceImport
                }
              />

              {renderSpecificVisualizer()}

              {result &&
                result.steps &&
                result.steps.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-2xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Step-by-Step Mathematical Trace
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={
                            handleToggleStepBookmark
                          }
                          className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                            activeAnnotation?.bookmarked
                              ? "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-300"
                              : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
                          }`}
                        >
                          {activeAnnotation?.bookmarked
                            ? "Bookmarked ★"
                            : "Bookmark Step"}
                        </button>

                        {scopeAnnotations.length >
                          0 && (
                          <button
                            onClick={
                              handleClearStepAnnotations
                            }
                            className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
                          >
                            Clear Notes (
                            {
                              scopeAnnotations.length
                            }
                            )
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Step Note Editor */}
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            Step Note (Step{" "}
                            {currentStep + 1}:{" "}
                            {
                              activeStep?.label
                            }
                            )
                          </span>

                          {activeAnnotation?.note && (
                            <button
                              onClick={
                                handleDeleteStepNote
                              }
                              className="text-2xs text-red-500 hover:underline"
                            >
                              Delete Note
                            </button>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={
                              stepNoteInput !==
                              ""
                                ? stepNoteInput
                                : activeAnnotation?.note ||
                                  ""
                            }
                            onChange={(e) =>
                              setStepNoteInput(
                                e.target.value,
                              )
                            }
                            placeholder="Add a personal note to this step..."
                            className="flex-1 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />

                          <button
                            onClick={() => {
                              handleSaveStepNote(
                                stepNoteInput,
                              );
                              setStepNoteInput(
                                "",
                              );
                            }}
                            className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-500"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    </div>

                    <StepAnimator
                      steps={result.steps}
                      currentStep={
                        currentStep
                      }
                      onStepChange={
                        handleStepChange
                      }
                      speed={
                        animationSpeed
                      }
                      onSpeedChange={
                        setAnimationSpeed
                      }
                      onCopyStepLink={
                        handleCopyStepLink
                      }
                    />
                  </div>
                )}
            </>
          ) : activeTab === "history" ? (
            <ConversionHistory
              cipherId={cipher.id}
              history={history}
              onHistoryChange={
                setHistory
              }
            />
          ) : activeTab === "debugger" ? (
            <UniversalCipherDebugger
              cipherId={cipher.id}
              action={action}
              input={input}
              key={key}
              options={workspaceOptions}
            />
          ) : null}
        </div>
      </div>

      <WhereIsThisUsed
        cipherId={cipher.id}
      />
    </div>
  );
}