import Pbkdf2Visualizer from "@/components/kdf/Pbkdf2Visualizer";

export const metadata = {
  title: "PBKDF2 Key Derivation Visualizer — CryptoViz",
  description:
    "Derive an AES-ready key from a password with PBKDF2, see each stage of the derivation explained, and check your iteration count against OWASP 2023 guidance.",
};

export default function Pbkdf2VisualizerPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-white">
        PBKDF2 Key Derivation Visualizer
      </h1>
      <p className="mb-6 max-w-2xl text-slate-600 dark:text-zinc-400">
        CryptoViz already uses PBKDF2 under the hood for password-based encryption, but the derivation itself never
        had its own page. This visualizer runs the same worker-routed <code>deriveKey()</code> used by password-based
        encryption, and walks through what salting, iteration count, and hash choice actually do to the output — and
        whether your settings meet current OWASP guidance.
      </p>
      <Pbkdf2Visualizer />
    </main>
  );
}
