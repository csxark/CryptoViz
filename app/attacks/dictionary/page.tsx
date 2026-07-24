import type { Metadata } from "next";
import DictionaryAttackSimulator from "../../../components/attacks/DictionaryAttackSimulator";

export const metadata: Metadata = {
  title: "Dictionary Attack Simulator | CryptoViz",
  description:
    "Interactive educational simulator showing how dictionary attacks compare likely passwords against a target hash.",
};

export default function DictionaryAttackPage() {
  return <DictionaryAttackSimulator />;
}
