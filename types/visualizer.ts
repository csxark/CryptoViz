import type { CipherResult, CipherStep, CipherOptions } from "@/lib/cipher/types";

/**
 * Enforced Single Visualizer Component Props Contract (#1334)
 * 
 * @param result - The complete execution output containing all execution steps and metadata. Required for state inspection.
 * @param activeStep - The current step index being rendered in the step animator.
 * @param input - The original raw user string input.
 * @param key - The raw key string passed to the cipher.
 * @param options - Additional execution options (e.g., mode, rounds, hexInput, etc.).
 * @param cipherId - Identifier of the cipher currently active in the visualizer.
 * @param activeStepData - Optional step payload extracted from result.steps[activeStep] for convenient step rendering.
 * @param onStepChange - Callback handler to allow interactive step stepping from within custom visualizers.
 */
export interface VisualizerComponentProps {
  result: CipherResult;
  activeStep: number;
  input: string;
  key: string;
  options: CipherOptions;
  cipherId?: string;
  activeStepData?: CipherStep;
  onStepChange?: (step: number) => void;
}

export type VisualizerComponent = React.ComponentType<VisualizerComponentProps>;

export interface Algorithm {
  id: string;
  name: string;
  description: string;
  category: 'symmetric' | 'asymmetric' | 'hash';
}

export interface VisualizerStep {
  label: string;
  description: string;
  data: Record<string, unknown>;
}