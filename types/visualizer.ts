import type { CipherResult, CipherStep } from "@/lib/cipher/types";

export interface VisualizerComponentProps {
  cipherId: string;
  currentStep: number;
  result: CipherResult;
  activeStep: CipherStep;
  onStepChange?: (step: number) => void;
}

export type VisualizerComponent =
  React.ComponentType<VisualizerComponentProps>;
  
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
