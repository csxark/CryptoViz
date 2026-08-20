import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/footer";
import TestVectorManager from "@/components/TestVectorManager";
import { TestVectorHarness } from "@/components/dev/TestVectorHarness";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function TestVectorsPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-[#060816] dark:text-white">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"
        >
          <Link href="/" className="transition-colors hover:text-teal-500">
            Home
          </Link>

          <ArrowRight className="h-3.5 w-3.5" />

          <span className="font-semibold text-zinc-700 dark:text-zinc-200">
            Test Vectors
          </span>
        </nav>

        <section className="max-w-6xl mx-auto px-6 py-10 space-y-12">
          <h1 className="text-4xl font-bold mb-4">
            Import / Export Test Vectors
          </h1>

          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Import, view and export cryptographic test vectors in JSON format.
          </p>

          <TestVectorManager />
        </section>

        <hr className="border-slate-800 my-8" />

        <section>
          <TestVectorHarness />
        </section>
      </main>
      <Footer />
    </div>
  );
}
