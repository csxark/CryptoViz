import Navbar from "@/components/layout/Navbar";
import { CipherIntegrationDashboard } from "@/components/tests/CipherIntegrationDashboard";

export default function IntegrationTestsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans transition-colors duration-300 dark:bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Cipher Integration Test Suite
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Automated verification dashboard testing round-trip integrity, error handling, and worker execution across every cipher.
          </p>
        </header>

        <CipherIntegrationDashboard />
      </main>
    </div>
  );
}
