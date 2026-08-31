"use client";

import { useState } from "react";
import { recoverySteps } from "@/lib/secretRecovery";

const participants = [
  { id: 1, name: "Alice", share: "S1" },
  { id: 2, name: "Bob", share: "S2" },
  { id: 3, name: "Charlie", share: "S3" },
  { id: 4, name: "David", share: "S4" },
  { id: 5, name: "Eve", share: "S5" },
];

const THRESHOLD = 3;

export default function SecretRecoveryVisualizer() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedShares, setSelectedShares] = useState<number[]>([]);

  const step = recoverySteps[currentStep];

  const progress =
    ((currentStep + 1) / recoverySteps.length) * 100;

  const toggleShare = (id: number) => {
    if (currentStep < 3) return;

    if (selectedShares.includes(id)) {
      setSelectedShares(selectedShares.filter((x) => x !== id));
    } else {
      setSelectedShares([...selectedShares, id]);
    }
  };

  const recovered = selectedShares.length >= THRESHOLD;

  return (
    <div className="rounded-xl border bg-white dark:bg-zinc-900 shadow-lg p-6">

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-2 text-sm">
          <span>
            Step {currentStep + 1} / {recoverySteps.length}
          </span>

          <span>{Math.round(progress)}%</span>
        </div>

        <div className="h-3 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="flex flex-wrap gap-2 mb-8">
        {recoverySteps.map((item, index) => (
          <button
            key={item.id}
            onClick={() => setCurrentStep(index)}
            className={`px-3 py-2 rounded-lg text-sm transition ${
              index === currentStep
                ? "bg-emerald-600 text-white"
                : index < currentStep
                ? "bg-green-600 text-white"
                : "bg-gray-200 dark:bg-zinc-800"
            }`}
          >
            {item.title}
          </button>
        ))}
      </div>

      {/* Current Step */}
      <div className="rounded-xl border p-5 bg-gray-50 dark:bg-zinc-800 mb-8">
        <h2 className="text-2xl font-bold mb-3">
          {step.title}
        </h2>

        <p className="text-gray-700 dark:text-gray-300">
          {step.description}
        </p>
      </div>

      {/* Secret Flow */}
      <div className="grid md:grid-cols-3 gap-6 items-center mb-8">

        <div className="rounded-lg border p-5 text-center">
          <div className="text-5xl mb-3">🔒</div>
          <div className="font-bold">Original Secret</div>
        </div>

        <div className="text-center text-4xl">
          ↓
        </div>

        <div className="rounded-lg border p-5 text-center">
          <div className="text-5xl mb-3">🧩</div>
          <div className="font-bold">
            Secret Shares
          </div>
        </div>

      </div>

      {/* Participant Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">

        {participants.map((user) => {

          const active = selectedShares.includes(user.id);

          return (
            <button
              key={user.id}
              onClick={() => toggleShare(user.id)}
              className={`rounded-xl border p-4 transition

              ${
                active
                  ? "bg-emerald-600 text-white"
                  : "bg-white dark:bg-zinc-900"
              }
              `}
            >
              <div className="text-3xl mb-2">
                👤
              </div>

              <div className="font-bold">
                {user.name}
              </div>

              <div className="text-sm mt-2">
                {user.share}
              </div>
            </button>
          );
        })}

      </div>

      {/* Threshold */}
      <div className="rounded-xl border p-5 mb-8">

        <h3 className="font-bold text-lg mb-3">
          Threshold Recovery
        </h3>

        <p>
          Shares Selected:
          <span className="font-bold ml-2">
            {selectedShares.length} / {THRESHOLD}
          </span>
        </p>

        <div className="mt-4 h-3 rounded-full bg-gray-200 overflow-hidden">

          <div
            className="h-full bg-blue-600 transition-all"
            style={{
              width: `${Math.min(
                selectedShares.length / THRESHOLD,
                1
              ) * 100}%`,
            }}
          />

        </div>

      </div>

      {/* Recovery */}
      <div className="rounded-xl border p-6 bg-gray-50 dark:bg-zinc-800">

        <h3 className="text-xl font-bold mb-3">
          Secret Reconstruction
        </h3>

        {recovered ? (
          <div className="text-green-600 font-bold text-lg">
            ✅ Secret Successfully Recovered!
          </div>
        ) : (
          <div className="text-orange-500">
            Select at least {THRESHOLD} shares to recover the secret.
          </div>
        )}

      </div>

      {/* Controls */}
      <div className="flex justify-between mt-8">

        <button
          disabled={currentStep === 0}
          onClick={() => setCurrentStep(currentStep - 1)}
          className="px-5 py-2 rounded-lg bg-gray-300 dark:bg-zinc-700 disabled:opacity-50"
        >
          ← Previous
        </button>

        <button
          disabled={currentStep === recoverySteps.length - 1}
          onClick={() => setCurrentStep(currentStep + 1)}
          className="px-5 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
        >
          Next →
        </button>

      </div>

      {/* Learning Note */}
      <div className="mt-8 rounded-xl border-l-4 border-emerald-600 bg-emerald-50 dark:bg-zinc-800 p-5">

        <h3 className="font-bold mb-2">
          📘 Learning Note
        </h3>

        <p className="text-sm leading-6">
          Shamir's Secret Sharing divides a secret into multiple
          shares so that only a predefined threshold of shares is
          required to reconstruct it. Fewer than the threshold
          reveal no information about the original secret, making it
          ideal for distributed key management, master root key escrow,
          and secure enterprise backup systems.
        </p>

      </div>

    </div>
  );
}