import React from "react";
import Navbar from "@/components/layout/Navbar";
import { WorkerCommunicationDashboard } from "@/components/workers/WorkerCommunicationDashboard";

export default function WorkerTestPage() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans transition-colors duration-300 dark:bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Worker Communication Diagnostics
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Interactive diagnostics tool for inspecting message passing, worker responsiveness, and postMessage latency.
          </p>
        </header>

        <WorkerCommunicationDashboard />
      </main>
    </div>
  );
}