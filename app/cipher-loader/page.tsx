"use client";

import Navbar from "@/components/layout/Navbar";
import DynamicCipherLoader from "@/components/cipher/DynamicCipherLoader";

export default function CipherLoaderPage() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans transition-colors duration-300 dark:bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            Runtime Extension Workspace
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            Dynamic Cipher Loader & Custom Sandbox
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400 max-w-3xl">
            Dynamically instantiate custom S-Box substitution block ciphers, Affine mathematical keys, and Feistel network rounds at runtime. Evaluate initialization telemetry and test live encryption.
          </p>
        </header>

        <DynamicCipherLoader />
      </main>
    </div>
  );
}
