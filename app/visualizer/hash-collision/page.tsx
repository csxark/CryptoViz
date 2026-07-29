import type { Metadata } from "next"
import HashCollisionPlayground from "../../../components/hash/HashCollisionPlayground"

export const metadata: Metadata = {
  title: "Hash Collision Playground | CryptoViz",
  description:
    "Interactive hash collision playground showing how truncated hash buckets can produce collisions.",
}

export default function HashCollisionPlaygroundPage() {
  return <HashCollisionPlayground />
}
