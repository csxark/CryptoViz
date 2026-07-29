import type { Metadata } from "next";
import Sha256CompressionVisualizer from "../../../components/hash/Sha256CompressionVisualizer";

export const metadata: Metadata = {
  title: "SHA-256 Compression Round Visualizer | CryptoViz",
  description:
    "Interactive SHA-256 compression round visualizer showing padding, message schedule, constants, working variables, and final digest.",
};

export default function Sha256CompressionVisualizerPage() {
  return <Sha256CompressionVisualizer />;
}
