"use client";

import Navbar from "@/components/layout/Navbar";
import SnapshotTestRunner from "@/components/tests/SnapshotTestRunner";

export default function SnapshotTestsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans transition-colors duration-300 dark:bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            Testing & Verification
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            Visualization Component Snapshot Tests
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400 max-w-3xl">
            Verify structural DOM stability, test visual regression snapshots, inspect line-by-line HTML diffs, and assert visual rendering consistency across CryptoViz components.
          </p>
        </header>

        <SnapshotTestRunner />
      </main>
    </div>
  );
}
