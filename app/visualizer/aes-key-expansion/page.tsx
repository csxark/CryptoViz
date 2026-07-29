import type { Metadata } from "next";
import AesKeyExpansionVisualizer from "../../../components/symmetric/AesKeyExpansionVisualizer";

export const metadata: Metadata = {
  title: "AES Key Expansion Visualizer | CryptoViz",
  description:
    "Interactive AES-128 key expansion visualizer showing RotWord, SubWord, Rcon, XOR, words, and round keys.",
};

export default function AesKeyExpansionVisualizerPage() {
  return <AesKeyExpansionVisualizer />;
}
