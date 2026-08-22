"use client";

import { getVisualizerComponent } from "@/components/visualizers/visualizerComponentRegistry";
import type { CipherResult } from "../../lib/cipher/types";

interface CipherVisualizerHostProps {
  cipherId: string;
  result: CipherResult | null;
  currentStep: number;
  onStepChange: (step: number) => void;
}

export default function CipherVisualizerHost({ cipherId, result, currentStep, onStepChange }: CipherVisualizerHostProps) {
  if (!result?.steps?.length) return null;
  const activeStep = result.steps[currentStep];
  const Visualizer = getVisualizerComponent(cipherId);
  if (!activeStep || !Visualizer) return null;
  return <Visualizer cipherId={cipherId} currentStep={currentStep} result={result} activeStep={activeStep} onStepChange={onStepChange} />;
}
