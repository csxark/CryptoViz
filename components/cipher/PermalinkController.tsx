"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { buildVisualizerPermalink, parseVisualizerPermalink, updateStepInCurrentUrl } from "../../lib/utils/visualizerPermalink";

interface PermalinkControllerProps {
  cipherId: string;
  input: string;
  key: string;
  action: "encrypt" | "decrypt";
  currentStep: number;
  options: Record<string, unknown>;
  onRestore: (state: ReturnType<typeof parseVisualizerPermalink>) => void;
}

export function usePermalinkController({ cipherId, input, key, action, currentStep, options, onRestore }: PermalinkControllerProps) {
  const router = useRouter();
  const pendingStepRef = useRef<number | null>(null);

  useEffect(() => {
    const shared = parseVisualizerPermalink(window.location.search);
    pendingStepRef.current = shared.step ?? null;
    onRestore(shared);
  }, [cipherId, onRestore]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      router.replace(buildVisualizerPermalink(window.location.href, {
        input,
        key,
        direction: cipherId === "dh" ? "encrypt" : action,
        step: currentStep,
        options,
      }), { scroll: false });
    }, 300);
    return () => window.clearTimeout(id);
  }, [input, key, action, currentStep, cipherId, options, router]);

  const setStep = (step: number) => {
    router.replace(updateStepInCurrentUrl(window.location.href, step), { scroll: false });
  };

  return { pendingStepRef, setStep };
}
