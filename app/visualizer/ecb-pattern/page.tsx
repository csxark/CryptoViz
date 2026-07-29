import type { Metadata } from "next"
import EcbPatternLeakagePlayground from "../../../components/symmetric/EcbPatternLeakagePlayground"

export const metadata: Metadata = {
  title: "ECB Pattern Leakage Playground | CryptoViz",
  description:
    "Interactive ECB pattern leakage playground showing why repeated plaintext blocks produce repeated ciphertext blocks.",
}

export default function EcbPatternLeakagePlaygroundPage() {
  return <EcbPatternLeakagePlayground />
}
