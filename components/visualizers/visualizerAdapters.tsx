import { createElement } from "react";

import type { CipherStep } from "@/lib/cipher/types";
import type { VisualizerComponentProps } from "@/types/visualizer";

import type { ComponentType } from "react";

export function getActiveCipherStep(
  result: VisualizerComponentProps["result"],
  activeStep: number,
): CipherStep | null {
  if (result.steps.length === 0) {
    return null;
  }

  const safeIndex = Math.min(
    Math.max(activeStep, 0),
    result.steps.length - 1,
  );

  return result.steps[safeIndex] ?? null;
}

/** Explicit adapter for visualizers that consume the current step as a
 * numeric prop rather than the complete shared contract.
 */
export function createCurrentStepAdapter<
  TProps extends { currentStep: number },
>(
  Component: ComponentType<TProps>,
): React.ComponentType<VisualizerComponentProps> {
  return function CurrentStepVisualizerAdapter({
    activeStep,
  }: VisualizerComponentProps) {
    return createElement(Component, {
      currentStep: activeStep,
    } as TProps);
  };
}

/** Explicit adapter for visualizers that consume the cipher result and
 * numeric step index.*/
export function createResultStepAdapter<
  TProps extends {
    currentStep: number;
    result: VisualizerComponentProps["result"];
  },
>(
  Component: ComponentType<TProps>,
): React.ComponentType<VisualizerComponentProps> {
  return function ResultStepVisualizerAdapter({
    activeStep,
    result,
  }: VisualizerComponentProps) {
    return createElement(Component, {
      currentStep: activeStep,
      result,
    } as TProps);
  };
}

/* Explicit adapter for matrix-driven legacy visualizers. */
export function createMatrixVisualizerAdapter<
  TProps extends Record<string, unknown>,
>(
  Component: ComponentType<TProps>,
  propsFactory: (
    step: CipherStep,
  ) => TProps | null,
): React.ComponentType<VisualizerComponentProps> {
  return function MatrixVisualizerAdapter(props) {
    const step = getActiveCipherStep(
      props.result,
      props.activeStep,
    );

    if (!step) {
      return null;
    }

    const legacyProps = propsFactory(step);

    if (!legacyProps) {
      return null;
    }

    return createElement(Component, legacyProps);
  };
}

export function createStaticVisualizerAdapter(
  Component: ComponentType,
): React.ComponentType<VisualizerComponentProps> {
  return function StaticVisualizerAdapter(
    _props: VisualizerComponentProps,
  ) {
    return createElement(Component);
  };
}