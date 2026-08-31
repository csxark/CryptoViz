import type { Metadata } from "next";
import HashCollisionFinder from "../../components/hash/HashCollisionFinder";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/footer";

export const metadata: Metadata = {
  title: "Hash Collision Finder — Birthday Attack Simulator | CryptoViz",
  description:
    "Find hash collisions using the birthday attack method. Interactive educational tool demonstrating why hash function collision resistance matters for security.",
};

export default function HashCollisionPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <HashCollisionFinder />
      </main>
      <Footer />
    </div>
  );
}
