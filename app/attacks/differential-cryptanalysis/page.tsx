import DifferentialCryptanalysisDemo from "../../../components/attacks/DifferentialCryptanalysisDemo"

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Differential Cryptanalysis Visualizer | CryptoViz",
  description: "Explore differential cryptanalysis by tracking output differences (ΔP → ΔC) across round pairs and analyzing S-box Difference Distribution Tables (DDT).",
}

export default function Page() {
  return <DifferentialCryptanalysisDemo />
}