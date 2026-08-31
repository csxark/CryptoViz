"use client";

import { getVisualizerComponent } from "@/components/visualizers/visualizerComponentRegistry";
import type { CipherResult, CipherOptions } from "@/lib/cipher/types";

interface CipherVisualizerHostProps {
  cipherId: string;
  result: CipherResult | null;
  currentStep: number;
  input: string;
  cipherKey: string;
  options: CipherOptions;
  onStepChange: (step: number) => void;
}

export default function CipherVisualizerHost({
  cipherId,
  result,
  currentStep,
  input,
  cipherKey,
  options,
  onStepChange,
}: CipherVisualizerHostProps) {
  if (!result?.steps?.length) return null;

  const Visualizer = getVisualizerComponent(cipherId);
  if (!Visualizer) return null; // Safe fallback for unknown cipher IDs

  const activeStepData = result.steps[currentStep];

  return (
    <Visualizer
      cipherId={cipherId}
      result={result}
      activeStep={currentStep}
      input={input}
      key={cipherKey}
      options={options}
      activeStepData={activeStepData}
      onStepChange={onStepChange}
    />
  );
}