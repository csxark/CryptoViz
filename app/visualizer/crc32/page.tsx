import type { Metadata } from "next"
import Crc32Visualizer from "../../../components/hash/Crc32Visualizer"

export const metadata: Metadata = {
  title: "CRC32 Visualization | CryptoViz",
  description:
    "Interactive CRC32 visualization showing polynomial table generation, byte-by-byte processing, and final checksum.",
}

export default function Crc32VisualizerPage() {
  return <Crc32Visualizer />
}
