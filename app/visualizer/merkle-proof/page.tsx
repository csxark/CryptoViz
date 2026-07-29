import type { Metadata } from "next"
import MerkleProofDemo from "../../../components/hash/MerkleProofDemo"

export const metadata: Metadata = {
  title: "Merkle Proof Demonstration | CryptoViz",
  description: "Interactive Merkle proof demonstration showing leaves, tree levels, proof path, and root verification.",
}

export default function MerkleProofDemoPage() {
  return <MerkleProofDemo />
}
