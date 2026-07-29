import type { Metadata } from "next";
import TimingAttackVisualizer from "../../../components/attacks/TimingAttackVisualizer";

export const metadata: Metadata = {
  title: "Timing Attack Visualization | CryptoViz",
  description:
    "Interactive educational timing attack visualizer comparing early-exit string comparison with constant-time comparison.",
};

export default function TimingAttackVisualizerPage() {
  return <TimingAttackVisualizer />;
}
