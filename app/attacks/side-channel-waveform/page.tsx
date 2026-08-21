import type { Metadata } from "next"
import SideChannelWaveformLab from "@/components/attacks/SideChannelWaveformLab"

export const metadata: Metadata = {
  title: "Microarchitectural & Power Side-Channel Analyzer | CryptoViz",
  description:
    "Interactive educational simulations for RSA power analysis, AES differential power analysis, and cache Flush+Reload leakage.",
}

export default function SideChannelWaveformPage() {
  return <SideChannelWaveformLab />
}
