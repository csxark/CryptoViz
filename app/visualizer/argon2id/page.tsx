import type { Metadata } from "next";
import Argon2idVisualizer from "../../../components/kdf/Argon2idVisualizer";

export const metadata: Metadata = {
  title: "Argon2id Visualizer | CryptoViz",
  description:
    "Interactive educational visualizer for Argon2id password hashing concepts.",
};

export default function Argon2idVisualizerPage() {
  return <Argon2idVisualizer />;
}
