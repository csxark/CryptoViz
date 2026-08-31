import dynamic from "next/dynamic";
import { createElement, type ComponentType } from "react";

import type { CipherResult, CipherStep } from "@/lib/cipher/types";
import type { VisualizerComponentProps } from "@/types/visualizer";

const PlayfairGrid = dynamic(
  () => import("@/components/cipher/PlayfairGrid"),
  { ssr: false },
);

const RailFenceViz = dynamic(
  () => import("@/components/cipher/RailFenceViz"),
  { ssr: false },
);

const DHVisualizer = dynamic(
  () => import("@/components/cipher/DHVisualizer"),
  { ssr: false },
);

const HmacVisualizer = dynamic(
  () => import("@/components/cipher/HmacVisualizer"),
  { ssr: false },
);

const Sm3Visualizer = dynamic(
  () => import("@/components/cipher/Sm3Visualizer"),
  { ssr: false },
);

const AesKeyExpansionVisualizer = dynamic(
  () => import("@/components/symmetric/AesKeyExpansionVisualizer"),
  { ssr: false },
);

const DesKeyScheduleVisualizer = dynamic(
  () => import("@/components/symmetric/DesKeyScheduleVisualizer"),
  { ssr: false },
);

const FrodoKemVisualizer = dynamic(
  () => import("@/components/cipher/FrodoKemVisualizer"),
  { ssr: false },
);

const Crc32Visualizer = dynamic(
  () => import("@/components/hash/Crc32Visualizer"),
  { ssr: false },
);

const SipHashVisualizer = dynamic(
  () => import("@/components/hash/SipHashVisualizer"),
  { ssr: false },
);

const Sha256CompressionVisualizer = dynamic(
  () => import("@/components/hash/Sha256CompressionVisualizer"),
  { ssr: false },
);

const IdeaCipherVisualizer = dynamic(
  () => import("@/components/symmetric/IdeaCipherVisualizer"),
  { ssr: false },
);

/**
 * Safely extracts a step by index bounded by step bounds[cite: 2].
 */
function getStep(
  result: CipherResult,
  activeStep: number,
): CipherStep | undefined {
  if (!result?.steps || result.steps.length === 0) return undefined;
  const index = Math.min(
    Math.max(activeStep, 0),
    result.steps.length - 1,
  );
  return result.steps[index];
}

/* ============================================================================
 * EXPLICIT ADAPTER HELPERS FOR LEGACY VISUALIZERS (#1334)
 * ============================================================================ */

function PlayfairVisualizerAdapter({
  result,
  activeStep,
}: VisualizerComponentProps) {
  const step = getStep(result, activeStep);
  if (!step?.matrix) return null;

  return createElement(PlayfairGrid, {
    matrix: step.matrix,
    highlights: step.highlight,
  });
}

function RailFenceVisualizerAdapter({
  result,
  activeStep,
}: VisualizerComponentProps) {
  const step = getStep(result, activeStep);
  if (!step?.matrix) return null;

  return createElement(RailFenceViz, {
    matrix: step.matrix,
    highlight: step.highlight,
  });
}

function DhVisualizerAdapter({
  activeStep,
}: VisualizerComponentProps) {
  return createElement(DHVisualizer, { currentStep: activeStep });
}

function HmacVisualizerAdapter({
  activeStep,
  result,
}: VisualizerComponentProps) {
  return createElement(HmacVisualizer, {
    currentStep: activeStep,
    result,
  });
}

function Sm3VisualizerAdapter({
  activeStep,
  result,
}: VisualizerComponentProps) {
  return createElement(Sm3Visualizer, {
    currentStep: activeStep,
    result,
  });
}

function AesKeyExpansionVisualizerAdapter(
  _props: VisualizerComponentProps,
) {
  return createElement(AesKeyExpansionVisualizer);
}

function DesKeyScheduleVisualizerAdapter(
  _props: VisualizerComponentProps,
) {
  return createElement(DesKeyScheduleVisualizer);
}

function FrodoKemVisualizerAdapter(
  _props: VisualizerComponentProps,
) {
  return createElement(FrodoKemVisualizer);
}

function Crc32VisualizerAdapter(
  _props: VisualizerComponentProps,
) {
  return createElement(Crc32Visualizer);
}

function SipHashVisualizerAdapter(
  _props: VisualizerComponentProps,
) {
  return createElement(SipHashVisualizer);
}

function Sha256CompressionVisualizerAdapter(
  _props: VisualizerComponentProps,
) {
  return createElement(Sha256CompressionVisualizer);
}

function IdeaCipherVisualizerAdapter(
  _props: VisualizerComponentProps,
) {
  return createElement(IdeaCipherVisualizer);
}

type RegisteredVisualizer = ComponentType<VisualizerComponentProps>;

/**
 * Strict central registry enforced by VisualizerComponentProps contract[cite: 2].
 */
const VISUALIZER_REGISTRY: Readonly<
  Record<string, RegisteredVisualizer>
> = {
  playfair: PlayfairVisualizerAdapter,
  railfence: RailFenceVisualizerAdapter,
  dh: DhVisualizerAdapter,
  hmac: HmacVisualizerAdapter,
  sm3: Sm3VisualizerAdapter,
  aes: AesKeyExpansionVisualizerAdapter,
  des: DesKeyScheduleVisualizerAdapter,
  frodokem: FrodoKemVisualizerAdapter,
  crc32: Crc32VisualizerAdapter,
  siphash: SipHashVisualizerAdapter,
  sha256: Sha256CompressionVisualizerAdapter,
  idea: IdeaCipherVisualizerAdapter,
};

export function getVisualizerComponent(
  cipherId: string,
): RegisteredVisualizer | null {
  return VISUALIZER_REGISTRY[cipherId] ?? null;
}

export function hasVisualizerComponent(
  cipherId: string,
): boolean {
  return cipherId in VISUALIZER_REGISTRY;
}

export function getRegisteredVisualizerIds(): string[] {
  return Object.keys(VISUALIZER_REGISTRY);
}