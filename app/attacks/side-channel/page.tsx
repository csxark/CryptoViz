import type { Metadata } from "next"
import SideChannelPlayground from "../../../components/attacks/SideChannelPlayground"

export const metadata: Metadata = {
  title: "Side-Channel Attack Playground | CryptoViz",
  description:
    "Interactive side-channel attack playground with safe timing, cache, and power-style leakage simulations.",
}

export default function SideChannelPlaygroundPage() {
  return <SideChannelPlayground />
}
